<#
.SYNOPSIS
Install dsh-theme-triptych into a dsh deployment profile.

.DESCRIPTION
1. pnpm add (or npm install) the package inside the profile dir
   ($DSH_HOME/profiles/<profile>).
2. Append the loader insert to cordis.patch.yml (or replace a bare `[]`).
3. Print restart + verification instructions.

.PARAMETER Profile
Profile directory name under $DSH_HOME/profiles. Defaults to $env:DSH_PROFILE or "web".

.PARAMETER Source
Package source: npm name (default "dsh-theme-triptych"), git URL, or local path.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File install.ps1
powershell -ExecutionPolicy Bypass -File install.ps1 -Profile web
#>
param(
  [string]$Profile = "",
  [string]$Source = "dsh-theme-triptych"
)
$ErrorActionPreference = "Stop"

if (-not $env:DSH_HOME) { $env:DSH_HOME = Join-Path $HOME ".dsh" }
if (-not $Profile) { $Profile = if ($env:DSH_PROFILE) { $env:DSH_PROFILE } else { "web" } }
$profileDir = Join-Path $env:DSH_HOME (Join-Path "profiles" $Profile)
if (-not (Test-Path (Join-Path $profileDir "package.json"))) {
  throw "Profile directory not found: $profileDir (pass -Profile <name> or set DSH_PROFILE)"
}

Write-Host "==> installing '$Source' into profile '$Profile' ($profileDir)"
Push-Location $profileDir
try {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm add $Source }
  elseif (Get-Command npm -ErrorAction SilentlyContinue) { npm install $Source }
  else { throw "Neither pnpm nor npm found on PATH" }
}
finally {
  Pop-Location
}

$patchFile = Join-Path $profileDir "cordis.patch.yml"
if (-not (Test-Path $patchFile)) {
  Set-Content -Path $patchFile -Value "[]" -Encoding utf8 -NoNewline
}
$content = Get-Content $patchFile -Raw
$trimmed = $content.Trim()
if ($trimmed -match "name: dsh-theme-triptych") {
  Write-Host "==> cordis.patch.yml already contains dsh-theme-triptych — nothing to patch"
}
elseif ($trimmed -eq "[]" -or $trimmed -eq "") {
  $new = @"
# dsh-theme-triptych — appearance themes (added by installer)
- insert:
    - id: dsh-theme-triptych
      name: dsh-theme-triptych
"@
  Set-Content -Path $patchFile -Value $new -Encoding utf8 -NoNewline
  Write-Host "==> replaced empty patch with the dsh-theme-triptych insert"
}
else {
  $addition = @"

# dsh-theme-triptych — appearance themes (added by installer)
- insert:
    - id: dsh-theme-triptych
      name: dsh-theme-triptych
"@
  Add-Content -Path $patchFile -Value $addition -Encoding utf8 -NoNewline
  Write-Host "==> appended the dsh-theme-triptych insert to cordis.patch.yml"
}

Write-Host ""
Write-Host "Done. Restart dsh, e.g.:  dsh --profile $Profile"
Write-Host "Verify wallpaper route:   curl -I http://127.0.0.1:3080/dsh-theme-triptych/nexus.jpg"
Write-Host "Then in the Web GUI: sidebar-footer palette button, or Settings -> General -> 外观主题"
