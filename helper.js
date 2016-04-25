"use strict";

/**
    Just some handy global functions.
    
    By Matthew Aitchison
    2016/04/25

    Please feel free to copy / use the code as you see fit.
        
*/

// This just gives me a basic string.format 
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
              ? args[number]
              : match
            ;
        });
    };
}

// Creates a new array of given size using the fastest format, and zeros the data.
// This used tobe Float32Array, but a standard array is much faster
function createArray(size) {
    var result = new Array(size);
    for (var i = 0; i < size; i++)
        result[i] = 0;
    return result;
}

// Functions to convert rgb to hex color string (from stackoverflow):
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Convert page coordinates to canvas coordinates:
function pageToCanvas(pageX, pageY, canvas) {
    var canvasX = pageX - canvas.offsetLeft;
    var canvasY = pageY - canvas.offsetTop;
    // this simple subtraction may not work when the canvas is nested in other elements
    return { x: canvasX, y: canvasY };
}

function clip(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}

// Fetches an XML document
// Will block execution till file loads.  30 second timeout, after which null is returned.  Really bad idea 'busy sleep'.
function fetch(filename) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            myFunction(xhttp);
        }
    };
    var xmlDoc = null;

    function myFunction(xml) {
        xmlDoc = xml.responseXML;     
    }

    xhttp.open("GET", filename, true);
    xhttp.send();

    startTime = new Date().getTime();

    while (xmlDoc == null) {
        elapsed = (new Date().getTime()-startTime) / 1000; 
        console.log("waiting {0} ".format(elapsed.toFixed(1)));
        if (elapsed > 10) {
            window.alert("Timeout");
            return null;
        }
    }

    return xmlDoc;

    
}

// Serializes an array of floats to a (quite long) string.
// optional RLE compression.
function serialize(data, compress) {
    if (compress == null) compress == true;
    var len = data.length;
    var stringData = []
    var lastValue = data[0];
    if (lastValue == null) lastValue = 0;

    var runlength = 0;

    function write(value, length) {
        
        // write the value.
        if (length > 1)
            stringData.push(value.toString() + ":" + length.toString())
        else
            stringData.push(value.toString())        
    }

    for (var i = 1; i < len; i++) {

        runlength++;

        var value = data[i];
        // not sure why, but I'm getting undefinied in my array for some reason?
        if (value == null) value = 0;

        if (!compress || value != lastValue || i == (len - 1)) {
            write(lastValue, runlength);
            runlength = 0;
        }
        lastValue = value;
    }

    // write the final byte.
    if (runlength >= 1)
        write(lastValue, runlength);

    return stringData.join(",");
}

// Deserializes a string into an array of floats.
function deserialize(dataString) {
    var stringParts = dataString.split(",");
    var len = stringParts.length;
    var data = []
    for (var i = 0; i < len; i++) {
        var entry = stringParts[i].split(':');
        var value = Number(entry[0]);
        if (entry.length == 2)
            var count = entry[1]
        else 
            var count = 1;
        for (var j = 0; j < count; j++)
            data.push(value);        
    }    
    return data;
}

// -------------------------------------------------------------
// Mouse stuff
// -------------------------------------------------------------

function doMouseDown(e) {
    mouse.isButtonDown = true;
}

function doMouseUp(e) {
    mouse.isButtonDown = false;
}

function doMouseMove(e) {
    e.preventDefault();
    var canvasLoc = pageToCanvas(e.pageX, e.pageY, canvas);
    mouse.x = canvasLoc.x;
    mouse.y = canvasLoc.y;    
}

var mouse = {
    x: 0,
    y: 0,
    isButtonDown: false
}


// -------------------------------------------------------------
// Keyboard stuff
// -------------------------------------------------------------

// track keypresses.
function doKeyDown(e) {
    var keycode;
    var isShift;
    if (window.event) {
        keycode = window.event.keyCode;
        isShift = !!window.event.shiftKey; // typecast to boolean
    } else {
        keycode = ev.which;
        isShift = !!ev.shiftKey;
    }
    key.shift = isShift;    
}

// track keypresses.
function doKeyUp(e) {
    var keycode;
    var isShift;
    if (window.event) {
        keycode = window.event.keyCode;
        isShift = !!window.event.shiftKey; // typecast to boolean
    } else {
        keycode = ev.which;
        isShift = !!ev.shiftKey;
    }
    key.shift = isShift;
}

var key = {
    shift: false,
    crtl: false
}

// Hooks.    
var canvas = document.getElementById('theCanvas');
canvas.addEventListener('mousedown', doMouseDown, false);
canvas.addEventListener('mousemove', doMouseMove, false);
document.body.addEventListener('mouseup', doMouseUp, false);	// button release could occur outside canvas
document.body.addEventListener('mousemove', doMouseMove, false);	
canvas.addEventListener('touchstart', doMouseDown, false);
canvas.addEventListener('touchmove', doMouseMove, false);
document.body.addEventListener('touchend', doMouseUp, false);

document.body.addEventListener('keydown', doKeyDown, false);
document.body.addEventListener('keyup', doKeyUp, false);

