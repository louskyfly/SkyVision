$port = 8081
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Start()

Write-Host "========================================="
Write-Host "  DJI Neo 2 - Serveur actif"
Write-Host "  PC   : http://localhost:${port}/"
Write-Host "========================================="

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $path = $context.Request.Url.LocalPath
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root $path.Replace('/', '\')
    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $types = @{
        '.html'='text/html'
        '.css'='text/css'
        '.js'='application/javascript'
        '.json'='application/json'
        '.png'='image/png'
        '.jpg'='image/jpeg'
        '.jpeg'='image/jpeg'
        '.gif'='image/gif'
        '.svg'='image/svg+xml'
        '.ico'='image/x-icon'
        '.woff2'='font/woff2'
        '.mp4'='video/mp4'
        '.webp'='image/webp'
        '.jfif'='image/jpeg'
      }
      $ct = $types[$ext]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $context.Response.ContentType = $ct
      $context.Response.Headers.Add('Cache-Control', 'no-cache, no-store, must-revalidate')
      $context.Response.Headers.Add('Pragma', 'no-cache')
      $context.Response.Headers.Add('Expires', '0')
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $bytes404 = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $context.Response.StatusCode = 404
      $context.Response.ContentLength64 = $bytes404.Length
      $context.Response.OutputStream.Write($bytes404, 0, $bytes404.Length)
    }
    $context.Response.Close()
  } catch { }
}