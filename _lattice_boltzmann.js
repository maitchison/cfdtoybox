"use strict";

/**
    Latice Boltzmann Fluid Dynamics simulation
    
    Make sure to include 
        helper.js
        LBEDefaultSolver    

*/

var PlotType = {
    DENSITY: 0,
    SPEED: 3,
    CURL: 4
};                

// Config variables:
var config  = {
    
    // steps per draw (affects presentation speed of simulation)
    steps: 100,
    
    // speed fluid travels at   
    speed: 0.1,
    
    // the viscosity of the fluid
    viscosity: 0.020,       
    
    contrast: 1.0,
    pxPerSquare:4,
    plotSelect:4,
    barrierTemplate:6,
    
    tracers:false,
    flowline:false,
    sensor:false,
    showForce:true
};

// Used to present results.
var ui = {
    // the label to display drag force on
    dragLabel: null
};

if (mobile) config.pxPerSquare = 10; // downsample more on mobile platforms

// Global variables:	
var mobile = navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i)
var canvas = document.getElementById('theCanvas');
var context = canvas.getContext('2d');
var image = context.createImageData(canvas.width, canvas.height);		// for direct pixel manipulation (faster than fillRect)
for (var i=3; i<image.data.length; i+=4) image.data[i] = 255;			// set all alpha values to opaque
                                                // width of plotted grid site in pixels
var xdim = canvas.width / config.pxPerSquare;			// grid dimensions for simulation
var ydim = canvas.height / config.pxPerSquare;

var startButton = document.getElementById('startButton');    
var mouseSelect = document.getElementById('mouseSelect');

var speedReadout = document.getElementById('speedReadout');
var dataSection = document.getElementById('dataSection');
var dataArea = document.getElementById('dataArea');
var dataButton = document.getElementById('dataButton');
var running = false;						// will be true when running
var stepCount = 0;
var startTime = 0;
var four9ths = 4.0 / 9.0;					// abbreviations
var one9th = 1.0 / 9.0;
var one36th = 1.0 / 36.0;
var barrierCount = 0;
var barrierxSum = 0;
var barrierySum = 0;
var barrierFx = 0.0;						// total force on all barrier sites
var barrierFy = 0.0;
var sensorX = xdim / 2;						// coordinates of "sensor" to measure local fluid properties	
var sensorY = ydim / 2;
var draggingSensor = false;
var mouseIsDown = false;
var mouseX, mouseY;							// mouse location in canvas coordinates
var oldMouseX = -1, oldMouseY = -1;			// mouse coordinates from previous simulation frame
var collectingData = false;
var time = 0;								// time (in simulation step units) since data collection started
var showingPeriod = false;
var lastBarrierFy = 1;						// for determining when F_y oscillation begins
var lastFyOscTime = 0;						// for calculating F_y oscillation period

// start with a solver
var solver = new LBESolver_flat(xdim, ydim);

canvas.addEventListener('mousedown', mouseDown, false);
canvas.addEventListener('mousemove', mouseMove, false);
document.body.addEventListener('mouseup', mouseUp, false);	// button release could occur outside canvas
canvas.addEventListener('touchstart', mouseDown, false);
canvas.addEventListener('touchmove', mouseMove, false);
document.body.addEventListener('touchend', mouseUp, false);


// Initialize barriers
placePresetBarrier(config.barrierTemplate)

// Set up the array of colors for plotting (mimicks matplotlib "jet" colormap):
// (Kludge: Index nColors+1 labels the color used for drawing barriers.)
var nColors = 400;							// there are actually nColors+2 colors
var hexColorList = new Array(nColors+2);
var redList = new Array(nColors+2);
var greenList = new Array(nColors+2);
var blueList = new Array(nColors+2);
for (var c=0; c<=nColors; c++) {
    var r, g, b;
    if (c < nColors/8) {
        r = 0; g = 0; b = Math.round(255 * (c + nColors/8) / (nColors/4));
    } else if (c < 3*nColors/8) {
        r = 0; g = Math.round(255 * (c - nColors/8) / (nColors/4)); b = 255;
    } else if (c < 5*nColors/8) {
        r = Math.round(255 * (c - 3*nColors/8) / (nColors/4)); g = 255; b = 255 - r;
    } else if (c < 7*nColors/8) {
        r = 255; g = Math.round(255 * (7*nColors/8 - c) / (nColors/4)); b = 0;
    } else {
        r = Math.round(255 * (9*nColors/8 - c) / (nColors/4)); g = 0; b = 0;
    }
    redList[c] = r; greenList[c] = g; blueList[c] = b;
    hexColorList[c] = rgbToHex(r, g, b);
}
redList[nColors+1] = 0; greenList[nColors+1] = 0; blueList[nColors+1] = 0;	// barriers are black
hexColorList[nColors+1] = rgbToHex(0, 0, 0);

// Functions to convert rgb to hex color string (from stackoverflow):
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Initialize array of partially transparant blacks, for drawing flow lines:
var transBlackArraySize = 50;
var transBlackArray = new Array(transBlackArraySize);
for (var i=0; i<transBlackArraySize; i++) {
    transBlackArray[i] = "rgba(0,0,0," + Number(i/transBlackArraySize).toFixed(2) + ")";
}

// Initialize tracers (but don't place them yet):
var nTracers = 144;
var tracerX = new Array(nTracers);
var tracerY = new Array(nTracers);
for (var t=0; t<nTracers; t++) {
    tracerX[t] = 0.0; tracerY[t] = 0.0;
}

var pushing = false;

// Pushing


initFluid();		// initialize to steady rightward flow

// Mysterious gymnastics that are apparently useful for better cross-browser animation timing:
window.requestAnimFrame = (function(callback) {
    return 	window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame || 
        window.oRequestAnimationFrame || 
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1);		// second parameter is time in ms
        };
})();

var lastUpdate = 0;
var lastFPSUpdate = 0;

// Processes user input such as dragging fluid or placing boundaries.
function processInput() 
{
    pushing = false;
    // Test to see if we're dragging the fluid:
    var pushX, pushY, pushUX, pushUY;
        
    if (mouseIsDown && mouseSelect.selectedIndex==2) {
        if (oldMouseX >= 0) {
            var gridLoc = canvasToGrid(mouseX, mouseY);
            pushX = gridLoc.x;
            pushY = gridLoc.y;
            pushUX = (mouseX - oldMouseX) / config.pxPerSquare / config.steps;
            pushUY = -(mouseY - oldMouseY) / config.pxPerSquare /  config.steps;	// y axis is flipped
            if (Math.abs(pushUX) > 0.1) pushUX = 0.1 * Math.abs(pushUX) / pushUX;
            if (Math.abs(pushUY) > 0.1) pushUY = 0.1 * Math.abs(pushUY) / pushUY;
            pushing = true;
        }
        oldMouseX = mouseX; oldMouseY = mouseY;
    } else {
        oldMouseX = -1; oldMouseY = -1;
    }
    
}

// Runs given number of steps in the simulation. 
function runSimulationSteps(steps)
{
    for (var step=0; step<steps; step++) {
        solver.collide();
        solver.stream();
        if (config.tracers) moveTracers();
        if (pushing) push(pushX, pushY, pushUX, pushUY);
        time++;
        if (showingPeriod && (barrierFy > 0) && (lastBarrierFy <=0)) {
            var thisFyOscTime = time - barrierFy/(barrierFy-lastBarrierFy);	// interpolate when Fy changed sign
            if (lastFyOscTime > 0) {
                var period = thisFyOscTime - lastFyOscTime;
                dataArea.innerHTML += Number(period).toFixed(2) + "\n";
                dataArea.scrollTop = dataArea.scrollHeight;
            }
            lastFyOscTime = thisFyOscTime;
        }
        lastBarrierFy = barrierFy;
    }    
    
}

// Paint the canvas:
function paintCanvas() {
    var cIndex = 0;
    var contrast = Math.pow(1.2, Number(config.contrast));
    var plotType = config.plotSelect;
    
    if (plotType == 4) solver.computeCurl();

    var rho = solver.rho;
    var ux = solver.ux;
    var uy = solver.uy;
    var curl = solver.curl;
    var barrier = solver.barrier;

    for (var y = 0; y < ydim; y++) {
        for (var x = 0; x < xdim; x++) {
            if (barrier[x + y * xdim]) {
                cIndex = nColors + 1;	// kludge for barrier color which isn't really part of color map
            } else {
                if (plotType == 0) {
                    cIndex = Math.round(nColors * ((rho[x + y * xdim] - 1) * 6 * contrast + 0.5));
                } else if (plotType == 1) {
                    cIndex = Math.round(nColors * (ux[x + y * xdim] * 2 * contrast + 0.5));
                } else if (plotType == 2) {
                    cIndex = Math.round(nColors * (uy[x + y * xdim] * 2 * contrast + 0.5));
                } else if (plotType == 3) {
                    var speed = Math.sqrt(ux[x + y * xdim] * ux[x + y * xdim] + uy[x + y * xdim] * uy[x + y * xdim]);
                    cIndex = Math.round(nColors * (speed * 4 * contrast));
                } else {
                    cIndex = Math.round(nColors * (curl[x + y * xdim] * 5 * contrast + 0.5));
                }
                if (cIndex < 0) cIndex = 0;
                if (cIndex > nColors) cIndex = nColors;
            }

            colorSquare(x, y, redList[cIndex], greenList[cIndex], blueList[cIndex]);

        }
    }
    context.putImageData(image, 0, 0);

    // Draw tracers, force vector, and/or sensor if appropriate:        
    if (config.tracers) drawTracers();
    if (config.flowline) drawFlowlines();
    if (config.showForce) drawForceArrow(barrierxSum / barrierCount, barrierySum / barrierCount, barrierFx, barrierFy);
    if (config.sensor) drawSensor();

    // Update other UI elements
    if (ui.dragLabel != null) {
        var Fx = barrierFx;
        var Fy = barrierFy;
        ui.dragLabel.innerHTML = Math.sqrt(Fx * Fx + Fy * Fy).toFixed(3);
    }
}


// Simulate function executes a bunch of steps and then schedules another call to itself:
function simulate() 
{
    
    // Que the next frame
    if (running) 
    {
        requestAnimFrame(function() { simulate(); });	// let browser schedule next frame                
    }
        
    var totalStartTime = new Date().getTime();
            
    var stepsPerFrame = Number(config.steps);			// number of simulation steps per animation frame
    
    // Boundaries and input.    
    setBoundaries();    
    processInput()
    
    // Run simulation    
    var simulationStartTime = new Date().getTime();    
    runSimulationSteps(stepsPerFrame)    
    var simulationEndTime = new Date().getTime()
    
    // Draw the canvas    
    var drawStartTime = new Date().getTime();
    paintCanvas();
    var drawEndTime = new Date().getTime()
    
    // Update the fps label.    
    var currentTime = new Date().getTime();
    var totalEndTime = currentTime;
    
    var frameTime = (currentTime - lastUpdate) / 1000;
    
    var drawTime = drawEndTime - drawStartTime;
    var simulationTime = simulationEndTime - simulationStartTime;
    var totalTime = totalEndTime - totalStartTime;    
    
    if (running) 
    {
        stepCount += stepsPerFrame;
        var elapsedTime = (currentTime - startTime) / 1000;	// time in seconds
        if (ui.fpsLabel != null && frameTime > 0 && currentTime > lastFPSUpdate + 1000) 
        {                        
            
            ui.fpsLabel.innerHTML = "{0} draw:{1}ms simulate:{2}ms total:{3}ms".format(
                Number(1/frameTime).toFixed(1),
                Number(drawTime).toFixed(0),
                Number(simulationTime).toFixed(1),
                Number(totalTime).toFixed(0)
            );
                
            lastFPSUpdate = currentTime
        }
    }
    
    var stable = solver.isStable()
    if (!stable) {
        window.alert("The simulation has become unstable due to excessive fluid speeds.");
        this.startStop();
        this.initFluid();
    }    
    lastUpdate = new Date().getTime()
}

// Set the fluid variables at the boundaries, according to the current slider value:
function setBoundaries() 
{
    var u0 = Number(config.speed);
    for (var x=0; x<xdim; x++) {
        solver.setEquilibrium(x, 0, u0, 0, 1);
        solver.setEquilibrium(x, ydim - 1, u0, 0, 1);
    }
    for (var y=1; y<ydim-1; y++) {
        solver.setEquilibrium(0, y, u0, 0, 1);
        solver.setEquilibrium(xdim - 1, y, u0, 0, 1);
    }
}


// Move the tracer particles:
function moveTracers() {
    for (var t=0; t<nTracers; t++) {
        var roundedX = Math.round(tracerX[t]);
        var roundedY = Math.round(tracerY[t]);
        var index = roundedX + roundedY*xdim;
        tracerX[t] += ux[index];
        tracerY[t] += uy[index];
        if (tracerX[t] > xdim-1) {
            tracerX[t] = 0;
            tracerY[t] = Math.random() * ydim;
        }
    }
}

// "Drag" the fluid in a direction determined by the mouse (or touch) motion:
// (The drag affects a "circle", 5 px in diameter, centered on the given coordinates.)
function push(pushX, pushY, pushUX, pushUY) {
    // First make sure we're not too close to edge:
    var margin = 3;
    if ((pushX > margin) && (pushX < xdim-1-margin) && (pushY > margin) && (pushY < ydim-1-margin)) {
        for (var dx=-1; dx<=1; dx++) {
            setEquil(pushX+dx, pushY+2, pushUX, pushUY);
            setEquil(pushX+dx, pushY-2, pushUX, pushUY);
        }
        for (var dx=-2; dx<=2; dx++) {
            for (var dy=-1; dy<=1; dy++) {
                setEquil(pushX+dx, pushY+dy, pushUX, pushUY);
            }
        }
    }
}

// Initialize the tracer particles:
function initTracers() {
    if (tracerCheck.checked) {
        var nRows = Math.ceil(Math.sqrt(nTracers));
        var dx = xdim / nRows;
        var dy = ydim / nRows;
        var nextX = dx / 2;
        var nextY = dy / 2;
        for (var t=0; t<nTracers; t++) {
            tracerX[t] = nextX;
            tracerY[t] = nextY;
            nextX += dx;
            if (nextX > xdim) {
                nextX = dx / 2;
                nextY += dy;
            }
        }
    }
    paintCanvas();
}

// Color a grid square in the image data array, one pixel at a time (rgb each in range 0 to 255):
function colorSquare(x, y, r, g, b) {
    var flippedy = ydim - y - 1;			// put y=0 at the bottom
    var data = image.data
    var width = image.width
    var pxPerSquare = config.pxPerSquare
    for (var py=flippedy*pxPerSquare; py<(flippedy+1)*pxPerSquare; py++) {
        for (var px=x*pxPerSquare; px<(x+1)*pxPerSquare; px++) {
            var index = (px + py*width) * 4;
            data[index+0] = r;
            data[index+1] = g;
            data[index+2] = b;
        }
    }
}

// Draw the tracer particles:
function drawTracers() {
    context.fillStyle = "rgb(150,150,150)";
    for (var t=0; t<nTracers; t++) {
        var canvasX = (tracerX[t]+0.5) * pxPerSquare;
        var canvasY = canvas.height - (tracerY[t]+0.5) * pxPerSquare;
        context.fillRect(canvasX-1, canvasY-1, 2, 2);
    }
}

// Draw a grid of short line segments along flow directions:
function drawFlowlines() {
    var pxPerFlowline = 10;
    if (config.pxPerSquare == 1) pxPerFlowline = 6;
    if (config.pxPerSquare == 2) pxPerFlowline = 8;
    if (config.pxPerSquare == 5) pxPerFlowline = 12;
    if ((config.pxPerSquare == 6) || (config.pxPerSquare == 8)) pxPerFlowline = 15;
    if (config.pxPerSquare == 10) pxPerFlowline = 20;
    var sitesPerFlowline = pxPerFlowline / pxPerSquare;
    var xLines = canvas.width / pxPerFlowline;
    var yLines = canvas.height / pxPerFlowline;
    for (var yCount=0; yCount<yLines; yCount++) {
        for (var xCount=0; xCount<xLines; xCount++) {
            var x = Math.round((xCount+0.5) * sitesPerFlowline);
            var y = Math.round((yCount+0.5) * sitesPerFlowline);
            var thisUx = ux[x+y*xdim];
            var thisUy = uy[x+y*xdim];
            var speed = Math.sqrt(thisUx*thisUx + thisUy*thisUy);
            if (speed > 0.0001) {
                var px = (xCount+0.5) * pxPerFlowline;
                var py = canvas.height - ((yCount+0.5) * pxPerFlowline);
                var scale = 0.5 * pxPerFlowline / speed;
                context.beginPath();
                context.moveTo(px-thisUx*scale, py+thisUy*scale);
                context.lineTo(px+thisUx*scale, py-thisUy*scale);
                //context.lineWidth = speed * 5;
                var cIndex = Math.round(speed * transBlackArraySize / 0.3);
                if (cIndex >= transBlackArraySize) cIndex = transBlackArraySize - 1;
                context.strokeStyle = transBlackArray[cIndex];
                //context.strokeStyle = "rgba(0,0,0,0.1)";
                context.stroke();
            }
        }
    }
}

// Draw an arrow to represent the total force on the barrier(s):
function drawForceArrow(x, y, Fx, Fy) {
    context.fillStyle = "rgba(100,100,100,0.7)";
    context.translate((x + 0.5) * config.pxPerSquare, canvas.height - (y + 0.5) * config.pxPerSquare);
    var magF = Math.sqrt(Fx*Fx + Fy*Fy);
    context.scale(4*magF, 4*magF);
    context.rotate(Math.atan2(-Fy, Fx));
    context.beginPath();
    context.moveTo(0, 3);
    context.lineTo(100, 3);
    context.lineTo(100, 12);
    context.lineTo(130, 0);
    context.lineTo(100, -12);
    context.lineTo(100, -3);
    context.lineTo(0, -3);
    context.lineTo(0, 3);
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);
}

// Draw the sensor and its associated data display:
function drawSensor() {
    var canvasX = (sensorX+0.5) * config.pxPerSquare;
    var canvasY = canvas.height - (sensorY+0.5) * config.pxPerSquare;
    context.fillStyle = "rgba(180,180,180,0.7)";	// first draw gray filled circle
    context.beginPath();
    context.arc(canvasX, canvasY, 7, 0, 2*Math.PI);
    context.fill();
    context.strokeStyle = "#404040";				// next draw cross-hairs
    context.linewidth = 1;
    context.beginPath();
    context.moveTo(canvasX, canvasY-10);
    context.lineTo(canvasX, canvasY+10);
    context.moveTo(canvasX-10, canvasY);
    context.lineTo(canvasX+10, canvasY);
    context.stroke();
    context.fillStyle = "rgba(255,255,255,0.5)";	// draw rectangle behind text
    canvasX += 10;
    context.font = "12px Monospace";
    var rectWidth = context.measureText("00000000000").width+6;
    var rectHeight = 58;
    if (canvasX+rectWidth > canvas.width) canvasX -= (rectWidth+20);
    if (canvasY+rectHeight > canvas.height) canvasY = canvas.height - rectHeight;
    context.fillRect(canvasX, canvasY, rectWidth, rectHeight);
    context.fillStyle = "#000000";					// finally draw the text
    canvasX += 3;
    canvasY += 12;
    var coordinates = "  (" + sensorX + "," + sensorY + ")";
    context.fillText(coordinates, canvasX, canvasY);
    canvasY += 14;
    var rhoSymbol = String.fromCharCode(parseInt('03C1',16));
    var index = sensorX + sensorY * xdim;
    context.fillText(" " + rhoSymbol + " =  " + Number(rho[index]).toFixed(3), canvasX, canvasY);
    canvasY += 14;
    var digitString = Number(ux[index]).toFixed(3);
    if (ux[index] >= 0) digitString = " " + digitString;
    context.fillText("ux = " + digitString, canvasX, canvasY);
    canvasY += 14;
    digitString = Number(uy[index]).toFixed(3);
    if (uy[index] >= 0) digitString = " " + digitString;
    context.fillText("uy = " + digitString, canvasX, canvasY);
}

// Functions to handle mouse/touch interaction:
function mouseDown(e) {
    if (sensorCheck.checked) {
        var canvasLoc = pageToCanvas(e.pageX, e.pageY);
        var gridLoc = canvasToGrid(canvasLoc.x, canvasLoc.y);
        var dx = (gridLoc.x - sensorX) * config.pxPerSquare;
        var dy = (gridLoc.y - sensorY) * config.pxPerSquare;
        if (Math.sqrt(dx*dx + dy*dy) <= 8) {
            draggingSensor = true;
        }
    }
    mousePressDrag(e);
};
function mouseMove(e) {
    if (mouseIsDown) {
        mousePressDrag(e);
    }
};
function mouseUp(e) {
    mouseIsDown = false;
    draggingSensor = false;
};

// Handle mouse press or drag:
function mousePressDrag(e) {
    e.preventDefault();
    mouseIsDown = true;
    var canvasLoc = pageToCanvas(e.pageX, e.pageY);
    if (draggingSensor) {
        var gridLoc = canvasToGrid(canvasLoc.x, canvasLoc.y);
        sensorX = gridLoc.x;
        sensorY = gridLoc.y;
        paintCanvas();
        return;
    }
    if (mouseSelect.selectedIndex == 2) {
        mouseX = canvasLoc.x;
        mouseY = canvasLoc.y;
        return;
    }
    var gridLoc = canvasToGrid(canvasLoc.x, canvasLoc.y);
    if (mouseSelect.selectedIndex == 0) {
        addBarrier(gridLoc.x, gridLoc.y);
        paintCanvas();
    } else {
        removeBarrier(gridLoc.x, gridLoc.y);
    }
}

// Convert page coordinates to canvas coordinates:
function pageToCanvas(pageX, pageY) {
    var canvasX = pageX - canvas.offsetLeft;
    var canvasY = pageY - canvas.offsetTop;
    // this simple subtraction may not work when the canvas is nested in other elements
    return { x:canvasX, y:canvasY };
}

// Convert canvas coordinates to grid coordinates:
function canvasToGrid(canvasX, canvasY) {
    var gridX = Math.floor(canvasX / config.pxPerSquare);
    var gridY = Math.floor((canvas.height - 1 - canvasY) / config.pxPerSquare); 	// off by 1?
    return { x:gridX, y:gridY };
}

// Add a barrier at a given grid coordinate location:
function addBarrier(x, y) {
    if ((x > 1) && (x < xdim-2) && (y > 1) && (y < ydim-2)) {
        solver.barrier[x+y*xdim] = true;
    }
}

// Remove a barrier at a given grid coordinate location:
function removeBarrier(x, y) {
    if (solver.barrier[x + y * xdim]) {
        solver.barrier[x + y * xdim] = false;
        paintCanvas();
    }
}

// Function to initialize or re-initialize the fluid, based on speed slider setting:
function initFluid() {
    
    solver.init(config.speed)
    
    paintCanvas();
}

// Function to start or pause the simulation:
function startStop() {
    this.running = !this.running;
    if (this.running) {
        startButton.value = "Pause";
        resetTimer();
        simulate();
    } else {
        startButton.value = " Run ";
    }
}

// Reset the timer that handles performance evaluation:
function resetTimer() {
    stepCount = 0;
    startTime = (new Date()).getTime();
}

// Show value of viscosity:
function adjustViscosity() {
    viscValue.innerHTML = Number(config.viscosity).toFixed(3);
}


// Replaces current barriers with a preset barrier. 0 for none.
function placePresetBarrier(index) {    
    solver.clearBarriers();
    if (index == 0) return;    
    var bCount = barrierList[index-1].locations.length/2;	// number of barrier sites
    // To decide where to place it, find minimum x and min/max y:
    var xMin = barrierList[index-1].locations[0];
    var yMin = barrierList[index-1].locations[1];
    var yMax = yMin;
    for (var siteIndex=2; siteIndex<2*bCount; siteIndex+=2) {
        if (barrierList[index-1].locations[siteIndex] < xMin) {
            xMin = barrierList[index-1].locations[siteIndex];
        }
        if (barrierList[index-1].locations[siteIndex+1] < yMin) {
            yMin = barrierList[index-1].locations[siteIndex+1];
        }
        if (barrierList[index-1].locations[siteIndex+1] > yMax) {
            yMax = barrierList[index-1].locations[siteIndex+1];
        }
    }
    var yAverage = Math.round((yMin+yMax)/2);
    // Now place the barriers:
    for (var siteIndex=0; siteIndex<2*bCount; siteIndex+=2) {
        var x = barrierList[index-1].locations[siteIndex] - xMin + Math.round(ydim/3);
        var y = barrierList[index-1].locations[siteIndex+1] - yAverage + Math.round(ydim/2);
        addBarrier(x, y);
    }
}

// Print debugging data:
function debug() {
    dataArea.innerHTML = "Tracer locations:\n";
    for (var t=0; t<nTracers; t++) {
        dataArea.innerHTML += tracerX[t] + ", " + tracerY[t] + "\n";
    }
}
