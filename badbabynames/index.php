<?php global $title = "Bad Baby Names";?>
<?php include '/var/www/giraffian/includes/header.php'; ?>
<?php include '/var/www/giraffian/includes/pagination.php'; ?>

<h1>Funny things kids say</h1>

<p>Some people give their children terrible names. Here is a small collection of some of them.</p>
<?php
	$param = $_GET['page'];
	if (!is_numeric($param)) $param = 0;
	paginate('/var/www/giraffian/badbabynames',$param);
?>

<?php include '/var/www/giraffian/includes/footer.php'; ?>
