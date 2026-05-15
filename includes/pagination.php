<?php
// pretend this file is a Very Complex Library of content handling functions 

function renderfile($filename) {
	echo "<div class=\"listitem\">\n";
	echo nl2br(file_get_contents($filename));
	echo "</div>\n";
}

function getfiles($folder) {
	$files = scandir($folder);
	$items = array();

	foreach ($files as $file) {
		if ($file !== '.' && $file !== '..' && $file !== 'index.php') {
			$items[] = $file;
		}
	}

	return $items;
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
		renderfile($folder.'/'.$files[$x]);
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
		renderfile($folder.'/'.$files[$i]);
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
