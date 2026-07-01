$plugins = @(
  "accountPanelServerProfile",
  "alwaysExpandRoles",
  "anonymiseFileNames",
  "appleMusic.desktop",
  "autoDndWhilePlaying.discordDesktop",
  "clientTheme",
  "devCompanion.dev",
  "fakeNitro",
  "fakeProfileThemes",
  "fixSpotifyEmbeds.desktop",
  "fixYoutubeEmbeds.desktop",
  "noBlockedMessages"
)

foreach ($p in $plugins) {
  $srcPath = "c:\Users\f\Desktop\fcord\equicord-temp\src\plugins\$p"
  $destPath = "c:\Users\f\Desktop\fcord\src\plugins\$p"
  if (Test-Path $srcPath) {
    Copy-Item -Path $srcPath -Destination $destPath -Recurse -Force
    Write-Host "Copied $p"
  } else {
    Write-Host "Not found: $p"
  }
}
