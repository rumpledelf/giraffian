<?php define("TITLE","Shapes and colors");?>
<?php define("DESCRIPTION", "An interactive shapes and colours game for young children: pick a shape, pick a colour and learn the names of both.");?>
<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/header.php'; ?>

<h1 class="center">Shapes and Colors</h1>

<p class="center">Click the shapes and colors on the sides to play!</p>

<script language="javascript">
  function setShape(shape){ 
	  document.images.canvas.src="/kids/shapes-images/big" + shape + ".png";
	  document.getElementById("WordShape").innerHTML = "&nbsp;" + shape;
  }
  function setColour(colour){
	document.getElementById("WordColour").innerHTML = colour;
	if (colour == "Green") colour = "lime";
	else if (colour == "Grey") colour = "gray";
	document.images.canvas.style.backgroundColor = colour;
  }
</script>

<table width="100%" cellpadding="0" cellspacing="0">
 <tr>
   <td style="text-align:center;" width: "10%" id="colleft">
   <ul>
      <li><a href="javascript:setShape('Triangle')">
      <img alt="Triangle" src="/kids/shapes-images/triangle.png"></a></li>
      <li><a href="javascript:setShape('Circle')">
      <img alt="Circle" src="/kids/shapes-images/circle.png"></a></li>
      <li><a href="javascript:setShape('Square')">
      <img alt="Square" src="/kids/shapes-images/square.png"></a></li>
      <li><a href="javascript:setShape('Star')">
      <img alt="Star" src="/kids/shapes-images/star.png"></a></li>
      <li><a href="javascript:setShape('Pentagon')">
      <img alt="Pentagon" src="/kids/shapes-images/pentagon.png"></a></li>
      <li><a href="javascript:setShape('Hexagon')">
      <img alt="Hexagon" src="/kids/shapes-images/hexagon.png"></a></li>
      <li><a href="javascript:setShape('Octagon')">
      <img alt="Octagon" src="/kids/shapes-images/octagon.png"></a></li>
      <li><a href="javascript:setShape('Diamond')">
      <img alt="Diamond" src="/kids/shapes-images/diamond.png"></a></li>
      <li><a href="javascript:setShape('Rectangle')">
      <img alt="Rectangle" src="/kids/shapes-images/rectangle.png"></a></li>
      <li><a href="javascript:setShape('Oval')">
      <img alt="Oval" src="/kids/shapes-images/oval.png"></a></li>
      <li><a href="javascript:setShape('Trapezium')">
      <img alt="Trapezium" src="/kids/shapes-images/trapezium.png"></a></li>
      <li><a href="javascript:setShape('Parallelogram');">
      <img alt="Parallelogram" src="/kids/shapes-images/parallelogram.png"></a></li>
   </ul>
   </td>
<!--------------------------------------Center column-->
<td style="text-align:center;" width="80%">
  <IMG src="/kids/shapes-images/bigCircle.png" name="canvas" width="400" height="400" border="0">
  <div style="font-weight: bold; font-size: 28px;">
    <div style="display: inline-block; width: 49%%; text-align:right;" id="WordColour">White</div>
    <div style="display: inline-block;text-align:left;"id="WordShape">&nbsp;Circle</div>
    <p>&nbsp;</p>
  </div>
</td>
<!----------------------------------End Center column-->
<td width="10%" id="colright">
<ul>
  <li><a href="javascript:setColour('Red')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: red; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Orange')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Orange; border: 2px solid #000000; margin:2px;"></a></li>
  <li><a href="javascript:setColour('Pink')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Pink; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Yellow')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Yellow; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Green')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Lime; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Aqua')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Aqua; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Blue')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Blue; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Purple')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Purple; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('Grey')">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: Gray; border: 2px solid #000000; margin:1px;"></a></li>
  <li><a href="javascript:setColour('White');">
  <img alt="" src="/kids/shapes-images/colour.png" width="35" height="35" style="background-color: White; border: 2px solid #000000; margin:1px;"></a></li>
</ul>
  </td>
  </tr>
</table>

<br />
<br />

<?php include $_SERVER['DOCUMENT_ROOT'] . '/includes/footer.php'; ?>
