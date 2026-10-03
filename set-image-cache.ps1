param(
    [string]$Bucket = "poketracker",
    [string]$Prefix = "Images/",
    [string]$Endpoint = "https://storage.yandexcloud.net"
)

$ErrorActionPreference = "Stop"
$cacheControl = "public, max-age=31536000, immutable"

$objects = aws s3api list-objects-v2 `
    --bucket $Bucket `
    --prefix $Prefix `
    --endpoint-url $Endpoint `
    --output json | ConvertFrom-Json

foreach ($object in @($objects.Contents)) {
    $key = $object.Key
    if (-not $key -or $key.EndsWith("/")) { continue }

    $extension = [IO.Path]::GetExtension($key).ToLowerInvariant()
    $contentType = switch ($extension) {
        ".webp" { "image/webp"; break }
        ".png" { "image/png"; break }
        ".jpg" { "image/jpeg"; break }
        ".jpeg" { "image/jpeg"; break }
        ".gif" { "image/gif"; break }
        default { $null }
    }
    if (-not $contentType) { continue }

    Write-Host "Updating $key"
    aws s3 cp "s3://$Bucket/$key" "s3://$Bucket/$key" `
        --endpoint-url $Endpoint `
        --metadata-directive REPLACE `
        --cache-control $cacheControl `
        --content-type $contentType
    if ($LASTEXITCODE -ne 0) { throw "Failed to update $key" }
}