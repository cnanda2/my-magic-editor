# find-arduino-port.ps1
# Finds Arduino/CH340 serial ports by USB hardware ID
# Output: JSON with port path and device info

$knownVids = @(
    "1A86",  # CH340/CH341 (most common clones)
    "2341",  # Arduino LLC
    "239A",  # Adafruit
    "10C4",  # Silicon Labs CP210x
    "0403",  # FTDI
    "2E8A",  # Raspberry Pi
    "303A",  # ESP32-S2/S3
    "1A86"   # CH340/CH341
)

$ports = Get-WmiObject Win32_PnPEntity | Where-Object {
    $_.Name -match "COM\d+" -and $_.ConfigManagerErrorCode -eq 0
} | ForEach-Object {
    $hwId = ($_.HardwareID -join " ").ToUpper()
    $matched = $false
    foreach ($vid in $knownVids) {
        if ($hwId -match "VID_$vid") {
            $matched = $true
            break
        }
    }
    if ($matched) {
        $comMatch = [regex]::Match($_.Name, '\(COM\d+\)')
        $port = $comMatch.Value -replace '[()]',''
        [PSCustomObject]@{
            port = $port
            found = $true
            description = $_.Name
            hardwareId = ($_.HardwareID -join "; ")
        }
    }
}

if ($ports) {
    $ports | Select-Object -First 1 | ConvertTo-Json -Compress
} else {
    Write-Output '{"found":false}'
}
