<?php
$sitename = "Giraffian kid's stuff";
$siteurl = "https://giraffian.com";

// Page name first so search results show what the page is, then the site
$pagetitle = defined('TITLE') && TITLE !== 'Home' ? TITLE . " | Giraffian" : $sitename;
$pagedescription = defined('DESCRIPTION') ? DESCRIPTION : '';

// Canonical: https, no index.php, directories end in a slash, only ?page survives (and not on the home page)
$canonicalpath = preg_replace('#/index\.php$#', '/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (!str_ends_with($canonicalpath, '/') && is_dir($_SERVER['DOCUMENT_ROOT'] . $canonicalpath)) $canonicalpath .= '/';
$canonical = $siteurl . $canonicalpath;
if ($canonicalpath !== '/' && isset($_GET['page']) && ctype_digit((string)$_GET['page']) && $_GET['page'] > 0) $canonical .= '?page=' . $_GET['page'];
?>