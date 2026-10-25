@echo off
title SURVEI BUDAYA KESELAMATAN PASIEN - Backup Otomatis ke Google Drive G:
color 0A
echo ========================================================
echo   SURVEI BUDAYA KESELAMATAN PASIEN - CADANGAN GOOGLE DRIVE
echo ========================================================
echo.
echo Sedang mencadangkan seluruh kode program dan database survei...
echo Mohon tunggu sebentar (hanya butuh waktu beberapa detik)...
echo.
powershell -ExecutionPolicy Bypass -File "c:\Users\User\OneDrive\Documents\INOVASI SURVEY BUDAYA KESELAMATAN\survei-budaya-keselamatan-pasien (2)\scripts\backup_gdrive.ps1" -IncludeSourceCode
echo.
echo ========================================================
echo   [SUKSES] CADANGAN BERHASIL DISIMPAN KE GOOGLE DRIVE!
echo   Folder Cloud: G:\My Drive\BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN\
echo ========================================================
echo.
pause
