<?php include '/var/www/giraffian/includes/header.html'; ?>
<?php include '/var/www/giraffian/includes/pagination.php'; ?>

<h1>Giraffian kid's stuff</h1>

<div class="tile">
<a href="/comic"><img src="/comic/images/weealot.png"</a>
<h2><a href="/comic">Parenting comic</a></h2>
<p>A pregnancy and parenting comic.</p>
</div>

<div class="tile">
<a href="/kids/books"><img src="/images/alphacover.png"></a>
<h2><a href="/kids/books">Online books</a></h2>
<p>Online books for small children.</p>
</div>

<div class="tile">
<a href="/games"><img src="/images/clockthumb.png"></a>
<h2><a href="/games">Games</a></h2>
<p>Simple games to play with your child.</p>
</div>


<h1 class="indent"><img src="/images/joke-icon.png">Jokes for little kids</h1>

<p>Below are 5 random jokes. Refresh the page to see another 5 random jokes, or <a href="/jokes">see them all</a>.</p>

<?php random5('/var/www/giraffian/jokes'); ?>
<p class="center"><a href="/jokes" class="button coral">View all jokes</a></p>

<?php include '/var/www/giraffian/includes/footer.html'; ?>
