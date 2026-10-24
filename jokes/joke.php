<?php
// One joke per page, routed from /jokes/<slug>/ (see .htaccess)
include $_SERVER['DOCUMENT_ROOT'] . '/includes/pagination.php';

$folder = $_SERVER['DOCUMENT_ROOT'] . '/jokes';
$slugs = jokeslugs($folder);
$slug = $_GET['slug'] ?? '';
if (!isset($slugs[$slug])) {
	http_response_code(404);
	include $_SERVER['DOCUMENT_ROOT'] . '/404.php';
	exit;
}

$text = file_get_contents($folder . '/' . $slugs[$slug]);
$lines = jokelines($text);
$title = isknockknock($text) ? 'Knock knock joke: ' . $lines[0] : $lines[0];
$title = mb_strtoupper(mb_substr($title, 0, 1)) . mb_substr($title, 1);
if (mb_strlen($title) > 70) $title = rtrim(mb_substr($title, 0, 67)) . '…';
$summary = preg_replace('/\s+/', ' ', trim($text));
if (mb_strlen($summary) > 140) $summary = rtrim(mb_substr($summary, 0, 137)) . '…';
if (!preg_match('/[.!?…]$/u', $summary)) $summary .= '.';

$keys = array_keys($slugs);
$at = array_search($slug, $keys, true);
$prev = $keys[($at - 1 + count($keys)) % count($keys)];
$next = $keys[($at + 1) % count($keys)];
$random = $keys[array_rand($keys)];

// Optional cartoon: images/jokes/joke_N.png (or .jpg, .webp) beside the joke's text file
$cartoon = null;
foreach (['png', 'jpg', 'webp'] as $ext) {
	$path = '/images/jokes/' . basename($slugs[$slug], '.txt') . '.' . $ext;
	if (is_file($_SERVER['DOCUMENT_ROOT'] . $path)) { $cartoon = $path; break; }
}

define("TITLE", $title);
if ($cartoon) define("OGIMAGE", $cartoon);
define("DESCRIPTION", $summary . ' A silly joke for little kids from Giraffian.');
include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php';
?>

<h1 class="indent"><img alt="" src="/images/joke-icon.png">Jokes for little kids</h1>

<div class="listitem">
<?php echo nl2br(htmlspecialchars(trim($text))); ?>
<?php if ($cartoon): ?>
<p><img src="<?php echo $cartoon; ?>" alt="Cartoon for this joke"></p>
<?php endif; ?>
</div>

<div id="booknav">
<ul>
<li><a class="button yellow" href="/jokes/<?php echo $prev; ?>/">Prev</a></li>
<li><a class="button aqua" href="/jokes/<?php echo $random; ?>/">Random joke</a></li>
<li><a class="button purple" href="/jokes/<?php echo $next; ?>/">Next</a></li>
<li><a class="button grey" href="/jokes/">All jokes</a></li>
</ul>
</div>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
