# Levanta MySQL portable en 127.0.0.1:3307 (sin tocar el servicio MySQL80 del sistema).
$base = 'C:\dev\mysql-portable\mysql-8.0.36-winx64'
$data = 'C:\dev\mysql-portable\data'
$mysqld = Join-Path $base 'bin\mysqld.exe'

if (-not (Test-Path $mysqld)) {
  throw 'MySQL portable no está instalado en C:\dev\mysql-portable'
}

$existing = Get-NetTCPConnection -LocalPort 3307 -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host 'MySQL portable ya está escuchando en 3307.'
  exit 0
}

Start-Process -FilePath $mysqld -ArgumentList "--datadir=$data","--basedir=$base","--port=3307","--bind-address=127.0.0.1","--console" -WindowStyle Hidden
Start-Sleep -Seconds 5
Write-Host 'MySQL portable iniciado en 127.0.0.1:3307 (user=mesa / pass=mesa_secret / db=mesa_solicitudes)'
