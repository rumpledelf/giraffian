<?php include '/var/www/giraffian/includes/header.html'; ?>
<?php include '/var/www/giraffian/includes/pagination.php'; ?>

<h1>Funny things kids say</h1>

<p><img class="leftimage" src="/images/talkingchild-sm.png">Here is the full list of funny quotes. These sayings come from the kids at my local school, reader submissions and aggregated from all over the Internet.</p>
<div>&nbsp;</div>
<?php
	$param = $_GET['page'];
	if (!is_numeric($param)) $param = 0;
	paginate('/var/www/giraffian/quotes',$param);
?>

<?php include '/var/www/giraffian/includes/footer.html'; ?>
