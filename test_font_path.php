<?php
/**
 * 폰트 경로 테스트 스크립트
 * 실행: php test_font_path.php
 */

$basePath = __DIR__;
$fontsPath = $basePath . '/web/assets/fonts';
$fontsPathReal = realpath($fontsPath) ?: $fontsPath;

echo "=== 폰트 경로 테스트 ===\n\n";
echo "Base Path: $basePath\n";
echo "Fonts Path (relative): $fontsPath\n";
echo "Fonts Path (realpath): $fontsPathReal\n";
echo "Realpath exists: " . (realpath($fontsPath) !== false ? "YES" : "NO") . "\n\n";

$regularFont = $fontsPathReal . '/PretendardGOV-Regular.ttf';
$boldFont = $fontsPathReal . '/PretendardGOV-Bold.ttf';

echo "Regular Font Path: $regularFont\n";
echo "Regular Font Exists: " . (file_exists($regularFont) ? "YES" : "NO") . "\n";
echo "Regular Font Readable: " . (file_exists($regularFont) && is_readable($regularFont) ? "YES" : "NO") . "\n";
if (file_exists($regularFont)) {
    echo "Regular Font Size: " . filesize($regularFont) . " bytes\n";
}
echo "\n";

echo "Bold Font Path: $boldFont\n";
echo "Bold Font Exists: " . (file_exists($boldFont) ? "YES" : "NO") . "\n";
echo "Bold Font Readable: " . (file_exists($boldFont) && is_readable($boldFont) ? "YES" : "NO") . "\n";
if (file_exists($boldFont)) {
    echo "Bold Font Size: " . filesize($boldFont) . " bytes\n";
}
echo "\n";

// Test MpdfProvider path calculation
$testPath = dirname(__DIR__) . '/web/assets/fonts';
$testPathReal = realpath($testPath) ?: $testPath;
echo "MpdfProvider calculated path: $testPath\n";
echo "MpdfProvider realpath: $testPathReal\n";
echo "Matches: " . ($testPathReal === $fontsPathReal ? "YES" : "NO") . "\n";
