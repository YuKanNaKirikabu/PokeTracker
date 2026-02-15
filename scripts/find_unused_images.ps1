$ErrorActionPreference = 'Stop'
Set-Location 'c:\Users\vishn\Local\Code\PokeTracker'

$imgExt = @('.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.avif','.bmp','.tif','.tiff')
$root = (Resolve-Path '.').Path

$allImages = Get-ChildItem -Path 'Images' -Recurse -File |
  Where-Object { $imgExt -contains $_.Extension.ToLower() } |
  ForEach-Object { ($_.FullName.Substring($root.Length + 1) -replace '\\','/') }

$usedFiles = New-Object 'System.Collections.Generic.HashSet[string]'
$dynamicPrefixes = New-Object 'System.Collections.Generic.HashSet[string]'

$allTextFiles = Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch '\\Images\\' -and
  $_.FullName -notmatch '\\.git\\' -and
  $_.FullName -notmatch '\\node_modules\\' -and
  $_.FullName -notmatch '\\data\\logs\\' -and
  $_.Extension -in @('.js','.ts','.json','.html','.css','.md','.txt','.bat','.py')
}

$rxFile = 'https?://storage\.yandexcloud\.net/poketracker/Images/([^"''`\s)]+\.[A-Za-z0-9]+)|(?<![A-Za-z0-9])/?Images/([^"''`\s)]+\.[A-Za-z0-9]+)'
$rxDyn = 'https?://storage\.yandexcloud\.net/poketracker/Images/([^"''`\s$]+?)/\$\{|/?Images/([^"''`\s$]+?)/\$\{'

foreach($f in $allTextFiles){
  try { $content = Get-Content -Raw -LiteralPath $f.FullName } catch { continue }
  if([string]::IsNullOrEmpty($content)){ continue }

  foreach($m in [regex]::Matches($content, $rxFile)){
    $p = if($m.Groups[1].Success){ $m.Groups[1].Value } else { $m.Groups[2].Value }
    if([string]::IsNullOrWhiteSpace($p)){ continue }
    try { $p = [System.Uri]::UnescapeDataString($p) } catch {}
    $p = 'Images/' + ($p -replace '^/+','')
    $p = $p -replace '\\','/'
    $null = $usedFiles.Add($p)
  }

  foreach($m in [regex]::Matches($content, $rxDyn)){
    $p = if($m.Groups[1].Success){ $m.Groups[1].Value } else { $m.Groups[2].Value }
    if([string]::IsNullOrWhiteSpace($p)){ continue }
    try { $p = [System.Uri]::UnescapeDataString($p) } catch {}
    $p = 'Images/' + ($p -replace '^/+','')
    $p = $p -replace '\\','/'
    $null = $dynamicPrefixes.Add($p.TrimEnd('/'))
  }
}

$unused = @()
foreach($img in $allImages){
  $isUsed = $usedFiles.Contains($img)
  if(-not $isUsed){
    foreach($pref in $dynamicPrefixes){
      if($img.StartsWith($pref + '/')){
        $isUsed = $true
        break
      }
    }
  }

  if(-not $isUsed){
    $unused += $img
  }
}

$unusedByTop = $unused |
  ForEach-Object { ($_ -split '/')[1] } |
  Group-Object |
  Sort-Object Count -Descending

$allTop = Get-ChildItem -Path 'Images' -Directory | Select-Object -ExpandProperty Name
$unusedTop = @()
foreach($top in $allTop){
  $topFiles = $allImages | Where-Object { $_ -like ('Images/' + $top + '/*') }
  if($topFiles.Count -eq 0){ continue }

  $hasDynamicInTop = ($dynamicPrefixes | Where-Object { $_ -like ('Images/' + $top + '*') }).Count -gt 0
  $usedInTop = $topFiles | Where-Object { $usedFiles.Contains($_) -or $hasDynamicInTop }
  if($usedInTop.Count -eq 0){
    $unusedTop += $top
  }
}

Write-Output ('TOTAL_IMAGES=' + $allImages.Count)
Write-Output ('REFERENCED_EXACT=' + $usedFiles.Count)
Write-Output ('DYNAMIC_PREFIXES=' + $dynamicPrefixes.Count)
Write-Output ('UNUSED_IMAGES_POTENTIAL=' + $unused.Count)
Write-Output ('UNUSED_TOP_FOLDERS_POTENTIAL=' + $unusedTop.Count)
Write-Output '---TOP_UNUSED_FOLDERS---'
$unusedTop | Select-Object -First 30 | ForEach-Object { Write-Output $_ }
Write-Output '---TOP_UNUSED_FILE_DIRS---'
$unusedByTop | Select-Object -First 20 | ForEach-Object { Write-Output ($_.Name + ':' + $_.Count) }
Write-Output '---SAMPLE_UNUSED_FILES---'
$unused | Select-Object -First 40 | ForEach-Object { Write-Output $_ }
