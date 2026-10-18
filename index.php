<?php define("TITLE","Home");?>
<?php define("DESCRIPTION", "Free activities for young kids: online picture books, printable crafts and colouring pages, ad-free puzzle games, jokes for little kids, and a pregnancy comic for parents.");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/pagination.php'; ?>

<h1>Giraffian kid's stuff</h1>

<div class="tile">
<a href="/comic/"><img src="/comic/images/weealot.png" alt="Parenting comic preview"></a>
<h2><a href="/comic/">Parenting comic</a></h2>
<p>A pregnancy and parenting comic.</p>
</div>

<div class="tile">
<a href="/kids/books/"><img alt="Alphabet book cover" src="/images/alphacover.png"></a>
<h2><a href="/kids/books/">Online books</a></h2>
<p>Online books for small children.</p>
</div>

<div class="tile">
<a href="/games/"><img src="/images/thumb-games.svg" alt="Games preview"></a>
<h2><a href="/games/">Games</a></h2>
<p>Ad-free, relaxing logic and pattern-matching puzzles for kids and parents alike.</p>
</div>


<h1 class="indent"><img alt="" src="/images/joke-icon.png">Jokes for little kids</h1>

<p>Below are 5 random jokes. Refresh the page to see another 5 random jokes, or <a href="/jokes/">see them all</a>.</p>

<?php random5($_SERVER['DOCUMENT_ROOT'] . '/jokes'); ?>
<p class="center"><a href="/jokes/" class="button coral">View all jokes</a></p>

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
