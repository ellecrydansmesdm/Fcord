# Clone Equicord
Write-Host "Cloning Equicord..."
if (Test-Path "equicord-temp") { Remove-Item "equicord-temp" -Recurse -Force }
& git clone --depth 1 https://github.com/Equicord/Equicord.git equicord-temp

# Copy dependencies
$deps = @("fixFileExtensions", "alwaysExpandProfiles", "blockKeywords")
foreach ($d in $deps) {
  $src = "c:\Users\f\Desktop\fcord\equicord-temp\src\plugins\$d"
  $dest = "c:\Users\f\Desktop\fcord\src\plugins\$d"
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $dest -Recurse -Force
    Write-Host "Copied dependency: $d"
  } else {
    Write-Host "Dependency NOT found in Equicord: $d"
  }
}

# Cleanup
Remove-Item "equicord-temp" -Recurse -Force
Write-Host "Cleanup done."
