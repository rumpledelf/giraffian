<?php
function translate_point(&$x,&$y,$angle,$about_x,$about_y)
{
    $x -= $about_x;
    $y -= $about_y;
    $angle = ($angle / 180) * M_PI;
/* math:
[x2,y2] = [x,  *  [[cos(a),-sin(a)],
           y]      [sin(a),cos(a)]]
==>
x = x * cos(a) + y*sin(a)
y = x*-sin(a) + y*cos(a)
*/

    $new_x = $x * cos($angle) - $y * sin($angle);
    $new_y = $x * sin($angle) + $y * cos($angle);
    $x = $new_x+ $about_x ;
    $y = $new_y + $about_y;
}

function translate_poly($point_array, $angle, $about_x, $about_y)
{
    $translated_poly = Array();
    while(count($point_array) > 1)
    {
        $temp_x = array_shift($point_array);
        $temp_y = array_shift($point_array);
        translate_point($temp_x, $temp_y, $angle, $about_x, $about_y);
        array_push($translated_poly, $temp_x);
        array_push($translated_poly, $temp_y);
    }
    return $translated_poly;
}

// create the background
//$image = imagecreate(200, 200);
$image = imagecreatefrompng("clock.png");
imagealphablending ($image,TRUE);
imageantialias($image, TRUE);

// fill the background color
$bg = imagecolorallocate($image, 255, 255, 255);

// choose a color for the polygon
$col_poly = imagecolorallocate($image, 0, 0, 0);
$col_lpurple = imagecolorallocate($image, 222, 173, 239);
$col_dpurple = imagecolorallocate($image, 165, 82, 206);

// array for big hand, pointing up
$bighand = array (
        150, 25,
        140, 137,
        160, 137
    );

// array for little hand, pointing up
$littlehand = array (
        150, 75,
        140, 137,
        160, 137
    );

// need to change this to user input
$hours=$_GET['hours'];
if (!is_numeric($hours)) {$hours = 12;}
if ($hours < 1) {$hours = 12;}
else if ($hours > 12) {$hours = 12;}
$minutes=$_GET['minutes'];
if (!is_numeric($minutes)) {$minutes = 0;}
if ($minutes < 0) {$minutes = 0;}
else if ($minutes > 59) {$minutes = 0;}


$bigangle = ($minutes*6);
$littleangle = ($hours*30)+($minutes/2);
	
$newbighand = translate_poly($bighand, $bigangle, 150, 150);
$newlittlehand = translate_poly($littlehand, $littleangle, 150, 150);
	
// draw the big hand 
imagefilledpolygon($image, $newbighand,3,$col_dpurple);
imagepolygon($image, $newbighand,3,$col_poly);

// draw the little hand 
imagefilledpolygon($image, $newlittlehand,3,$col_lpurple);
imagepolygon($image, $newlittlehand,3,$col_poly);

// output the picture
header("Content-type: image/png");
imagepng($image);

?> 