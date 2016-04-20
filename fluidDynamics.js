"use strict";

/**
    Latice Boltzmann fluid dynamics simulation
    
    Make sure to include 
        helper.js
        LBESolver_JS.js
    
*/

// -----------------------------------------------
// CONSTANTS 
// -----------------------------------------------

var PlotType = {
    DENSITY: 0,
    SPEED: 3,
    CURL: 4
};

// -----------------------------------------------
// SENSOR
// -----------------------------------------------

function FDSSensor() {
    this.x = 0;
    this.y = 0;
}

FDSSensor.prototype = {
    constructor: FDSSensor,

    // Draw the sensor and its associated data display:
    draw: function (fds) {
        var canvasX = (this.x+0.5) * fds.pxPerSquare;
        var canvasY = fds.canvas.height - (this.y + 0.5) * fds.pxPerSquare;
        var context = fds.context;
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
        var coordinates = "  (" + this.x + "," + this.y + ")";
        context.fillText(coordinates, canvasX, canvasY);
        canvasY += 14;
        var rhoSymbol = String.fromCharCode(parseInt('03C1',16));
        var index = Math.round(this.x) + Math.round(this.y) * fds.xdim;
        context.fillText(" " + rhoSymbol + " =  " + Number(fds.solver.rho[index]).toFixed(3), canvasX, canvasY);
        canvasY += 14;
        var digitString = Number(fds.solver.ux[index]).toFixed(3);
        if (fds.solver.ux[index] >= 0) digitString = " " + digitString;
        context.fillText("ux = " + digitString, canvasX, canvasY);
        canvasY += 14;
        digitString = Number(fds.solver.uy[index]).toFixed(3);
        if (fds.solver.uy[index] >= 0) digitString = " " + digitString;
        context.fillText("uy = " + digitString, canvasX, canvasY);
    },
}

// -----------------------------------------------
// CLASS
// -----------------------------------------------

// Create an instance of a fluid dynamics system.
function FluidDynamics() {

    console.log("Starting fluid dynamics system.")
    
    // Get some basic info from system.
    var mobile = navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i)
    this.canvas = document.getElementById('theCanvas');
    this.context = this.canvas.getContext('2d');
    this.image = this.context.createImageData(this.canvas.width, this.canvas.height);		// for direct pixel manipulation (faster than fillRect)
    for (var i = 3; i < this.image.data.length; i += 4) this.image.data[i] = 255;

    this.running = false;
    
    // Config settings:        
    this.steps = 10;            // steps per draw (affects presentation speed of simulation)    
    this.speed = 0.1;           // speed fluid travels at   
        
    this.contrast = 1.0;
    this.pxPerSquare = 4;
    this.plotSelect = 4;
    this.barrierTemplate = 6;

    this.tracers = false;
    this.flowlines = false;
    this.showSensor = false;
    this.showForce = true;

    this.brushSize = 2;
    this.brushType = "push";

    // sensor
    this.sensor = new FDSSensor();

    // pushing
    this.oldMouseX = -1;
    this.oldMouseY = -1;
    this.pushX = 0;
    this.pushY = 0;
    this.pushUX = 0;
    this.pushUY = 0;

    // tracers
    this.nTracers = 144;
    this.tracerX = new Array(nTracers);
    this.tracerY = new Array(nTracers);
    for (var t=0; t<nTracers; t++) {
        this.tracerX[t] = 0.0; this.tracerY[t] = 0.0;
    }

    // mouse location in grid co-ords.
    this.grid = {x: 60, y: 0};    

    // UI components
    this.ui = {}
       
    // Downsample more on mobile platforms.
    if (mobile) this.pxPerSquare = 10;

    // Initialize a solver
    this.xdim = this.canvas.width / this.pxPerSquare;			// grid dimensions for simulation
    this.ydim = this.canvas.height / this.pxPerSquare;
    this.solver = new LBESolver_JS(this.xdim, this.ydim);

    this.sensor.x = this.xdim / 2;
    this.sensor.y = this.ydim / 2;
    
};

var instance;

FluidDynamics.prototype = {
    constructor: FluidDynamics,

    // Resets the fluid dynamics simulation.
    reset: function() {
        this.pushing = false;
        this._setupColors();
        this._placePresetBarrier(this.barrierTemplate)        
        this._resetFluid();		
    },
    
    // Simulate function executes a bunch of steps and then schedules another call to itself:
    // todo: have another function doing this, we just want to simulate one step...
    simulate: function () {
    
        // Que the next frame
        if (this.running) {
            instance = this;
            requestAnimFrame(function() { instance.simulate(); });	// let browser schedule next frame                
        }
                
        var totalStartTime = new Date().getTime();
            
        var stepsPerFrame = Number(this.steps);			// number of simulation steps per animation frame
    
        // Boundaries and input.    
        this._setBoundaries();    
        this._processInput();
    
        // Run simulation    
        var simulationStartTime = new Date().getTime();
        this._runSimulationSteps(stepsPerFrame)
        var simulationEndTime = new Date().getTime()
    
        // Draw the canvas    
        var drawStartTime = new Date().getTime();
        this._paintCanvas();
        var drawEndTime = new Date().getTime()
    
        // Update the fps label.    
        var currentTime = new Date().getTime();
        var totalEndTime = currentTime;
    
        var frameTime = (currentTime - lastUpdate) / 1000;
    
        var drawTime = drawEndTime - drawStartTime;
        var simulationTime = simulationEndTime - simulationStartTime;
        var totalTime = totalEndTime - totalStartTime;    
    
        if (this.running) {
            stepCount += stepsPerFrame;
            var elapsedTime = (currentTime - startTime) / 1000;	// time in seconds            
            if (this.ui.fpsLabel != null && frameTime > 0 && currentTime > lastFPSUpdate + 1000) {                                    
                this.ui.fpsLabel.innerHTML = "{0} draw:{1}ms simulate:{2}ms total:{3}ms".format(
                    Number(1/frameTime).toFixed(1),
                    Number(drawTime).toFixed(0),
                    Number(simulationTime).toFixed(1),
                    Number(totalTime).toFixed(0)
                );
                
                lastFPSUpdate = currentTime
            } 
        }
    
        var stable = this.solver.isStable()
        if (!stable) {
            window.alert("The simulation has become unstable due to excessive fluid speeds.");
            this.startStop();
            this._resetFluid();
        }    
        lastUpdate = new Date().getTime()
    },

    // Clears all barriers.
    clearBarriers: function () {
        var xdim = this.xdim;
        var ydim = this.ydim;         
        for (var x = 0; x < xdim; x++) {
            for (var y = 0; y < ydim; y++) {
                this.solver.barrier[x + y * xdim] = false;
            }
        }
    },

    // Sets a barrier at a given grid coordinate location:
    setBarrier: function (x, y, value) {
        var xdim = this.xdim;
        var ydim = this.ydim;
        // we can't put barriers on the edges at the moment because it causes some strange effects.  One solution might be to extend the area by 5 pixels
        // top and bottom and the just now show those areas.
        //if ((x > 1) && (x < xdim - 2) && (y >= 0) && (y < ydim)) {
        if ((x > 1) && (x < xdim - 2) && (y > 1) && (y < ydim - 2)) {
            this.solver.barrier[x+y*xdim] = value;
        }
    },

    // Add a barrier at a given grid coordinate location:
    addBarrier: function (x, y) {
        this.setBarrier(x, y, true)
    },

    // Remove a barrier at a given grid coordinate location:
    removeBarrier: function (x, y) {
        this.setBarrier(x, y, false)
    },

    // Function to start or pause the simulation:
    // todo: tidy this one up.
    startStop: function () {
        this.running = !this.running;
        if (this.running) {
            console.log("Starting.");
            startButton.value = "Pause";
            resetTimer();
            this.simulate();
        } else {
            console.log("Stopping.");
            startButton.value = " Run ";
        }
    },

    // Initialize the tracer particles:
    resetTracers: function () {         
        var nRows = Math.ceil(Math.sqrt(this.nTracers));
        var dx = this.xdim / nRows;
        var dy = this.ydim / nRows;
        var nextX = dx / 2;
        var nextY = dy / 2;
        for (var t=0; t<this.nTracers; t++) {
            this.tracerX[t] = nextX;
            this.tracerY[t] = nextY;            
            for (var tries = 0; tries < 100; tries ++) {
                nextX += dx;
                if (nextX > this.xdim) {
                    nextX = dx / 2;
                    nextY += dy;
                }
                i = Math.round(nextX) + Math.round(nextY) * this.xdim;
                if (!this.solver.barrier[i])
                    break                
            }
        }
        this._paintCanvas();
    },
        
    // ---------------------------
    // Private
    // --------------------------- 
    
    // Move the tracer particles:
    _moveTracers: function () {        
        for (var t=0; t<this.nTracers; t++) {
            var roundedX = Math.round(this.tracerX[t]);
            var roundedY = Math.round(this.tracerY[t]);
            var index = roundedX + roundedY*this.xdim;
            this.tracerX[t] += this.solver.ux[index];
            this.tracerY[t] += this.solver.uy[index];
            var collided = (this.solver.barrier[index]);
            if (collided || (this.tracerX[t] > this.xdim - 1)) {                
                this.tracerX[t] = 0;
                this.tracerY[t] = Math.random() * this.ydim;
            }            
        }
    },

    
    // Paints barriers with a brush of given type and size at location.  If value is set to false barriers will be removed instead of added. 
    // brushType: "circle, square, hline, vline"    
    // target: if "canvas" then brush will be painted to canvas instead of adjusting the barriers.
    _applyBrush: function (atX, atY, brushType, brushSize, value, target) {
        // this is really quite a messy function, not sure why this stuff is so hard in JS?  I just wanted to be able to pass a function and maybe have some defaults,
        // but passing functions like this.setBarrier doesn't work as this ends up being null for some reason?

        var paintToCanvas = (target == "canvas");

        if (atX < 0 || atY < 0 || atX > this.xdim || atY > this.ydim)
            return;

        if (brushType == "circle") {
            var radius = Math.abs(Math.round(brushSize)) - 1;
            var adjustedRadius = radius + 0.25;
            for (var y = -radius; y <= +radius; y++) {
                var lineWidth = Math.round(Math.sqrt(adjustedRadius * adjustedRadius- y * y));
                for (var x = -lineWidth; x <= +lineWidth; x++) {
                    if (paintToCanvas) {
                        this._drawBarrier(x + atX, y + atY, value);                                                                        
                    }  else
                        this.setBarrier(x + atX, y + atY, value)
                }
            }
        }

        if (brushType == "square") {
            var radius = Math.abs(Math.round(brushSize));
            var lineWidth = Math.round(radius)
            for (var y = -radius; y < +radius; y++) 
                for (var x = -lineWidth; x < +lineWidth; x++) 
                    if (paintToCanvas)
                        this._drawBarrier(x + atX, y + atY, value)
                    else
                        this.setBarrier(x + atX, y + atY, value)
        }

        if (brushType == "hline") {
            var radius = Math.abs(Math.round(brushSize));
            var y = 0;
            for (var x = -radius; x < +radius; x++) 
                if (paintToCanvas)
                    this._drawBarrier(x + atX, y + atY, value)
                else
                    this.setBarrier(x + atX, y + atY, value)
        }

        if (brushType == "vline") {
            var radius = Math.abs(Math.round(brushSize));
            var x = 0;
            for (var y = -radius; y < +radius; y++) 
                if (paintToCanvas)
                    this._drawBarrier(x + atX, y + atY, value)
                else
                    this.setBarrier(x + atX, y + atY, value)
        }
    },

    // Converts from canvas location to grid co-ordantes.  Returns results (x,y)
    _gridCoords: function(canvasX, canvasY) {
        var result = {}
        result.x = Math.floor(canvasX / this.pxPerSquare);
        result.y = Math.floor((canvas.height - 1 - canvasY) / this.pxPerSquare); 	// off by 1?
        return result;
    },

    _processInput: function() {
        
        // find mouse location in grid co-ords
        this.grid = this._gridCoords(mouse.x, mouse.y);
                
        if (mouse.isButtonDown) {

            if (this.showSensor) {                
                var dx = (this.grid.x - this.sensor.x) * this.pxPerSquare;
                var dy = (this.grid.y - this.sensor.y) * this.pxPerSquare;
                if (Math.sqrt(dx * dx + dy * dy) <= 8) {
                    draggingSensor = true;
                }
            }

            if (draggingSensor) {                
                this.sensor.x = clip(this.grid.x, 0, this.xdim - 1);
                this.sensor.y = clip(this.grid.y, 0, this.ydim - 1);
                this._paintCanvas();
                return;
            } else if (this.brushType == "push") {
                // push:
                if (mouse.isButtonDown) {
                    if (this.oldMouseX >= 0) {
                        this.pushX = this.grid.x;
                        this.pushY = this.grid.y;
                        this.pushUX = (mouse.x - this.oldMouseX) / this.pxPerSquare / this.steps;
                        this.pushUY = -(mouse.y - this.oldMouseY) / this.pxPerSquare / this.steps;	// y axis is flipped
                        if (Math.abs(this.pushUX) > 0.1) this.pushUX = 0.1 * Math.abs(this.pushUX) / this.pushUX;
                        if (Math.abs(this.pushUY) > 0.1) this.pushUY = 0.1 * Math.abs(this.pushUY) / this.pushUY;
                        this.pushing = true;
                    }
                    this.oldMouseX = mouse.x; this.oldMouseY = mouse.y;
                } else {
                    this.pushing = false;
                    this.oldMouseX = -1; this.oldMouseY = -1;
                }
            } else {
                // add barrier
                this._applyBrush(this.grid.x, this.grid.y, this.brushType, this.brushSize, !key.shift);
                this._paintCanvas();
            }
        }

        
        
    },

    // Draw a preview of current brush 
    _drawBrush: function () {
        if (this.brushType == "")
            return;
        this._applyBrush(this.grid.x, this.grid.y, this.brushType, this.brushSize, !key.shift, "canvas");
    },
    
    // Paint the canvas:
    _paintCanvas: function () {
        var cIndex = 0;
        var contrast = Math.pow(1.2, Number(this.contrast));
        var plotType = this.plotSelect;

        if (plotType == 4 || plotType == 5) this.solver.computeCurl();
        
        var rho = this.solver.rho;
        var ux = this.solver.ux;
        var uy = this.solver.uy;
        var curl = this.solver.curl;
        var barrier = this.solver.barrier;
        var xdim = this.xdim;
        var ydim = this.ydim;
        var nColors = this.nColors;
        
        for (var y = 0; y < ydim; y++) {
            for (var x = 0; x < xdim; x++) {
                if (barrier[x + y * xdim]) {
                    cIndex = nColors + 1;	// kludge for barrier color which isn't really part of color map
                } else {
                    cIndex = 0;
                    if (plotType == 0) {
                        cIndex = Math.round(nColors * ((rho[x + y * xdim] - 1) * 6 * contrast + 0.5));
                    } else if (plotType == 1) {
                        cIndex = Math.round(nColors * (ux[x + y * xdim] * 2 * contrast + 0.5));
                    } else if (plotType == 2) {
                        cIndex = Math.round(nColors * (uy[x + y * xdim] * 2 * contrast + 0.5));
                    } else if (plotType == 3) {
                        var speed = Math.sqrt(ux[x + y * xdim] * ux[x + y * xdim] + uy[x + y * xdim] * uy[x + y * xdim]);
                        cIndex = Math.round(nColors * (speed * 4 * contrast));
                    } else if (plotType == 4) {
                        cIndex = Math.round(nColors * (curl[x + y * xdim] * 5 * contrast + 0.5));
                    } else if (plotType == 5) {                     
                        cIndex = Math.round(nColors * (this.solver.pressure[x + y * xdim] * 5 * contrast + 0.5));
                    } else if (plotType == 6) {
                        cIndex = 200;
                }                    
                    if (cIndex < 0) cIndex = 0;
                    if (cIndex > nColors) cIndex = nColors;
                }

                this._colorSquare(x, y, this.redList[cIndex], this.greenList[cIndex], this.blueList[cIndex]);
            }
        }

        this._drawBrush();

        this.context.putImageData(this.image, 0, 0);

        // Draw tracers, force vector, and/or sensor if appropriate:        
        if (this.tracers) this._drawTracers();
        if (this.flowlines) this._drawFlowlines();
        if (this.showSensor) this.sensor.draw(this);
    },

    // A special function that can be called by _applyBrush to paint potential barriers onto the canvas.
    _drawBarrier: function (x, y, value) {
        this._colorSquare(Math.round(x), Math.round(y), 255, 255, 255)
    },

    // Draw the tracer particles:
    _drawTracers: function () {
        this.context.fillStyle = "rgb(150,150,150)";
        for (var t = 0; t < this.nTracers; t++) {            
            var canvasX = (this.tracerX[t] + 0.5) * this.pxPerSquare;            
            var canvasY = canvas.height - (this.tracerY[t]+0.5) * this.pxPerSquare;
            this.context.fillRect(canvasX-1, canvasY-1, 2, 2);
        }
    },

    // Draw a grid of short line segments along flow directions:
    _drawFlowlines: function () {
        var pxPerFlowline = 10;
        if (this.pxPerSquare == 1) pxPerFlowline = 6;
        if (this.pxPerSquare == 2) pxPerFlowline = 8;
        if (this.pxPerSquare == 5) pxPerFlowline = 12;
        if ((this.pxPerSquare == 6) || (this.pxPerSquare == 8)) pxPerFlowline = 15;
        if (this.pxPerSquare == 10) pxPerFlowline = 20;
        var sitesPerFlowline = pxPerFlowline / this.pxPerSquare;
        var xLines = this.canvas.width / pxPerFlowline;
        var yLines = this.canvas.height / pxPerFlowline;
        for (var yCount=0; yCount<yLines; yCount++) {
            for (var xCount=0; xCount<xLines; xCount++) {
                var x = Math.round((xCount+0.5) * sitesPerFlowline);
                var y = Math.round((yCount+0.5) * sitesPerFlowline);
                var thisUx = this.solver.ux[x+y*this.xdim];
                var thisUy = this.solver.uy[x + y * this.xdim];
                var speed = Math.sqrt(thisUx*thisUx + thisUy*thisUy);
                if (speed > 0.0001) {
                    var px = (xCount+0.5) * pxPerFlowline;
                    var py = this.canvas.height - ((yCount+0.5) * pxPerFlowline);
                    var scale = 0.5 * pxPerFlowline / speed;
                    this.context.beginPath();
                    this.context.moveTo(px-thisUx*scale, py+thisUy*scale);
                    this.context.lineTo(px+thisUx*scale, py-thisUy*scale);
                    //context.lineWidth = speed * 5;
                    var cIndex = Math.round(speed * transBlackArraySize / 0.3);
                    if (cIndex >= transBlackArraySize) cIndex = transBlackArraySize - 1;
                    this.context.strokeStyle = transBlackArray[cIndex];
                    //context.strokeStyle = "rgba(0,0,0,0.1)";
                    this.context.stroke();
                }
            }
        }
    },


    // Replaces current barriers with a preset barrier. 0 for none.
    _placePresetBarrier: function (index) {

        var xdim = this.xdim;
        var ydim = this.ydim;

        console.log("Placing preset.");

        this.clearBarriers();

        if (index == 0) return;

        var bCount = barrierList[index - 1].locations.length / 2;	// number of barrier sites
        // To decide where to place it, find minimum x and min/max y:
        var xMin = barrierList[index - 1].locations[0];
        var yMin = barrierList[index - 1].locations[1];
        var yMax = yMin;
        for (var siteIndex = 2; siteIndex < 2 * bCount; siteIndex += 2) {
            if (barrierList[index - 1].locations[siteIndex] < xMin) {
                xMin = barrierList[index - 1].locations[siteIndex];
            }
            if (barrierList[index - 1].locations[siteIndex + 1] < yMin) {
                yMin = barrierList[index - 1].locations[siteIndex + 1];
            }
            if (barrierList[index - 1].locations[siteIndex + 1] > yMax) {
                yMax = barrierList[index - 1].locations[siteIndex + 1];
            }
        }
        var yAverage = Math.round((yMin + yMax) / 2);
        // Now place the barriers:
        for (var siteIndex = 0; siteIndex < 2 * bCount; siteIndex += 2) {
            var x = barrierList[index - 1].locations[siteIndex] - xMin + Math.round(ydim / 3);
            var y = barrierList[index - 1].locations[siteIndex + 1] - yAverage + Math.round(ydim / 2);
            this.addBarrier(x, y);
        }
    },
  
    // Set the fluid variables at the boundaries, according to the current slider value:
    // Todo: this needs some work
    _setBoundaries: function () {
        var u0 = Number(this.speed);
        var xdim = this.xdim;
        var ydim = this.ydim;
        for (var x=0; x<xdim; x++) {
            this.solver.setEquilibrium(x, 0, u0, 0, 1);
            this.solver.setEquilibrium(x, ydim - 1, u0, 0, 1);
        }
        for (var y=1; y<ydim-1; y++) {
            this.solver.setEquilibrium(0, y, u0, 0, 1);
            this.solver.setEquilibrium(xdim - 1, y, u0, 0, 1);
        }
    },

    // Runs given number of steps in the simulation. 
    _runSimulationSteps: function (steps) {
        for (var step=0; step<steps; step++) {
            this.solver.collide();
            this.solver.stream();
            if (this.tracers) this._moveTracers();
            if (this.pushing) this._push(this.pushX, this.pushY, this.pushUX, this.pushUY);
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
    },


    // Set up the array of colors for plotting (mimicks matplotlib "jet" colormap):
    // (Kludge: Index nColors+1 labels the color used for drawing barriers.)
    _setupColors: function () {
        this.nColors = 400;
        var nColors = this.nColors;

        this.redList = new Array(nColors+2);
        this.greenList = new Array(nColors+2);
        this.blueList = new Array(nColors + 2);
        
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
            this.redList[c] = r; this.greenList[c] = g; this.blueList[c] = b;            
        }
        this.redList[nColors+1] = 0; this.greenList[nColors+1] = 0; this.blueList[nColors+1] = 0;	// barriers are black        
    },

    // Color a single grid square in the image data array, one pixel at a time (rgb each in range 0 to 255):
    _colorSquare: function (x, y, r, g, b) {

        if ((x < 0) || (y < 0) || (x >= this.xdim) || (y >= this.ydim))
            return;

        var flippedy = this.ydim - y - 1;			// put y=0 at the bottom
        var data = this.image.data
        var width = this.image.width
        var pxPerSquare = this.pxPerSquare

        for (var py=flippedy*pxPerSquare; py<(flippedy+1)*pxPerSquare; py++) {
            for (var px=x*pxPerSquare; px<(x+1)*pxPerSquare; px++) {
                var index = (px + py*width) * 4;
                data[index+0] = r;
                data[index+1] = g;
                data[index+2] = b;
            }
        }

    },

    // Function to initialize or re-initialize the fluid, based on speed slider setting:    
    _resetFluid: function () {
        console.log("resting fluid. "+this.speed)
        this.solver.init(this.speed)        
    },

    // "Drag" the fluid in a direction determined by the mouse (or touch) motion:
    // (The drag affects a "circle", 5 px in diameter, centered on the given coordinates.)
    _push: function (pushX, pushY, pushUX, pushUY) {

        // First make sure we're not too close to edge:
        var margin = 3;

        var xdim = this.xdim;
        var ydim = this.ydim;

        var radius = 2;

        if ((pushX > margin) && (pushX < xdim-1-margin) && (pushY > margin) && (pushY < ydim-1-margin)) {
            for (var dx = -radius; dx <= radius; dx++) {
                this.solver.setEquilibrium(pushX + dx, pushY + 2, pushUX, pushUY);
                this.solver.setEquilibrium(pushX + dx, pushY - 2, pushUX, pushUY);
            }

            for (var dx = -radius; dx <= radius; dx++) {
                for (var dy = -radius; dy <= radius; dy++) {
                    this.solver.setEquilibrium(pushX + dx, pushY + dy, pushUX, pushUY);
                }
            }

        }   
    },

    
    
}
    

// -----------------------------------------------
// GLOBAL VARIABLES
// -----------------------------------------------

var startButton = document.getElementById('startButton');
var mouseSelect = document.getElementById('mouseSelect');
var speedReadout = document.getElementById('speedReadout');

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
var draggingSensor = false;
var mouseIsDown = false;
var mouseX, mouseY;							// mouse location in canvas coordinates
var oldMouseX = -1, oldMouseY = -1;			// mouse coordinates from previous simulation frame
var collectingData = false;
var time = 0;								// time (in simulation step units) since data collection started
var showingPeriod = false;
var lastBarrierFy = 1;						// for determining when F_y oscillation begins
var lastFyOscTime = 0;						// for calculating F_y oscillation period


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

// Reset the timer that handles performance evaluation:
function resetTimer() {
    stepCount = 0;
    startTime = (new Date()).getTime();
}

function doKeyPress(e) {
    // this is a bit of a hack, only one instance will work.  Better would be to add hooks for every instance but I had trouble with calling this.something when using events?
    console.log('pressed key ' + e.keyCode);
    if (instance != null) {
        if (e.keyCode == 45) 
            instance.brushSize = Math.max(1, instance.brushSize - 1);        
        if (e.keyCode == 61)
            instance.brushSize = Math.min(99, instance.brushSize + 1);
    }
}

// hook for keypresses

document.body.addEventListener('keypress', doKeyPress, false);