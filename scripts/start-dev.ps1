$ErrorActionPreference = 'Stop'

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ClientDir = Join-Path $RootDir 'client'
$ServerDir = Join-Path $RootDir 'server'
$LocalDevDir = Join-Path $RootDir '.local-dev'
$ClientProcess = $null
$ServerProcess = $null
$StopRequested = $false

function Stop-ServiceProcess($Process) {
    if ($null -ne $Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F *> $null
        Wait-Process -Id $Process.Id -Timeout 10 -ErrorAction SilentlyContinue
    }
}

function Fail([string]$Message) {
    throw $Message
}

try {
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $node -or -not $npm) { Fail 'Node.js 20.9 or newer (including npm) is required. Install Node.js, then rerun scripts\start-dev.ps1.' }
    $nodeVersion = (& node -p 'process.versions.node').Trim()
    if ([version]$nodeVersion -lt [version]'20.9') { Fail "Node.js 20.9 or newer is required (found $nodeVersion)." }

    # Python overrides can point at another installation and break stdlib lookup.
    foreach ($variableName in @('PYTHONHOME', 'PYTHONPATH')) {
        if (Test-Path "Env:$variableName") {
            Write-Warning "Ignoring $variableName for this startup session so Python can find its standard library."
            Remove-Item "Env:$variableName" -ErrorAction SilentlyContinue
        }
    }

    # Prefer the interpreter on PATH. `py -3` can select a broken newer
    # installation even when a working supported Python is available on PATH.
    $PythonCommand = $null
    $PythonPrefix = @()
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $null = & $python.Source -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>$null
        if ($LASTEXITCODE -eq 0) { $PythonCommand = $python.Source }
    }
    if (-not $PythonCommand) {
        $launcher = Get-Command py -ErrorAction SilentlyContinue
        if ($launcher) {
            foreach ($version in @('3.14', '3.13', '3.12', '3.11', '3.10')) {
                $null = & $launcher.Source "-$version" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $PythonCommand = $launcher.Source
                    $PythonPrefix = @("-$version")
                    break
                }
            }
        }
    }
    if (-not $PythonCommand) { Fail 'Python 3.10 or newer is required. Install a working Python interpreter, then rerun scripts\start-dev.ps1.' }

    $clientEnv = Join-Path $ClientDir '.env.local'
    $serverEnv = Join-Path $ServerDir '.env'
    if (-not (Test-Path $clientEnv)) {
        Copy-Item (Join-Path $ClientDir '.env.example') $clientEnv
        Write-Host 'Created client\.env.local from its example. Add your Firebase browser settings for sign-in.'
    }
    if (-not (Test-Path $serverEnv)) {
        Copy-Item (Join-Path $ServerDir '.env.example') $serverEnv
        Write-Host 'Created server\.env from its example.'
    }

    if (-not (Test-Path (Join-Path $ClientDir 'node_modules\.bin\next.cmd'))) { Fail 'Client dependencies are missing. Run: cd client; npm ci' }
    $venvPython = Join-Path $ServerDir '.venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
        $pythonSetupCommand = if ([IO.Path]::GetFileName($PythonCommand) -ieq 'py.exe') { "py $($PythonPrefix -join ' ')" } else { 'python' }
        Fail "Server virtual environment is missing. Run from server: $pythonSetupCommand -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    }
    & $venvPython -c 'import fastapi, uvicorn' *> $null
    if ($LASTEXITCODE -ne 0) { Fail 'Server Python dependencies are missing. Run: cd server; .\.venv\Scripts\python.exe -m pip install -r requirements.txt' }

    foreach ($port in @(3000, 8000)) {
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
        foreach ($processId in $listeners) {
            $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
            $description = if ($owner) { $owner.Name + ' ' + $owner.CommandLine } else { 'unknown process' }
            Write-Host "Port $port is in use by PID $processId ($description)."
            $answer = Read-Host "Stop this process to free port $port? [y/N]"
            if ($answer -notmatch '^[Yy]$') { Fail "Port $port remains occupied; no services were started." }
            & taskkill.exe /PID $processId /T /F
            if ($LASTEXITCODE -ne 0) { Fail "Could not stop PID $processId. Try running PowerShell as a user with permission to stop it." }
        }
    }

    # Import server settings as environment variables, without dot-sourcing the file.
    foreach ($line in Get-Content $serverEnv) {
        if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { continue }
        $name = $Matches[1]
        $value = $Matches[2].TrimEnd("`r")
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) { $value = $value.Substring(1, $value.Length - 2) }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
    if (-not $env:SERVER_ALLOWED_CLIENT_ORIGINS) { $env:SERVER_ALLOWED_CLIENT_ORIGINS = 'http://localhost:3000' }

    New-Item -ItemType Directory -Force -Path $LocalDevDir | Out-Null
    $serverLog = Join-Path $LocalDevDir 'server.log'
    $clientLog = Join-Path $LocalDevDir 'client.log'
    $serverArgs = '-m uvicorn app.main:application --reload --host 127.0.0.1 --port 8000'
    $ServerProcess = Start-Process -FilePath $venvPython -ArgumentList $serverArgs -WorkingDirectory $ServerDir -RedirectStandardOutput $serverLog -RedirectStandardError (Join-Path $LocalDevDir 'server-error.log') -PassThru -WindowStyle Hidden
    $ClientProcess = Start-Process -FilePath $env:ComSpec -ArgumentList '/d /s /c "npm run dev -- --hostname 127.0.0.1 --port 3000"' -WorkingDirectory $ClientDir -RedirectStandardOutput $clientLog -RedirectStandardError (Join-Path $LocalDevDir 'client-error.log') -PassThru -WindowStyle Hidden

    foreach ($service in @(@{ Name = 'FastAPI'; Url = 'http://127.0.0.1:8000/healthz'; Process = $ServerProcess }, @{ Name = 'Next.js'; Url = 'http://127.0.0.1:3000/healthz'; Process = $ClientProcess })) {
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            if ($service.Process.HasExited) { Fail "$($service.Name) exited before becoming healthy. Check .local-dev logs." }
            try {
                $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 1 -UseBasicParsing
                if ($response.StatusCode -eq 200) { $ready = $true; break }
            } catch { Start-Sleep -Seconds 1 }
        }
        if (-not $ready) { Fail "$($service.Name) did not become healthy at $($service.Url) within 60 seconds. Check .local-dev logs." }
        Write-Host "$($service.Name) is ready: $($service.Url)"
    }

    Write-Host "`nBayes Learning Platform is running. Press Ctrl+C to stop both services."
    while (-not $StopRequested) {
        if ($ServerProcess.HasExited) { Fail 'FastAPI stopped unexpectedly. Check .local-dev logs.' }
        if ($ClientProcess.HasExited) { Fail 'Next.js stopped unexpectedly. Check .local-dev logs.' }
        Start-Sleep -Seconds 1
    }
} catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host "`nStopping services..."
} catch {
    Write-Error $_
    exit 1
} finally {
    Stop-ServiceProcess $ClientProcess
    Stop-ServiceProcess $ServerProcess
}
