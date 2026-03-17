@echo off
setlocal EnableExtensions

set "PORTS=%~1"
if "%PORTS%"=="" set "PORTS=3000,3001,3002"

echo [INFO] Clearing listeners on ports: %PORTS%

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'SilentlyContinue';" ^
  "$ports = '%PORTS%'.Split(',') | ForEach-Object { [int]$_.Trim() };" ^
  "$listeners = Get-NetTCPConnection -LocalPort $ports -State Listen | Select-Object LocalPort, OwningProcess;" ^
  "if (-not $listeners) { Write-Output '[INFO] No active listeners found.'; exit 0 };" ^
  "Write-Output '[INFO] Active listeners before cleanup:';" ^
  "$listeners | Sort-Object LocalPort | Format-Table -AutoSize | Out-String | Write-Output;" ^
  "$procIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique;" ^
  "foreach ($procId in $procIds) {" ^
  "  try {" ^
  "    Stop-Process -Id $procId -Force -ErrorAction Stop;" ^
  "    Write-Output ('[OK] Stopped PID {0}' -f $procId);" ^
  "  } catch {" ^
  "    Write-Output ('[WARN] Could not stop PID {0}: {1}' -f $procId, $_.Exception.Message);" ^
  "  }" ^
  "}" ^
  "$remaining = Get-NetTCPConnection -LocalPort $ports -State Listen;" ^
  "if (-not $remaining) {" ^
  "  Write-Output '[OK] Requested ports are clear.';" ^
  "  exit 0;" ^
  "} else {" ^
  "  Write-Output '[ERROR] Still listening after cleanup:';" ^
  "  $remaining | Sort-Object LocalPort | Format-Table -AutoSize | Out-String | Write-Output;" ^
  "  exit 1;" ^
  "}"

set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" (
  echo [DONE] Port cleanup completed successfully.
) else (
  echo [FAIL] Port cleanup finished with issues. Exit code: %EXIT_CODE%
)

exit /b %EXIT_CODE%
