param(
    [switch]$IncludeSourceCode
)

$ErrorActionPreference = "Stop"

$gdriveBase = "G:\My Drive"
if (!(Test-Path $gdriveBase)) {
    Write-Error "Drive Google Drive (G:\My Drive) tidak ditemukan atau belum aktif."
    exit 1
}

$targetDir = Join-Path $gdriveBase "BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$now = Get-Date
$dateStr = $now.ToString("yyyy-MM-dd")
$timeStr = $now.ToString("HH-mm-ss")

$projRoot = "c:\Users\User\OneDrive\Documents\INOVASI SURVEY BUDAYA KESELAMATAN\survei-budaya-keselamatan-pasien (2)"

# 1. Sync database json snapshot from local backup folder if exists
$localBackup = Join-Path $projRoot "data\backups\survei_realtime_backup.json"
if (Test-Path $localBackup) {
    Copy-Item -Path $localBackup -Destination (Join-Path $targetDir "survei_database_latest.json") -Force
    Copy-Item -Path $localBackup -Destination (Join-Path $targetDir "survei_database_$dateStr.json") -Force
    Write-Output "DATABASE_SYNCED_OK: $targetDir\survei_database_latest.json"
}

# 2. Sync public assets (wallpapers, logos, etc)
$publicSource = Join-Path $projRoot "public"
$publicTarget = Join-Path $targetDir "public_assets"
if (Test-Path $publicSource) {
    if (!(Test-Path $publicTarget)) {
        New-Item -ItemType Directory -Path $publicTarget -Force | Out-Null
    }
    Copy-Item -Path "$publicSource\*" -Destination $publicTarget -Recurse -Force
    Write-Output "PUBLIC_ASSETS_SYNCED_OK: $publicTarget"
}

# 3. Create Full Application Code Zip (EXCLUDING node_modules, .next, .git)
if ($IncludeSourceCode) {
    $tempZipFolder = Join-Path ([System.IO.Path]::GetTempPath()) "survei_backup_temp_$dateStr"
    if (Test-Path $tempZipFolder) { Remove-Item $tempZipFolder -Recurse -Force }
    New-Item -ItemType Directory -Path $tempZipFolder -Force | Out-Null

    $itemsToCopy = @("app", "components", "hooks", "lib", "public", "scripts", "src", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "README.md", "BACKUP_SURVEI_KE_GDRIVE.bat")

    foreach ($item in $itemsToCopy) {
        $srcPath = Join-Path $projRoot $item
        if (Test-Path $srcPath) {
            Copy-Item -Path $srcPath -Destination (Join-Path $tempZipFolder $item) -Recurse -Force
        }
    }

    $zipName = "SURVEI_BUDAYA_FULL_CODE_${dateStr}_${timeStr}.zip"
    $zipDestination = Join-Path $targetDir $zipName
    Compress-Archive -Path "$tempZipFolder\*" -DestinationPath $zipDestination -Force
    Remove-Item $tempZipFolder -Recurse -Force
    Write-Output "FULL_ZIP_SAVED_OK: $zipDestination"
}

Write-Output "ALL_BACKUP_COMPLETED_SUCCESSFULLY"
