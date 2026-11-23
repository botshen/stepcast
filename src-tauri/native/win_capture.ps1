param(
    [string]$Mode = "check",
    [string]$OutputDir = "$env:TEMP\stepcast",
    [int]$SkipPid = 0
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class Win32Input {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
"@

[Win32Input]::SetProcessDPIAware() | Out-Null

if ($Mode -eq "check") {
    @{ accessibility = $true; screenRecording = $true; platform = "windows" } | ConvertTo-Json -Compress
    exit 0
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Capture-CurrentPoint([string]$Button) {
    $fg = [Win32Input]::GetForegroundWindow()
    $fgPid = [uint32]0
    [Win32Input]::GetWindowThreadProcessId($fg, [ref]$fgPid) | Out-Null
    if ($SkipPid -gt 0 -and $fgPid -eq $SkipPid) {
        return
    }

    $sb = New-Object System.Text.StringBuilder 256
    [Win32Input]::GetWindowText($fg, $sb, 256) | Out-Null
    $winTitle = $sb.ToString()

    $appName = "Windows Application"
    try {
        $proc = Get-Process -Id $fgPid -ErrorAction SilentlyContinue
        if ($null -ne $proc -and $proc.ProcessName) {
            $appName = $proc.ProcessName
        }
    } catch {}

    $pos = [System.Windows.Forms.Cursor]::Position
    $screen = [System.Windows.Forms.Screen]::FromPoint($pos)
    $bounds = $screen.Bounds

    $label = ""
    $role = ""
    try {
        $pt = New-Object System.Windows.Point($pos.X, $pos.Y)
        $el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
        if ($null -ne $el) {
            $label = $el.Current.Name
            $role = $el.Current.LocalizedControlType
        }
    } catch {}

    $id = [guid]::NewGuid().ToString().ToLower()
    $outPath = Join-Path $OutputDir "step_$id.png"
    $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $gfx.Dispose()
    $bmp.Dispose()

    $normX = ($pos.X - $bounds.X) / [double]$bounds.Width
    $normY = ($pos.Y - $bounds.Y) / [double]$bounds.Height

    $payload = @{
        id = $id
        timestampMs = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
        appName = $appName
        bundleId = ""
        windowTitle = $winTitle
        button = $Button
        shortcutKey = ""
        normX = [math]::Max(0.0, [math]::Min(1.0, $normX))
        normY = [math]::Max(0.0, [math]::Min(1.0, $normY))
        screenWidth = $bounds.Width
        screenHeight = $bounds.Height
        scaleFactor = 1.0
        elementRole = if ($role) { "$role" } else { "" }
        elementLabel = if ($label) { "$label" } else { "" }
        ocrText = ""
        detectionSource = if ($label) { "accessibility" } else { "coords" }
        imagePath = $outPath
        autoRedactions = @()
    }
    Write-Output ($payload | ConvertTo-Json -Compress)
    [Console]::Out.Flush()
}

if ($Mode -eq "snapshot") {
    Capture-CurrentPoint "left"
    exit 0
}

if ($Mode -eq "watch") {
    $wasLeftDown = $false
    $wasRightDown = $false
    $lastMs = [int64]0
    while ($true) {
        $leftState = [Win32Input]::GetAsyncKeyState(0x01)
        $rightState = [Win32Input]::GetAsyncKeyState(0x02)
        $isLeftDown = ($leftState -band 0x8000) -ne 0
        $isRightDown = ($rightState -band 0x8000) -ne 0
        $nowMs = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())

        if ($isLeftDown -and -not $wasLeftDown -and ($nowMs - $lastMs -ge 260)) {
            $lastMs = $nowMs
            Capture-CurrentPoint "left"
        } elseif ($isRightDown -and -not $wasRightDown -and ($nowMs - $lastMs -ge 260)) {
            $lastMs = $nowMs
            Capture-CurrentPoint "right"
        }

        $wasLeftDown = $isLeftDown
        $wasRightDown = $isRightDown
        Start-Sleep -Milliseconds 25
    }
}
