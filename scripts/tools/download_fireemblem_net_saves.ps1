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

    $attempt.Remove('destination')
    if ($attempt.success) {
      $attempt['relativePath'] = Convert-ToRelativePath -BasePath $repoRoot -Path $destinationPath
    }
    $metadata.archiveAttempts += $attempt
  }

  if ($metadata.archiveAttempts.Count -eq 0) {
    throw 'No FE07/FE08/FE09 SAVE archives were found on the fireemblem.net index page.'
  }

  if ($metadata.archiveAttempts.Where({ -not $_.success }).Count -gt 0) {
    $failed = $metadata.archiveAttempts.Where({ -not $_.success }) | ForEach-Object { $_.archiveUrl }
    throw ('One or more fireemblem.net archive downloads failed: {0}' -f ($failed -join ', '))
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
