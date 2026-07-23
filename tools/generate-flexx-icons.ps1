$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourcePath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'assets\flexx-icon-source.png'))
$assetDirectory = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'apps\flexx-files\assets'))
if (-not $sourcePath.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not $assetDirectory.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Resolved icon paths escaped the repository.'
}

function Write-SquarePng([System.Drawing.Image] $source, [int] $size, [string] $destination) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $bitmap.SetResolution(96, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, 0, 0, $size, $size)
        } finally {
            $graphics.Dispose()
        }
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $bitmap.Dispose()
    }
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
    Write-SquarePng $source 192 (Join-Path $assetDirectory 'icon-192.png')
    Write-SquarePng $source 512 (Join-Path $assetDirectory 'icon-512.png')
} finally {
    $source.Dispose()
}

Write-Output 'Generated Flexx Files icons: 192x192 and 512x512.'
