# Pack browser extension to .zip
# Excludes: scripts, .git, git metadata, demo, dist
# Usage: .\scripts\pack.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'

if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.json not found: $manifestPath"
}

$manifestContent = Get-Content $manifestPath -Raw -Encoding UTF8
if ($manifestContent -notmatch '"version"\s*:\s*"([^"]+)"') {
    Write-Error "Cannot read version from manifest.json"
}
$version = $Matches[1]

$distDir = Join-Path $root 'dist'
$zipName = "lanhu-axure-extractor-ext-v$version.zip"
$zipPath = Join-Path $distDir $zipName
$stagingDir = Join-Path $distDir '_staging'

function Test-PackExcludedPath {
    param([string]$RelativePath)

    $normalized = ($RelativePath -replace '\\', '/').TrimStart('/')
    if ($normalized -match '^(?:\.git|demo|dist|scripts)(?:/|$)') { return $true }
    if ($normalized -eq '.gitignore' -or $normalized -eq '.gitattributes') { return $true }
    return $false
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

# robocopy exit codes 0-7 mean success
robocopy $root $stagingDir /E /XD .git demo dist scripts /XF .gitignore .gitattributes /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -gt 7) {
    Write-Error "robocopy failed with exit code $LASTEXITCODE"
}

Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $zipPath -Force
Remove-Item $stagingDir -Recurse -Force

$fileCount = (Get-ChildItem -Path $root -Recurse -File -Force |
    Where-Object {
        $relativePath = $_.FullName.Substring($root.Length + 1)
        -not (Test-PackExcludedPath $relativePath)
    }).Count

Write-Host "Done: $zipPath"
Write-Host "Files: $fileCount"
