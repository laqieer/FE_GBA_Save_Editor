[CmdletBinding()]
param(
  [string]$OutputRoot = '',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $PSScriptRoot '..\..\test-saves\gamefaqs'
}

function Get-HttpStatusCode {
  param([object]$ErrorRecordOrException)

  $exception = $ErrorRecordOrException
  if ($ErrorRecordOrException -is [System.Management.Automation.ErrorRecord]) {
    $exception = $ErrorRecordOrException.Exception
  }

  if ($exception.PSObject.Properties.Name -contains 'Response' -and $null -ne $exception.Response) {
    try {
      return [int]$exception.Response.StatusCode
    } catch {
      return $null
    }
  }

  if ($exception.Exception -and $exception.Exception.PSObject.Properties.Name -contains 'Response' -and $null -ne $exception.Exception.Response) {
    try {
      return [int]$exception.Exception.Response.StatusCode
    } catch {
      return $null
    }
  }

  return $null
}

function Convert-ToRelativePath {
  param(
    [string]$BasePath,
    [string]$Path
  )

  $baseUri = [System.Uri]([System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\')
  $pathUri = [System.Uri]([System.IO.Path]::GetFullPath($Path))
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '\')
}

function Invoke-TrackedDownload {
  param(
    [string]$Uri,
    [string]$DestinationPath,
    [hashtable]$Headers,
    [switch]$Optional
  )

  $result = [ordered]@{
    uri = $Uri
    destination = $DestinationPath
    success = $false
    statusCode = $null
    error = $null
  }

  try {
    Invoke-WebRequest -Uri $Uri -Headers $Headers -OutFile $DestinationPath
    $result.success = $true
    $result.statusCode = 200
  } catch {
    $result.statusCode = Get-HttpStatusCode $_
    $result.error = $_.Exception.Message
    if (Test-Path $DestinationPath) {
      Remove-Item $DestinationPath -Force
    }
    if (-not $Optional) {
      throw
    }
  }

  return $result
}

function Get-DescriptionEntry {
  param(
    [string]$Text,
    [string]$ArchiveId
  )

  foreach ($block in ([regex]::Split($Text.Trim(), '\r?\n\r?\n'))) {
    if ($block -eq $ArchiveId -or $block.StartsWith("$ArchiveId`r") -or $block.StartsWith("$ArchiveId`n")) {
      return $block.Trim()
    }
  }
  return $null
}

function Get-ArchiveIdsFromDescription {
  param([string]$Text)

  $ids = [System.Collections.Generic.List[string]]::new()
  foreach ($block in ([regex]::Split($Text.Trim(), '\r?\n\r?\n'))) {
    $line = ($block -split '\r?\n' | Select-Object -First 1).Trim()
    if ($line -match '^\d+$') {
      $ids.Add($line)
    }
  }
  return $ids
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\'))
$fixtureRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$sourcesDir = Join-Path $fixtureRoot 'sources'

New-Item -ItemType Directory -Force -Path $fixtureRoot | Out-Null
New-Item -ItemType Directory -Force -Path $sourcesDir | Out-Null

$headers = @{
  'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  'Accept' = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  'Accept-Language' = 'en-US,en;q=0.9'
}

$sources = @(
  @{
    key = 'fe6'
    game = 'Fire Emblem: Fuuin no Tsurugi'
    pageUrl = 'https://gamefaqs.gamespot.com/gba/563015-fire-emblem-fuuin-no-tsurugi/saves'
    descriptionUrl = 'https://ia801604.us.archive.org/view_archive.php?archive=/9/items/gamefaqs_savegames/gba_savegames.zip&file=Fire%20Emblem_%20Fuuin%20no%20Tsurugi%2Fgameboy-advance-gameshark-save-japan%2Fdescription.txt'
    descriptionFile = 'fe6-archive-description.txt'
    archivePath = 'Fire%20Emblem_%20Fuuin%20no%20Tsurugi%2Fgameboy-advance-gameshark-save-japan'
  },
  @{
    key = 'fe7'
    game = 'Fire Emblem'
    pageUrl = 'https://gamefaqs.gamespot.com/gba/468480-fire-emblem/saves'
    descriptionUrl = 'https://ia801604.us.archive.org/view_archive.php?archive=/9/items/gamefaqs_savegames/gba_savegames.zip&file=Fire%20Emblem%2Fgameboy-advance-gameshark-save-north-america%2Fdescription.txt'
    descriptionFile = 'fe7-archive-description.txt'
    archivePath = 'Fire%20Emblem%2Fgameboy-advance-gameshark-save-north-america'
  },
  @{
    key = 'fe8'
    game = 'Fire Emblem: The Sacred Stones'
    pageUrl = 'https://gamefaqs.gamespot.com/gba/921183-fire-emblem-the-sacred-stones/saves'
    descriptionUrl = 'https://ia801604.us.archive.org/view_archive.php?archive=/9/items/gamefaqs_savegames/gba_savegames.zip&file=Fire%20Emblem_%20Seima%20no%20Kouseki%2Fgameboy-advance-gameshark-save-north-america%2Fdescription.txt'
    descriptionFile = 'fe8-archive-description.txt'
    archivePath = 'Fire%20Emblem_%20Seima%20no%20Kouseki%2Fgameboy-advance-gameshark-save-north-america'
  }
)

$metadata = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  repoRoot = $repoRoot
  outputRoot = $fixtureRoot
  gameFaqsPageAttempts = @()
  gameFaqsFileAttempts = @()
  archiveFallbackAttempts = @()
  fallbackFixtures = @()
}

$metadataPath = Join-Path $sourcesDir 'download-metadata.json'

try {
  foreach ($source in $sources) {
    $pageEvidencePath = Join-Path $sourcesDir ('{0}-gamefaqs-page.html' -f $source.key)
    $pageAttempt = Invoke-TrackedDownload -Uri $source.pageUrl -DestinationPath $pageEvidencePath -Headers $headers -Optional
    if (-not $pageAttempt.success) {
      $pageAttempt.Remove('destination')
      $pageAttempt['evidenceFile'] = $null
    } else {
      $pageAttempt.Remove('destination')
      $pageAttempt['evidenceFile'] = Convert-ToRelativePath -BasePath $repoRoot -Path $pageEvidencePath
    }
    $pageAttempt['key'] = $source.key
    $pageAttempt['game'] = $source.game
    $pageAttempt['blocked'] = (-not $pageAttempt.success)
    $metadata.gameFaqsPageAttempts += $pageAttempt

    $descriptionPath = Join-Path $sourcesDir $source.descriptionFile
    if ($Force -or -not (Test-Path $descriptionPath)) {
      $descriptionAttempt = Invoke-TrackedDownload -Uri $source.descriptionUrl -DestinationPath $descriptionPath -Headers $headers -Optional
      $descriptionAttempt.Remove('destination')
      $descriptionAttempt['key'] = $source.key
      $descriptionAttempt['game'] = $source.game
      $descriptionAttempt['artifactType'] = 'description'
      $descriptionAttempt['fileName'] = $source.descriptionFile
      $metadata.archiveFallbackAttempts += $descriptionAttempt
      if (-not $descriptionAttempt.success) {
        throw ('Archive description download failed for {0}' -f $source.key)
      }
    }
    $descriptionText = Get-Content -LiteralPath $descriptionPath -Raw
    $archiveIds = Get-ArchiveIdsFromDescription -Text $descriptionText

    foreach ($archiveId in $archiveIds) {
      $fixture = @{
        archiveId = $archiveId
        gameFaqsDownloadUrl = ('https://gamefaqs.gamespot.com/a/saves/{0}' -f $archiveId)
        fileUrl = ('https://archive.org/download/gamefaqs_savegames/gba_savegames.zip/{0}%2F{1}.sps' -f $source.archivePath, $archiveId)
        fileName = ('{0}-{1}.sps' -f $source.key, $archiveId)
      }
      $destinationPath = Join-Path $fixtureRoot $fixture.fileName
      $directDownloadPath = Join-Path $sourcesDir ('{0}.gamefaqs.tmp' -f $fixture.fileName)
      $directAttempt = Invoke-TrackedDownload -Uri $fixture.gameFaqsDownloadUrl -DestinationPath $directDownloadPath -Headers $headers -Optional
      $directAttempt.Remove('destination')
      $directAttempt['key'] = $source.key
      $directAttempt['game'] = $source.game
      $directAttempt['archiveId'] = $fixture.archiveId
      $directAttempt['fileName'] = $fixture.fileName
      $metadata.gameFaqsFileAttempts += $directAttempt

      if ($directAttempt.success) {
        Move-Item -LiteralPath $directDownloadPath -Destination $destinationPath -Force
        $metadata.fallbackFixtures += [ordered]@{
          key = $source.key
          game = $source.game
          archiveId = $fixture.archiveId
          fileName = $fixture.fileName
          relativePath = Convert-ToRelativePath -BasePath $repoRoot -Path $destinationPath
          sourceUrl = $fixture.gameFaqsDownloadUrl
          sourceType = 'gamefaqs'
          descriptionSource = $null
          descriptionEntry = $null
        }
        continue
      }

      if ($Force -or -not (Test-Path $destinationPath)) {
        $archiveDownloadPath = Join-Path $sourcesDir ('{0}.archive.tmp' -f $fixture.fileName)
        $archiveAttempt = Invoke-TrackedDownload -Uri $fixture.fileUrl -DestinationPath $archiveDownloadPath -Headers $headers -Optional
        $archiveAttempt.Remove('destination')
        $archiveAttempt['key'] = $source.key
        $archiveAttempt['game'] = $source.game
        $archiveAttempt['archiveId'] = $fixture.archiveId
        $archiveAttempt['artifactType'] = 'fixture'
        $archiveAttempt['fileName'] = $fixture.fileName
        $metadata.archiveFallbackAttempts += $archiveAttempt
        if (-not $archiveAttempt.success) {
          throw ('Archive fixture download failed for {0}' -f $fixture.fileName)
        }
        Move-Item -LiteralPath $archiveDownloadPath -Destination $destinationPath -Force
      }

      $metadata.fallbackFixtures += [ordered]@{
        key = $source.key
        game = $source.game
        archiveId = $fixture.archiveId
        fileName = $fixture.fileName
        relativePath = Convert-ToRelativePath -BasePath $repoRoot -Path $destinationPath
        sourceUrl = $fixture.fileUrl
        sourceType = 'archive-fallback'
        descriptionSource = Convert-ToRelativePath -BasePath $repoRoot -Path $descriptionPath
        descriptionEntry = Get-DescriptionEntry -Text $descriptionText -ArchiveId $fixture.archiveId
      }
    }
  }
} finally {
  $metadata | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $metadataPath -Encoding utf8

  Write-Host ('Wrote metadata to {0}' -f (Convert-ToRelativePath -BasePath $repoRoot -Path $metadataPath))
  foreach ($fixture in $metadata.fallbackFixtures) {
    Write-Host ('Downloaded {0}' -f $fixture.relativePath)
  }
}
