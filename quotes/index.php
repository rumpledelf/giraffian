<?php define("TITLE","Funny things kids say");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/pagination.php'; ?>

<h1>Funny things kids say</h1>

<p><img class="leftimage" src="/images/talkingchild-sm.png">Here is the full list of funny quotes. These sayings come from the kids at my local school, reader submissions and aggregated from all over the Internet.</p>
<div>&nbsp;</div>
<?php
	$param = $_GET['page'] ?? 0;
	if (!is_numeric($param)) $param = 0;
	paginate($_SERVER['DOCUMENT_ROOT'] . '/quotes',$param);
?>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
