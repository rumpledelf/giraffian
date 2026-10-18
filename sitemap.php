<?php
// Served as /sitemap.xml (see .htaccess): every folder with an index.php is a page
header('Content-Type: application/xml; charset=utf-8');
include __DIR__ . '/includes/variables.php';

$skip = ['includes', '.git'];
$pages = ['/'];
$walk = new RecursiveIteratorIterator(new RecursiveCallbackFilterIterator(
	new RecursiveDirectoryIterator(__DIR__, FilesystemIterator::SKIP_DOTS),
	fn($file) => !in_array($file->getFilename(), $skip, true)
), RecursiveIteratorIterator::LEAVES_ONLY, RecursiveIteratorIterator::CATCH_GET_CHILD); // unreadable folders are skipped, not fatal
foreach ($walk as $file) {
	if ($file->getFilename() !== 'index.php') continue;
	$path = substr($file->getPath(), strlen(__DIR__)) . '/';
	if ($path !== '/') $pages[] = $path;
}
sort($pages);

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($pages as $path) echo "\t<url><loc>" . htmlspecialchars($siteurl . $path) . "</loc></url>\n";
echo "</urlset>\n";
