<?php define("TITLE","Count on your fingers");?>
<?php define("DESCRIPTION", "An interactive counting activity for young children: how many fingers are the hands holding up?");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<h1 class="center">Count on your fingers</h1>

<script language=javascript>
function setleft(number){
    var leftnumber = number - 5;
    document.images.handsleft.src="/kids/hands-images/hands" + leftnumber + "l" + ".png";
    document.images.handsright.src="/kids/hands-images/hands5r.png";
    document.getElementById("numfingers").innerHTML = "The hands are holding up " + number + " fingers.";
}
function setright(number){
    document.images.handsright.src="/kids/hands-images/hands" + number + "r" + ".png";
    document.images.handsleft.src="/kids/hands-images/hands0l.png";
    var fingerstr;

    if (number == 0) fingerstr = "The hands aren't holding up any fingers.";
    else if (number == 1) fingerstr = "The hands are holding up one finger.";
    else fingerstr = "The hands are holding up " + number + " fingers.";

    document.getElementById("numfingers").innerHTML = fingerstr;
}
</script>
<p class="center">
Learn to count on your fingers. Click on a number to see what your hands look like holding up that many fingers.
</p>
<p class="center">
<img alt="" class="handimgleft" id="handsleft" src="/kids/hands-images/hands0l.png"><img alt="" class="handimgright" id="handsright" src="/kids/hands-images/hands0r.png">
</p>
<br />
<div class="center" id="numfingers">&nbsp</div>
<br />
<p class="center">
<a class="handnav" href="javascript:setright('0')"><img alt="Zero fingers" src="/kids/hands-images/zero.png"></a>
<a class="handnav" href="javascript:setright('1')"><img alt="One finger" src="/kids/hands-images/one.png"></a>
<a class="handnav" href="javascript:setright('2')"><img alt="Two fingers" src="/kids/hands-images/two.png"></a>
<a class="handnav" href="javascript:setright('3')"><img alt="Three fingers" src="/kids/hands-images/three.png"></a>
<a class="handnav" href="javascript:setright('4')"><img alt="Four fingers" src="/kids/hands-images/four.png"></a>
<a class="handnav" href="javascript:setright('5')"><img alt="Five fingers" src="/kids/hands-images/five.png"></a>
<a class="handnav" href="javascript:setleft('6')"><img alt="Six fingers" src="/kids/hands-images/six.png"></a>
<a class="handnav" href="javascript:setleft('7')"><img alt="Seven fingers" src="/kids/hands-images/seven.png"></a>
<a class="handnav" href="javascript:setleft('8')"><img alt="Eight fingers" src="/kids/hands-images/eight.png"></a>
<a class="handnav" href="javascript:setleft('9')"><img alt="Nine fingers" src="/kids/hands-images/nine.png"></a>
<a class="handnav" href="javascript:setleft('10')"><img alt="Ten fingers" src="/kids/hands-images/ten.png"></a>
</p>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
