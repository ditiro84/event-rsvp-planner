# Run this from the ROOT of your event-rsvp-planner repo
# (the folder that directly contains "apps", "package.json", ".git", etc.)
#
# What this does: the last few colour-pass deliveries got extracted/pasted
# one folder too shallow -- into apps\ instead of apps\web\src\ -- so the
# real app (which only builds from apps\web\src) never picked them up.
# This moves everything to where it actually belongs, overwriting the
# older versions already sitting there, then removes the stray copies.

$ErrorActionPreference = "Stop"

function Merge-Into($from, $to) {
    if (Test-Path $from) {
        New-Item -ItemType Directory -Force -Path $to | Out-Null
        Get-ChildItem -Path $from -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring((Resolve-Path $from).Path.Length).TrimStart('\')
            $dest = Join-Path $to $rel
            New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
            Copy-Item -Force $_.FullName $dest
        }
    }
}

Write-Host "Merging misplaced folders into apps\web\src ..."
Merge-Into "apps\components" "apps\web\src\components"
Merge-Into "apps\lib"        "apps\web\src\lib"
Merge-Into "apps\pages"      "apps\web\src\pages"

Write-Host "Moving misplaced loose files into apps\web\src ..."
$moves = @{
    "apps\tabTheme.ts"              = "apps\web\src\lib\tabTheme.ts"
    "apps\Card.tsx"                 = "apps\web\src\components\ui\Card.tsx"
    "apps\DashboardLayout.tsx"      = "apps\web\src\components\layout\DashboardLayout.tsx"
    "apps\AdminPage.tsx"            = "apps\web\src\pages\admin\AdminPage.tsx"
    "apps\PlatformAnalyticsTab.tsx" = "apps\web\src\pages\admin\PlatformAnalyticsTab.tsx"
}
foreach ($src in $moves.Keys) {
    if (Test-Path $src) {
        Copy-Item -Force $src $moves[$src]
    }
}

Write-Host "Cleaning up the stray copies under apps\ ..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "apps\components"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "apps\lib"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "apps\pages"
Remove-Item -Force -ErrorAction SilentlyContinue "apps\tabTheme.ts"
Remove-Item -Force -ErrorAction SilentlyContinue "apps\Card.tsx"
Remove-Item -Force -ErrorAction SilentlyContinue "apps\DashboardLayout.tsx"
Remove-Item -Force -ErrorAction SilentlyContinue "apps\AdminPage.tsx"
Remove-Item -Force -ErrorAction SilentlyContinue "apps\PlatformAnalyticsTab.tsx"

Write-Host ""
Write-Host "Done. Now run:"
Write-Host "  git add -A"
Write-Host "  git commit -m `"Fix colour-pass files: move from apps\ into apps\web\src\`""
Write-Host "  git push"
