Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Acer\.gemini\antigravity-ide\brain\6064675d-98a5-45e9-a151-311bc55b5f43\focusquest_app_icon_1793108496241.jpg"
$outDir = "d:\TRACKER\build"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$pngPath = Join-Path $outDir "icon.png"
$icoPath = Join-Path $outDir "icon.ico"

# Load image
$img = [System.Drawing.Bitmap]::FromFile($src)

# Save as PNG (512x512)
$resized = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImage($img, 0, 0, 512, 512)
$resized.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Also save 256x256 for icon
$icoResized = New-Object System.Drawing.Bitmap 256, 256
$g2 = [System.Drawing.Graphics]::FromImage($icoResized)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($img, 0, 0, 256, 256)

# Create an Hicon and save
$hIcon = $icoResized.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fileStream = [System.IO.File]::Create($icoPath)
$icon.Save($fileStream)
$fileStream.Close()

# Clean up
$graphics.Dispose()
$g2.Dispose()
$img.Dispose()
$resized.Dispose()
$icoResized.Dispose()

Write-Host "ICON_SUCCESS"
