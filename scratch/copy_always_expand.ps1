# Clone Equicord
Write-Host "Cloning Equicord..."
if (Test-Path "equicord-temp") { Remove-Item "equicord-temp" -Recurse -Force }
& git clone --depth 1 https://github.com/Equicord/Equicord.git equicord-temp

# Copy alwaysExpandProfiles
$src = "c:\Users\f\Desktop\fcord\equicord-temp\src\equicordplugins\alwaysExpandProfiles"
$dest = "c:\Users\f\Desktop\fcord\src\fcordplugins\alwaysExpandProfiles"
if (Test-Path $src) {
  Copy-Item -Path $src -Destination $dest -Recurse -Force
  Write-Host "Copied alwaysExpandProfiles to src/fcordplugins/"
} else {
  Write-Host "alwaysExpandProfiles NOT found in equicord-temp"
}

# Cleanup
Remove-Item "equicord-temp" -Recurse -Force
Write-Host "Cleanup done."
