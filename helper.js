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

// Creates a new array of given size using the fastest format
// This used tobe Float32Array, but a standard array is much faster
function createArray(size) {
    return new Array(size)
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

