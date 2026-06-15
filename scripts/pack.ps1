# Pack browser extension to .zip (exclude .git and demo)
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

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

# robocopy exit codes 0-7 mean success
robocopy $root $stagingDir /E /XD .git demo dist /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -gt 7) {
    Write-Error "robocopy failed with exit code $LASTEXITCODE"
}

Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $zipPath -Force
Remove-Item $stagingDir -Recurse -Force

$fileCount = (Get-ChildItem -Path $root -Recurse -File -Force |
    Where-Object {
        $relativePath = $_.FullName.Substring($root.Length + 1) -replace '\\', '/'
        $relativePath -notmatch '^(?:\.git|demo|dist)(?:/|$)'
    }).Count

Write-Host "Done: $zipPath"
Write-Host "Files: $fileCount"
