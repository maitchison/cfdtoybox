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
    this.flowline = false;
    this.sensor = false;
    this.showForce = true;

    // UI components
    this.ui = {}
       
    // Downsample more on mobile platforms.
    if (mobile) this.pxPerSquare = 10;

    // Initialize a solver
    this.xdim = this.canvas.width / this.pxPerSquare;			// grid dimensions for simulation
    this.ydim = this.canvas.height / this.pxPerSquare;
    this.solver = new LBESolver_JS(this.xdim, this.ydim);    

    // UI hooks.
    /*
    this.canvas.addEventListener('mousedown', mouseDown, false);
    this.canvas.addEventListener('mousemove', mouseMove, false);
    document.body.addEventListener('mouseup', mouseUp, false);	// button release could occur outside canvas
    this.canvas.addEventListener('touchstart', mouseDown, false);
    this.canvas.addEventListener('touchmove', mouseMove, false);
    document.body.addEventListener('touchend', mouseUp, false);
    */


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
        //this.processInput()
    
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
    
    // ---------------------------
    // Private
    // ---------------------------    

    // Paint the canvas:
    _paintCanvas: function () {
        var cIndex = 0;
        var contrast = Math.pow(1.2, Number(this.contrast));
        var plotType = this.plotSelect;

        if (plotType == 4) this.solver.computeCurl();
        
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

                this._colorSquare(x, y, this.redList[cIndex], this.greenList[cIndex], this.blueList[cIndex]);
            }
        }

        this.context.putImageData(this.image, 0, 0);

        // Draw tracers, force vector, and/or sensor if appropriate:        
        if (this.tracers) drawTracers();
        if (this.flowline) drawFlowlines();
        if (this.sensor) drawSensor();
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
            this._addBarrier(x, y);
        }
    },

    // Add a barrier at a given grid coordinate location:
    _addBarrier: function (x, y) {
    if ((x > 1) && (x < this.xdim-2) && (y > 1) && (y < this.ydim-2)) {
        this.solver.barrier[x+y*this.xdim] = true;
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
            //if (this.tracers) this.moveTracers();
            //if (this.pushing) this.push(pushX, pushY, pushUX, pushUY);
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