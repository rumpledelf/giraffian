<?php define("TITLE","Sort by size");?>
<?php include '/var/www/giraffian/includes/header.php'; ?>

<h1 class="center">Sort by size</h1>
<p class="center">
Click and hold on the images and drag them into the right order - from smallest to largest.
</p>
<br />
<script language="JavaScript">
<!--
var isdrag=false;
var x=0,y=0;
var tx=0,ty=0;
var dobj;

var leftlimits = {'flower2':-28, 'flower4':-132, 'flower1':-236, 'flower3':-340,};

var snaps = [0+28, 104+28, 208+28, 312+28];

var positions = ["flower2","flower4","flower1","flower3"];

function movemouse(e)
{
  if (isdrag)
  {
    if (!e) e = window.event;

    var limit = tx + e.clientX - x;
     var leftside=leftlimits[dobj.name];

    if (limit < leftside) limit = leftside;
    else if (limit > (leftside+368)) limit = leftside+368;
    dobj.style.left = limit + "px";

    limit  = ty + e.clientY - y ;
    if (limit < -130) limit = -130;
    else if (limit > 80) limit = 80;
    dobj.style.top  = limit + "px";

    return false;
  }
}


function dodrop(e)
{
  if (isdrag)
  {
    if (!e) e = window.event;

    isdrag = false;

    // snapping code here

    dobj.style.top  = "0px";

    var limit = tx + e.clientX - x;
    var leftside=leftlimits[dobj.name];

    limit -= leftside;

    var newindex;

    if (limit < (snaps[0]+snaps[1]) /2) newindex = 0;
    else if (limit < (snaps[1]+snaps[2])/2) newindex = 1;
    else if (limit < (snaps[2]+snaps[3])/2) newindex = 2;
    else limit = newindex = 3;

    movedown(newindex,dobj.name);
  }
}
function movedown(index,name)
{
var fobj;
// index is where you've dropped the flower
// name is the flower being dropped

var oldindex = 0;
for (i=0;i<4;i++){
  if (positions[i] == name) oldindex = i;
}

if (index > oldindex)
{
// move left
for (i=oldindex;i<index;i++)
  {
   positions[i] = positions[i+1];
  }
  positions[index] = name;
}
else
{
// move right
for (i=oldindex;i>index;i--)
  {
   positions[i] = positions[i-1];
  }
  positions[index] = name;
}

// updates screen from array
for (i=0;i<4;i++)
{
    fobj = document.getElementById(positions[i]);
    fobj.style.left = snaps[i] + leftlimits[positions[i]] + "px";
}

// update text at the bottom
fobj = document.getElementById("fcaption");

if (positions[0] == "flower1" &&
    positions[1] == "flower2" &&
    positions[2] == "flower3" &&
    positions[3] == "flower4" )
  {
  fobj.innerHTML = "These flowers are sorted from left to right! <img src=\"/images/tick-small.png\">";
  }
else if (positions[3] == "flower1" &&
         positions[2] == "flower2" &&
         positions[1] == "flower3" &&
         positions[0] == "flower4" )
         {
         fobj.innerHTML = "These flowers are sorted from right to left! <img src=\"/images/tick-small.png\">";
          }
else fobj.innerHTML = "These flowers are in the wrong order. <img src=\"/images/cross-small.png\">";
}
function selectmouse(e)
{
 if (!e) e = window.event;
 var fobj;

 if (e.target) fobj = e.target;
 else if (e.srcElement) fobj = e.srcElement;

  var topelement = "BODY";

  while (fobj.tagName != topelement && fobj.className != "dragme")
  {
    fobj = fobj.parentElement;
  }

  if (fobj.className=="dragme")
  {
    isdrag = true;
    dobj = fobj;
    tx = parseInt(dobj.style.left+0);
    ty = parseInt(dobj.style.top+0);
    x = e.clientX;
    y = e.clientY;
    document.onmousemove=movemouse;
    return false;
  }
}

document.onmousedown=selectmouse;
document.onmouseup=dodrop;

</script>

<div class="center">
<div style="margin-left: auto; margin-right: auto; background: url(/images/sortsize/shelf.png); background-repeat:no-repeat; width: 620px;";>
<img id="flower2" src="/images/sortsize/pinkflower2.png" name="flower2" class="dragme" style="position:relative;">
<img id="flower4"src="/images/sortsize/pinkflower4.png" name="flower4" class="dragme" style="position:relative;">
<img id="flower1" src="/images/sortsize/pinkflower1.png" name="flower1" class="dragme" style="position:relative;">
<img id="flower3" src="/images/sortsize/pinkflower3.png" name="flower3" class="dragme" style="position:relative;">
</div>
</div>
<br />
<div class="center" id="fcaption">These flowers are in the wrong order. <img src="/images/cross-small.png"></div>
<br />
<p class="center"><small><em>You may need to turn your phone sideways to view this properly</em></small></p>
<?php include '/var/www/giraffian/includes/footer.php'; ?>
