# Generate stage background images for JX3 social card nodes.
# Uses the trae-api-cn text_to_image endpoint (no external API key needed).
$ErrorActionPreference = 'Stop'

$env:NO_PROXY = '*'
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:http_proxy = ''
$env:https_proxy = ''

$outDir = "i:\workspace\Nodejs-workspace\bot\project\zorron-engine\apps\zorron-editor\public\stage-bg"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Node background image specs — each matches a JX3 social card interaction node.
$specs = @(
  @{ name = 'mindset';  prompt = 'Chinese traditional ink painting, Xianxia mountain and clouds, very light sparse, golden ratio, no characters, no text, horizontal 16:9, zen atmosphere, suitable for UI background' }
  @{ name = 'body';     prompt = 'Chinese ink wash painting, four silhouettes standing side by side, very faint, minimalist, horizontal 16:9, lots of empty space, no text' }
  @{ name = 'gender';   prompt = 'Chinese taiji yin yang symbol, ink wash style, very subtle and light, minimalist, horizontal 16:9, centered, lots of empty space, no text' }
  @{ name = 'rank';     prompt = 'Chinese ancient arena, martial arts tournament stage, ink wash painting, very light, horizontal 16:9, atmospheric, no characters, no text' }
  @{ name = 'mode';     prompt = 'Chinese ancient jianghu scene, marketplace and mountains, ink wash painting, very light, horizontal 16:9, atmospheric, no characters, no text' }
  @{ name = 'mbti';     prompt = 'Star constellation map, Chinese ancient astrology, 28 mansions, ink wash style, very light, horizontal 16:9, minimalist, no text' }
  @{ name = 'zodiac';   prompt = 'Chinese 12 zodiac symbols arranged in circle, ink wash style, very light, horizontal 16:9, minimalist, no text' }
  @{ name = 'interests'; prompt = 'Chinese ancient jianghu activities collage, arena, cooking pot, pet, ink wash style, very light, horizontal 16:9, no text' }
  @{ name = 'priority'; prompt = 'Chinese ancient balance scale, traditional weighing tool, ink wash style, very light, horizontal 16:9, centered, minimalist, no text' }
)

foreach ($spec in $specs) {
  $out = Join-Path $outDir "$($spec.name)-bg.png"
  if (Test-Path $out) {
    $size = (Get-Item $out).Length
    if ($size -gt 50000) {
      Write-Output "SKIP: $($spec.name)-bg.png already exists ($size bytes)"
      continue
    }
  }
  $encoded = [uri]::EscapeDataString($spec.prompt)
  $url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=$encoded&image_size=landscape_16_9"
  try {
    Invoke-WebRequest -Uri $url -OutFile $out -TimeoutSec 90
    $size = (Get-Item $out).Length
    Write-Output "OK: $($spec.name)-bg.png ($size bytes)"
  } catch {
    Write-Output "ERR $($spec.name): $($_.Exception.Message)"
  }
}
Write-Output "DONE"
