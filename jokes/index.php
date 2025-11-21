<?php include '/var/www/giraffian/includes/header.php'; ?>
<?php include '/var/www/giraffian/includes/pagination.php'; ?>

<h1 class="indent"><img src="/images/joke-icon.png">Jokes for little kids</h1>

<?php
	$param = $_GET['page'];
	if (!is_numeric($param)) $param = 0;
	paginate('/var/www/giraffian/jokes',$param);
?>

<?php include '/var/www/giraffian/includes/footer.php'; ?>
