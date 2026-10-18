<?php define("TITLE","Bad Baby Names");?>
<?php define("DESCRIPTION", "Some people give their children terrible names. A collection of the worst baby names people have actually used.");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/pagination.php'; ?>

<h1>Bad Baby Names</h1>

<p>Some people give their children terrible names. Here is a small collection of some of them.</p>
<?php
	$param = $_GET['page'] ?? 0;
	if (!is_numeric($param)) $param = 0;
	paginate($_SERVER['DOCUMENT_ROOT'] . '/badbabynames',$param);
?>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
