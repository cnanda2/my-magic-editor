param($Port, $Type="normal")
try {
  $p = new-Object System.IO.Ports.SerialPort $Port,115200,None,8,One
  $p.Open()
  if ($Type -eq "normal") {
    $p.DtrEnable = $true
    Start-Sleep -Milliseconds 50
    $p.DtrEnable = $false
    Start-Sleep -Milliseconds 400
    $p.DtrEnable = $true
  } elseif ($Type -eq "double") {
    $p.DtrEnable = $true
    Start-Sleep -Milliseconds 50
    $p.DtrEnable = $false
    Start-Sleep -Milliseconds 200
    $p.DtrEnable = $true
    Start-Sleep -Milliseconds 50
    $p.DtrEnable = $false
    Start-Sleep -Milliseconds 400
    $p.DtrEnable = $true
  } elseif ($Type -eq "long_low") {
    $p.DtrEnable = $true
    Start-Sleep -Milliseconds 50
    $p.DtrEnable = $false
    Start-Sleep -Milliseconds 1500
    $p.DtrEnable = $true
  }
  Write-Host "OK"
} catch {
  Write-Host "FAIL:$($_.Exception.Message)"
} finally {
  if ($p.IsOpen) { $p.Close() }
  $p.Dispose()
}