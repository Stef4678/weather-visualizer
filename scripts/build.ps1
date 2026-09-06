# build.ps1 — packages the plugin folder into release\SkylineWeather-<version>.eagleplugin
# (an .eagleplugin file is just a zip whose root contains manifest.json)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$ver = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version

$stage = Join-Path $env:TEMP ('skyline-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null | Out-Null
Copy-Item (Join-Path $root 'manifest.json') -Destination $stage
Copy-Item (Join-Path $root 'logo.png') -Destination $stage
Copy-Item (Join-Path $root 'index.html') -Destination $stage
Copy-Item (Join-Path $root 'README.md') -Destination $stage
Copy-Item (Join-Path $root 'css') -Destination $stage -Recurse
Copy-Item (Join-Path $root 'js') -Destination $stage -Recurse

$relDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force -Path $relDir | Out-Null
$zipPath = Join-Path $relDir ("SkylineWeather-" + $ver + ".eagleplugin")
if (Test-Path $zipPath) { Remove-Item $zipPath }

$items = Get-ChildItem -Path $stage -Force | Select-Object -ExpandProperty FullName
$tmpZip = Join-Path $relDir ("SkylineWeather-" + $ver + ".zip")
if (Test-Path $tmpZip) { Remove-Item $tmpZip }
Compress-Archive -Path $items -DestinationPath $tmpZip -CompressionLevel Optimal
Remove-Item -Recurse -Force $stage
if (Test-Path $zipPath) { Remove-Item $zipPath }
Move-Item $tmpZip $zipPath
Write-Host "Built: $zipPath"
