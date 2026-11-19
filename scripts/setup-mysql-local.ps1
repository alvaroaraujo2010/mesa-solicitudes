# Configura MySQL local para Mesa de Solicitudes.
# Uso (PowerShell como Administrador):
#   .\scripts\setup-mysql-local.ps1 -RootPassword 'tu_password_actual'
# Si no conoces el password de root, el script puede resetearlo (requiere admin):
#   .\scripts\setup-mysql-local.ps1 -ResetRoot -NewRootPassword 'mesa_local'

param(
  [string]$RootPassword = '',
  [switch]$ResetRoot,
  [string]$NewRootPassword = 'mesa_local',
  [string]$AppUser = 'mesa',
  [string]$AppPassword = 'mesa_secret',
  [string]$Database = 'mesa_solicitudes'
)

$ErrorActionPreference = 'Stop'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$mysqld = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
$initSql = Join-Path $PSScriptRoot '..\apps\api\scripts\init-mysql.sql'

if (-not (Test-Path $mysql)) {
  throw "No se encontró mysql.exe en $mysql"
}

if ($ResetRoot) {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    throw 'ResetRoot requiere PowerShell como Administrador.'
  }

  $tmp = Join-Path $env:TEMP 'mesa-mysql-init.sql'
  @"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$NewRootPassword';
FLUSH PRIVILEGES;
"@ | Set-Content -Path $tmp -Encoding ASCII

  Stop-Service MySQL80 -Force
  Start-Sleep -Seconds 3
  $proc = Start-Process -FilePath $mysqld -ArgumentList "--init-file=$tmp", '--console' -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 15
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Start-Service MySQL80
  Start-Sleep -Seconds 5
  $RootPassword = $NewRootPassword
  Write-Host "Root reseteado. Nuevo password: $NewRootPassword"
}

if ([string]::IsNullOrWhiteSpace($RootPassword)) {
  throw 'Indica -RootPassword o usa -ResetRoot.'
}

& $mysql -u root --password="$RootPassword" -e "SELECT 1;" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'No fue posible autenticar con root. Revisa el password o usa -ResetRoot.'
}

Get-Content $initSql -Raw | & $mysql -u root --password="$RootPassword"
& $mysql -u root --password="$RootPassword" -e @"
CREATE USER IF NOT EXISTS '$AppUser'@'localhost' IDENTIFIED BY '$AppPassword';
CREATE USER IF NOT EXISTS '$AppUser'@'%' IDENTIFIED BY '$AppPassword';
GRANT ALL PRIVILEGES ON $Database.* TO '$AppUser'@'localhost';
GRANT ALL PRIVILEGES ON $Database.* TO '$AppUser'@'%';
FLUSH PRIVILEGES;
"@

Write-Host "MySQL listo. Database=$Database User=$AppUser Password=$AppPassword"
Write-Host 'Actualiza apps/api/.env con PERSISTENCE_ADAPTER=mysql y esas credenciales.'
