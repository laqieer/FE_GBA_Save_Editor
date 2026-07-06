[CmdletBinding()]
param(
  [string]$OutputRoot = '',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $PSScriptRoot '..\..\test-saves\fireemblem-net'
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
    cached = $false
  }

  try {
    Invoke-WebRequest -Uri $Uri -Headers $Headers -OutFile $DestinationPath
    $result.success = $true
    $result.statusCode = 200
  } catch {
    $result.statusCode = Get-HttpStatusCode $_
    $result.error = $_.Exception.Message
    if (Test-Path $DestinationPath) {
      Remove-Item -LiteralPath $DestinationPath -Force
    }
    if (-not $Optional) {
      throw
    }
  }

  return $result
}

function Get-TitleCode {
  param([string]$ArchiveName)

  $match = [regex]::Match($ArchiveName, '^(FE0[789])', 'IgnoreCase')
  if (-not $match.Success) {
    return $null
  }

  return $match.Groups[1].Value.ToUpperInvariant()
}

function Get-MappedGameCode {
  param([string]$TitleCode)

  switch ($TitleCode) {
    'FE07' { return 'FE6' }
    'FE08' { return 'FE7' }
    'FE09' { return 'FE8' }
    default { return $null }
  }
}

function Get-ArchiveFormat {
  param([string]$ArchivePath)

  return [System.IO.Path]::GetExtension($ArchivePath).TrimStart('.').ToLowerInvariant()
}

function Get-GeneratedFixtureFileName {
  param(
    [string]$MappedGameCode,
    [string]$ArchiveFileName,
    [int]$Index,
    [int]$TotalCount
  )

  $gameCode = if ([string]::IsNullOrWhiteSpace($MappedGameCode)) { 'unknown' } else { $MappedGameCode.ToLowerInvariant() }
  $archiveStem = [System.IO.Path]::GetFileNameWithoutExtension($ArchiveFileName).ToLowerInvariant()
  $suffix = if ($TotalCount -gt 1) { '-{0}' -f $Index } else { '' }

  return ('fireemblem-net-{0}-{1}{2}.sav' -f $gameCode, $archiveStem, $suffix)
}

function Get-ArchiveExtractionPlan {
  param([string]$ArchivePath)

  $format = Get-ArchiveFormat -ArchivePath $ArchivePath
  $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
  $tarCommand = Get-Command tar -ErrorAction SilentlyContinue
  $expandArchive = Get-Command Expand-Archive -ErrorAction SilentlyContinue

  switch ($format) {
    'zip' {
      if ($expandArchive) {
        return [ordered]@{ format = $format; extractor = 'Expand-Archive'; commandPath = $null; available = $true; error = $null }
      }
      if ($tarCommand) {
        return [ordered]@{ format = $format; extractor = 'tar'; commandPath = $tarCommand.Source; available = $true; error = $null }
      }

      return [ordered]@{ format = $format; extractor = $null; commandPath = $null; available = $false; error = 'ZIP extraction requires Expand-Archive or tar, but neither is available.' }
    }
    'rar' {
      if ($sevenZip) {
        return [ordered]@{ format = $format; extractor = '7z'; commandPath = $sevenZip.Source; available = $true; error = $null }
      }
      if ($tarCommand) {
        return [ordered]@{ format = $format; extractor = 'tar'; commandPath = $tarCommand.Source; available = $true; error = $null }
      }

      return [ordered]@{ format = $format; extractor = $null; commandPath = $null; available = $false; error = 'RAR extraction requires 7z or tar, but neither is available.' }
    }
    default {
      if ($tarCommand) {
        return [ordered]@{ format = $format; extractor = 'tar'; commandPath = $tarCommand.Source; available = $true; error = $null }
      }

      return [ordered]@{ format = $format; extractor = $null; commandPath = $null; available = $false; error = ('Unsupported archive format .{0} without tar available.' -f $format) }
    }
  }
}

function Invoke-ArchiveExtraction {
  param(
    [string]$ArchivePath,
    [string]$DestinationPath,
    [string]$ArchiveFileName,
    [string]$MappedGameCode,
    [string]$FixtureRoot,
    [string]$RepoRoot
  )

  $plan = Get-ArchiveExtractionPlan -ArchivePath $ArchivePath
  $extraction = [ordered]@{
    archiveFormat = $plan.format
    extractor = $plan.extractor
    success = $false
    archiveEntries = @()
    fixtureFiles = @()
    error = $null
  }

  if (-not $plan.available) {
    $extraction.error = $plan.error
    return $extraction
  }

  try {
    switch ($plan.extractor) {
      'Expand-Archive' {
        Expand-Archive -Path $ArchivePath -DestinationPath $DestinationPath -Force -ErrorAction Stop
      }
      '7z' {
        & $plan.commandPath x -y ("-o{0}" -f $DestinationPath) $ArchivePath | Out-Null
        if ($LASTEXITCODE -ne 0) {
          throw ('7z extraction failed with exit code {0}.' -f $LASTEXITCODE)
        }
      }
      'tar' {
        & $plan.commandPath -xf $ArchivePath -C $DestinationPath
        if ($LASTEXITCODE -ne 0) {
          throw ('tar extraction failed with exit code {0}.' -f $LASTEXITCODE)
        }
      }
      default {
        throw ('Unsupported extractor "{0}".' -f $plan.extractor)
      }
    }

    $extractedFiles = @(Get-ChildItem -Path $DestinationPath -Recurse -File -ErrorAction Stop)
    if ($extractedFiles.Count -eq 0) {
      throw 'Archive extraction produced no files.'
    }

    $extraction.archiveEntries = @(
      $extractedFiles | ForEach-Object { Convert-ToRelativePath -BasePath $DestinationPath -Path $_.FullName }
    )

    $savFiles = @($extractedFiles | Where-Object { $_.Extension -imatch '^\.sav$' })
    for ($i = 0; $i -lt $savFiles.Count; $i += 1) {
      $sav = $savFiles[$i]
      $fixtureName = Get-GeneratedFixtureFileName -MappedGameCode $MappedGameCode -ArchiveFileName $ArchiveFileName -Index ($i + 1) -TotalCount $savFiles.Count
      $fixturePath = Join-Path $FixtureRoot $fixtureName
      Copy-Item -LiteralPath $sav.FullName -Destination $fixturePath -Force
      $extraction.fixtureFiles += (Convert-ToRelativePath -BasePath $RepoRoot -Path $fixturePath)
    }

    $extraction.success = $true
  } catch {
    $extraction.error = $_.Exception.Message
  }

  return $extraction
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\'))
$fixtureRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$sourcesDir = Join-Path $fixtureRoot 'sources'
$archivesDir = Join-Path $sourcesDir 'archives'
$indexPath = Join-Path $sourcesDir 'index.html'
$metadataPath = Join-Path $sourcesDir 'download-metadata.json'
$sourceUrl = 'http://www.fireemblem.net/fe/download/index.htm'

New-Item -ItemType Directory -Force -Path $fixtureRoot | Out-Null
New-Item -ItemType Directory -Force -Path $sourcesDir | Out-Null
New-Item -ItemType Directory -Force -Path $archivesDir | Out-Null
Get-ChildItem -Path $fixtureRoot -File -Filter 'fireemblem-net-*.sav' -ErrorAction SilentlyContinue | Remove-Item -Force

$headers = @{
  'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  'Accept' = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  'Accept-Language' = 'en-US,en;q=0.9'
}

$metadata = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  sourceUrl = $sourceUrl
  outputRoot = $fixtureRoot
  indexAttempt = $null
  archiveAttempts = @()
}

try {
  $indexAttempt = [ordered]@{
    uri = $sourceUrl
    destination = $indexPath
    success = $false
    statusCode = $null
    error = $null
    cached = $false
  }

  if ($Force -or -not (Test-Path $indexPath)) {
    $indexAttempt = Invoke-TrackedDownload -Uri $sourceUrl -DestinationPath $indexPath -Headers $headers
  } else {
    $indexAttempt.success = $true
    $indexAttempt.statusCode = 200
    $indexAttempt.cached = $true
  }

  $indexAttempt.Remove('destination')
  $indexAttempt['relativePath'] = Convert-ToRelativePath -BasePath $repoRoot -Path $indexPath
  $metadata.indexAttempt = $indexAttempt

  if (-not $indexAttempt.success) {
    throw ('Failed to download fireemblem.net index page from {0}' -f $sourceUrl)
  }

  $html = Get-Content -LiteralPath $indexPath -Raw
  $archiveMatches = [regex]::Matches($html, 'SAVE/(FE0[789][^"''\s>]+?\.(?:rar|zip))', 'IgnoreCase')
  $archiveHrefs = @($archiveMatches | ForEach-Object { $_.Value } | Select-Object -Unique)

  foreach ($href in $archiveHrefs) {
    $resolvedUri = [System.Uri]::new([System.Uri]$sourceUrl, $href)
    $archiveName = Split-Path -Path $resolvedUri.AbsolutePath -Leaf
    $titleCode = Get-TitleCode -ArchiveName $archiveName
    $mappedGameCode = Get-MappedGameCode -TitleCode $titleCode
    $destinationPath = Join-Path $archivesDir $archiveName
    $attempt = [ordered]@{
      titleCode = $titleCode
      mappedGameCode = $mappedGameCode
      archiveUrl = $resolvedUri.AbsoluteUri
      archiveFileName = $archiveName
      destination = $destinationPath
      success = $false
      statusCode = $null
      error = $null
      cached = $false
    }

    if (-not $Force -and (Test-Path $destinationPath)) {
      $attempt.success = $true
      $attempt.statusCode = 200
      $attempt.cached = $true
    } else {
      $downloadAttempt = Invoke-TrackedDownload -Uri $resolvedUri.AbsoluteUri -DestinationPath $destinationPath -Headers $headers -Optional
      $attempt.success = $downloadAttempt.success
      $attempt.statusCode = $downloadAttempt.statusCode
      $attempt.error = $downloadAttempt.error
    }

    $extraction = [ordered]@{
      archiveFormat = Get-ArchiveFormat -ArchivePath $destinationPath
      extractor = $null
      success = $false
      archiveEntries = @()
      fixtureFiles = @()
      error = 'download failed'
    }

    if ($attempt.success) {
      $tempExtract = Join-Path $archivesDir ($archiveName + '.extract')
      if (Test-Path $tempExtract) { Remove-Item -LiteralPath $tempExtract -Recurse -Force }
      New-Item -ItemType Directory -Force -Path $tempExtract | Out-Null

      try {
        $extraction = Invoke-ArchiveExtraction -ArchivePath $destinationPath -DestinationPath $tempExtract -ArchiveFileName $archiveName -MappedGameCode $mappedGameCode -FixtureRoot $fixtureRoot -RepoRoot $repoRoot
      } finally {
        if (Test-Path $tempExtract) { Remove-Item -LiteralPath $tempExtract -Recurse -Force -ErrorAction SilentlyContinue }
      }
    }

    $attempt.Remove('destination')
    if ($attempt.success) {
      $attempt['relativePath'] = Convert-ToRelativePath -BasePath $repoRoot -Path $destinationPath
    }

    # Attach extraction result metadata to the archive attempt
    $attempt['extraction'] = $extraction

    $metadata.archiveAttempts += $attempt
  }

  if ($metadata.archiveAttempts.Count -eq 0) {
    throw 'No FE07/FE08/FE09 SAVE archives were found on the fireemblem.net index page.'
  }

  if ($metadata.archiveAttempts.Where({ -not $_.success }).Count -gt 0) {
    $failed = $metadata.archiveAttempts.Where({ -not $_.success }) | ForEach-Object { $_.archiveUrl }
    throw ('One or more fireemblem.net archive downloads failed: {0}' -f ($failed -join ', '))
  }

  $failedExtractions = @($metadata.archiveAttempts | Where-Object { $_.success -and $null -ne $_.extraction -and -not $_.extraction.success })
  if ($failedExtractions.Count -gt 0) {
    $failed = $failedExtractions | ForEach-Object { '{0}: {1}' -f $_.archiveFileName, $_.extraction.error }
    throw ('One or more fireemblem.net archive extractions failed: {0}' -f ($failed -join '; '))
  }

  $fixtureFiles = @(
    $metadata.archiveAttempts |
      ForEach-Object {
        if ($null -ne $_.extraction -and $null -ne $_.extraction.fixtureFiles) {
          $_.extraction.fixtureFiles
        }
      }
  )
  if ($fixtureFiles.Count -eq 0) {
    throw 'No .sav fixtures were extracted from the fireemblem.net archives.'
  }
} finally {
  $metadataJson = $metadata | ConvertTo-Json -Depth 8
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  $writer = [System.IO.StreamWriter]::new($metadataPath, $false, $utf8NoBom)
  try {
    $writer.Write($metadataJson)
  } finally {
    $writer.Dispose()
  }
  Write-Host ('Wrote metadata to {0}' -f (Convert-ToRelativePath -BasePath $repoRoot -Path $metadataPath))
}
