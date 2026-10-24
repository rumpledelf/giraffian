<?php
// pretend this file is a Very Complex Library of content handling functions 

function renderfile($filename, $link = null) {
	echo "<div class=\"listitem\">\n";
	echo nl2br(file_get_contents($filename));
	if ($link) echo "\n<p class=\"permalink\"><a href=\"" . htmlspecialchars($link) . "\">Share this joke</a></p>";
	echo "</div>\n";
}

function getfiles($folder) {
	$items = array();

	foreach (scandir($folder) as $file) {
		if (str_ends_with($file, '.txt')) {
			$items[] = $file;
		}
	}

	return $items;
}

// Joke text without Q:/A: labels, knock-knock call and response or (asides)
function jokelines($text) {
	$lines = array();
	foreach (preg_split('/\R/', trim($text)) as $line) {
		$line = trim(preg_replace('/^(Q|A)\s*[:.]\s*/i', '', trim($line)));
		if ($line === '' || preg_match('/^\(.*\)$/', $line)) continue;
		if (preg_match("/^(knock,? knock[.!]*|who(\W?s|se| is)? there\W*)$/iu", $line)) continue;
		$lines[] = $line;
	}
	return $lines;
}

function isknockknock($text) {
	return (bool) preg_match('/^\W*knock,? knock/i', trim($text));
}

// Each joke's page lives at /jokes/<slug>/, slugged from its opening line
function jokeslugs($folder) {
	static $cache = array();
	if (isset($cache[$folder])) return $cache[$folder];

	$slugs = array();
	foreach (getfiles($folder) as $file) {
		$text = file_get_contents($folder . '/' . $file);
		// Opening line only, so the address never gives away the punchline
		$words = preg_split('/[^a-z0-9]+/', strtolower(str_replace(["'", '’'], '', jokelines($text)[0] ?? '')), -1, PREG_SPLIT_NO_EMPTY);
		$base = implode('-', array_slice($words, 0, 10)) ?: 'joke';
		if (isknockknock($text)) $base = 'knock-knock-' . $base;
		$slug = $base;
		for ($n = 2; isset($slugs[$slug]); $n++) $slug = $base . '-' . $n;
		$slugs[$slug] = $file;
	}
	return $cache[$folder] = $slugs;
}

function itemlink($folder, $file) {
	if (basename($folder) !== 'jokes') return null;
	$slug = array_search($file, jokeslugs($folder), true);
	return $slug === false ? null : '/jokes/' . $slug . '/';
}

function random5($folder) {
	$files = getfiles($folder);
	$total = count($files);

	if ($total === 0) {
		return;
	}

	shuffle($files);
	$limit = min(5, $total);

	for ($x = 0; $x < $limit; $x++):
		renderfile($folder.'/'.$files[$x], itemlink($folder, $files[$x]));
	endfor;
}

function paginate($folder, $page) {
	$files = getfiles($folder);
	$total = count($files);

	if ($total === 0) {
		echo "No items to show.";
		return;
	}

	$page = max(0, (int) $page);
	$last = (int) floor(($total - 1) / 20);
	if ($page > $last) {
		$page = $last;
	}

	$next = $page + 1;
	$prev = $page - 1;
	$start = $page * 20;
	$end = min($start + 20, $total);

	echo "Showing ".($start+1)." to ".$end." of ".$total;

	for ($i=$start; $i<$end; $i++):
		renderfile($folder.'/'.$files[$i], itemlink($folder, $files[$i]));
	endfor;

	echo "<div id=\"booknav\">\n<ul>\n";
	if ($page != 0) {
		echo "<li><a class=\"button coral\" href=\"?page=0\">First</a></li>\n";
		echo ("<li><a class=\"button yellow\" href=\"?page=".$prev."\">Prev</a></li>\n");
	}
	for ($i=($page-2); $i < ($page+3); $i++):
		if (($i > 0) && ($i <= $last) && ($i != $page)) {
			echo "<li><a class=\"button aqua\" href=\"?page=".$i."\">".($i+1)."</a></li>\n";
		}
		if ($i == $page) { echo "<li class=\"current\"><span class=\"button blue\">".($i+1)."</span></li>\n"; }
	endfor;

	if ($page != $last) {
		echo ("<li><a class=\"button purple\" href=\"?page=".$next."\">Next</a></li>\n");
		echo "<li><a class=\"button grey\" href=\"?page=".$last."\">Last</a></li>\n";
	}
	echo "</ul></div>\n";
}
?>
