<?php define("TITLE","Jokes for little kids");?>
<?php define("DESCRIPTION", "Hundreds of silly jokes for little kids, simple enough for young children to tell (and for parents to groan at).");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/pagination.php'; ?>

<h1 class="indent"><img alt="" src="/images/joke-icon.png">Jokes for little kids</h1>

<?php
	$param = $_GET['page'] ?? 0;
	if (!is_numeric($param)) $param = 0;
	paginate($_SERVER['DOCUMENT_ROOT'] . '/jokes',$param);
?>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
