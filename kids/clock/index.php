<?php define("TITLE","Learn to tell the time on an analogue clock");?>
<?php include '/var/www/giraffian/includes/header.php'; ?>

<h1 class="center">Learn to tell the time on an analogue clock</h1>

<p class="center">
<img src="." class="clock" name="clock" width="300" height="300">
</p>
<script language="javascript">
hours = Math.floor((Math.random()*12))+1;
minutes = (Math.floor((Math.random()*12)))*5;
document.images.clock.src="/kids/clock-images/clockface.php?hours=" + hours + "&minutes=" + minutes;

function reSeedTime(){
	hours = Math.floor((Math.random()*12))+1;
	minutes = (Math.floor((Math.random()*12)))*5;
	document.images.clock.src="/kids/clock-images/clockface.php?hours=" + hours + "&minutes=" + minutes;
	document.getElementById("thedigitime").innerHTML = "&nbsp";
	document.getElementById("thetime").innerHTML = "&nbsp";
}

function showTime(){
if (minutes > 5){
	document.getElementById("thedigitime").innerHTML = "or " + hours + ":" + minutes +" on a digital clock.";
	}
else {
	document.getElementById("thedigitime").innerHTML = "or " + hours + ":0" + minutes +" on a digital clock.";
}
	last="";
	first="";
if (minutes==0){
	switch(hours){
		case 1: last = "One";break;
		case 2: last = "Two";break;
		case 3: last = "Three";break;
		case 4: last = "Four";break;
		case 5: last = "Five";break;
		case 6: last = "Six";break;
		case 7: last = "Seven";break;
		case 8: last = "Eight";break;
		case 9: last = "Nine";break;
		case 10: last = "Ten";break;
		case 11: last = "Eleven";break;
		case 12: last = "Twelve";break;
	}
document.getElementById("thetime").innerHTML = "The time is: " + last + " O'Clock,";
}
else{
	if (minutes <= 30) {
		fill = " past ";
		}
	else {
		fill = " to ";
		hours++;
		if (hours==13) { hours = 1;}
		}
	switch(hours){
		case 1: last = "one,";break;
		case 2: last = "two,";break;
		case 3: last = "three,";break;
		case 4: last = "four,";break;
		case 5: last = "five,";break;
		case 6: last = "six,";break;
		case 7: last = "seven,";break;
		case 8: last = "eight,";break;
		case 9: last = "nine,";break;
		case 10: last = "ten,";break;
		case 11: last = "eleven,";break;
		case 12: last = "twelve,";break;
	}
	switch(minutes){
		case 55:
		case 5: first = "Five";break;
		case 50:
		case 10: first = "Ten";break;
		case 45:
		case 15: first = "Quarter";break;
		case 40:
		case 20: first = "Twenty";break;
		case 35:
		case 25: first = "Twenty-five";break;
		case 30: first = "Half";break;
	}
	document.getElementById("thetime").innerHTML = "The time is: " + first + fill + last;
	}
}
</script>

<h2 class="center">What time is this?</h2>

<p class="center"><a class="coral button" href="javascript:showTime();">Tell me the time!</a></p>
<p class="center">
<span id="thetime">&nbsp</span><br>
<span id="thedigitime">&nbsp</span>
</p>
<p class="center">
<a href="/kids/clock">Another random time!</a> 
</p>

<?php include '/var/www/giraffian/includes/footer.php'; ?>

