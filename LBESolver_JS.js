/*
    The Lattice boltzman solver using standard javascript.
    It's not very fast, but it'll do the trick.
*/


// Create an instance of the plain javascript version of a lattice boltzmann solver. 
function LBESolver_JS(xdim, ydim) {

    console.log("Initializing LBE Solver.")

    this.xdim = xdim;
    this.ydim = ydim;
    this.viscosity = 0.020;
    
    this.n0 = createArray(xdim*ydim);			// microscopic densities along each lattice direction
    this.nN = createArray(xdim*ydim);
    this.nS = createArray(xdim*ydim);
    this.nE = createArray(xdim*ydim);
    this.nW = createArray(xdim*ydim);
    this.nNE = createArray(xdim*ydim);
    this.nSE = createArray(xdim*ydim);
    this.nNW = createArray(xdim*ydim);
    this.nSW = createArray(xdim*ydim);
    this.rho = createArray(xdim*ydim);			// macroscopic density
    this.ux = createArray(xdim*ydim);			// macroscopic velocity
    this.uy = createArray(xdim * ydim);

    // these are calculated only per frame, instead of per step.
    this.curl = createArray(xdim * ydim);
    this.pressure = createArray(xdim * ydim);

    this.barrier = createArray(xdim * ydim);		// integer array of barrier locations
}

LBESolver_JS.prototype = {
    constructor: LBESolver_JS,
    
    // Performs a collision step.
    collide: function () {

        var xdim = this.xdim;
        var ydim = this.ydim;

        var viscosity = this.viscosity;	        // kinematic viscosity coefficient in natural units
        var omega = 1 / (3 * viscosity + 0.5);	// reciprocal of relaxation time    
        
        for (var y = 1; y < ydim - 1; y++) {
            for (var x = 1; x < xdim - 1; x++) {

                var i = x + y * xdim;		// array index for this lattice site

                var _n0 = this.n0[i]
                var _nN = this.nN[i]
                var _nS = this.nS[i]
                var _nE = this.nE[i]
                var _nW = this.nW[i]
                var _nNW = this.nNW[i]
                var _nNE = this.nNE[i]
                var _nSW = this.nSW[i]
                var _nSE = this.nSE[i]

                var thisrho = _n0 + _nN + _nS + _nE + _nW + _nNW + _nNE + _nSW + _nSE;
                var thisux = (_nE + _nNE + _nSE - _nW - _nNW - _nSW) / thisrho;
                var thisuy = (_nN + _nNE + _nNW - _nS - _nSE - _nSW) / thisrho;
                var one9thrho = one9th * thisrho;		// pre-compute a bunch of stuff for optimization
                var one36thrho = one36th * thisrho;
                var ux3 = 3.0 * thisux;
                var uy3 = 3.0 * thisuy;
                var ux2 = thisux * thisux;
                var uy2 = thisuy * thisuy;
                var uxuy2 = 2.0 * thisux * thisuy;
                var u2 = ux2 + uy2;
                var u215 = 1.5 * u2;
                
                this.n0[i] = _n0 + omega * (four9ths * thisrho * (1.0 - u215) - _n0);
                this.nE[i] = _nE + omega * (one9thrho * (1.0 + ux3 + 4.5 * ux2 - u215) - _nE);
                this.nW[i] = _nW + omega * (one9thrho * (1.0 - ux3 + 4.5 * ux2 - u215) - _nW);
                this.nN[i] = _nN + omega * (one9thrho * (1.0 + uy3 + 4.5 * uy2 - u215) - _nN);
                this.nS[i] = _nS + omega * (one9thrho * (1.0 - uy3 + 4.5 * uy2 - u215) - _nS);
                this.nNE[i] = _nNE + omega * (one36thrho * (1.0 + ux3 + uy3 + 4.5 * (u2 + uxuy2) - u215) - _nNE);
                this.nSE[i] = _nSE + omega * (one36thrho * (1.0 + ux3 - uy3 + 4.5 * (u2 - uxuy2) - u215) - _nSE);
                this.nNW[i] = _nNW + omega * (one36thrho * (1.0 - ux3 + uy3 + 4.5 * (u2 - uxuy2) - u215) - _nNW);
                this.nSW[i] = _nSW + omega * (one36thrho * (1.0 - ux3 - uy3 + 4.5 * (u2 + uxuy2) - u215) - _nSW);
                this.rho[i] = thisrho;
                this.ux[i] = thisux;
                this.uy[i] = thisuy                
            }
        }

        for (var y = 1; y < ydim - 2; y++) {
            this.nW[xdim - 1 + y * xdim] = this.nW[xdim - 2 + y * xdim];		// at right end, copy left-flowing densities from next row to the left
            this.nNW[xdim - 1 + y * xdim] = this.nNW[xdim - 2 + y * xdim];
            this.nSW[xdim - 1 + y * xdim] = this.nSW[xdim - 2 + y * xdim];
        }   

    },
    
    // peforms a stream step
    stream:function () {
        barrierCount = 0; barrierxSum = 0; barrierySum = 0;
        barrierFx = 0.0; barrierFy = 0.0;

        var nN = this.nN;
        var nE = this.nE;
        var nW = this.nW;
        var nS = this.nS;
        var nNE = this.nNE;
        var nNW = this.nNW;
        var nSE = this.nSE;
        var nSW = this.nSW;
        var xdim = this.xdim;
        var ydim = this.ydim;
        var barrier = this.barrier;

        for (var y = ydim - 2; y > 0; y--) {			// first start in NW corner...
            for (var x = 1; x < xdim - 1; x++) {
                nN[x + y * xdim] = nN[x + (y - 1) * xdim];			// move the north-moving particles
                nNW[x + y * xdim] = nNW[x + 1 + (y - 1) * xdim];		// and the northwest-moving particles
            }
        }
        for (var y = ydim - 2; y > 0; y--) {			// now start in NE corner...
            for (var x = xdim - 2; x > 0; x--) {
                nE[x + y * xdim] = nE[x - 1 + y * xdim];			// move the east-moving particles
                nNE[x + y * xdim] = nNE[x - 1 + (y - 1) * xdim];		// and the northeast-moving particles
            }
        }
        for (var y = 1; y < ydim - 1; y++) {			// now start in SE corner...
            for (var x = xdim - 2; x > 0; x--) {
                nS[x + y * xdim] = nS[x + (y + 1) * xdim];			// move the south-moving particles
                nSE[x + y * xdim] = nSE[x - 1 + (y + 1) * xdim];		// and the southeast-moving particles
            }
        }
        for (var y = 1; y < ydim - 1; y++) {				// now start in the SW corner...
            for (var x = 1; x < xdim - 1; x++) {
                nW[x + y * xdim] = nW[x + 1 + y * xdim];			// move the west-moving particles
                nSW[x + y * xdim] = nSW[x + 1 + (y + 1) * xdim];		// and the southwest-moving particles
            }
        }
        for (var y = 1; y < ydim - 1; y++) {				// Now handle bounce-back from barriers
            for (var x = 1; x < xdim - 1; x++) {
                if (barrier[x + y * xdim] == 1) {
                    var index = x + y * xdim;
                    nE[x + 1 + y * xdim] = nW[index];
                    nW[x - 1 + y * xdim] = nE[index];
                    nN[x + (y + 1) * xdim] = nS[index];
                    nS[x + (y - 1) * xdim] = nN[index];
                    nNE[x + 1 + (y + 1) * xdim] = nSW[index];
                    nNW[x - 1 + (y + 1) * xdim] = nSE[index];
                    nSE[x + 1 + (y - 1) * xdim] = nNW[index];
                    nSW[x - 1 + (y - 1) * xdim] = nNE[index];
                    // Keep track of stuff needed to plot force vector:
                    barrierCount++;
                    barrierxSum += x;
                    barrierySum += y;
                    barrierFx += nE[index] + nNE[index] + nSE[index] - nW[index] - nNW[index] - nSW[index];
                    barrierFy += nN[index] + nNE[index] + nNW[index] - nS[index] - nSE[index] - nSW[index];
                }
            }
        }
    },

    // Set all densities in a cell to their equilibrium values for a given velocity and density:
    // (If density is omitted, it's left unchanged.)
    setEquilibrium: function (x, y, newux, newuy, newrho) {
        var i = x + y*this.xdim;
        if (typeof newrho == 'undefined') {
            newrho = this.rho[i];
        }
        var ux3 = 3 * newux;
        var uy3 = 3 * newuy;
        var ux2 = newux * newux;
        var uy2 = newuy * newuy;
        var uxuy2 = 2 * newux * newuy;
        var u2 = ux2 + uy2;
        var u215 = 1.5 * u2;
        
        this.n0[i] = four9ths * newrho * (1 - u215);                
        this.nE[i]  =   one9th * newrho * (1 + ux3       + 4.5*ux2        - u215);
        this.nW[i]  =   one9th * newrho * (1 - ux3       + 4.5*ux2        - u215);
        this.nN[i]  =   one9th * newrho * (1 + uy3       + 4.5*uy2        - u215);
        this.nS[i]  =   one9th * newrho * (1 - uy3       + 4.5*uy2        - u215);
        this.nNE[i] =  one36th * newrho * (1 + ux3 + uy3 + 4.5*(u2+uxuy2) - u215);
        this.nSE[i] =  one36th * newrho * (1 + ux3 - uy3 + 4.5*(u2-uxuy2) - u215);
        this.nNW[i] =  one36th * newrho * (1 - ux3 + uy3 + 4.5*(u2-uxuy2) - u215);
        this.nSW[i] =  one36th * newrho * (1 - ux3 - uy3 + 4.5*(u2+uxuy2) - u215);
        this.rho[i] = newrho;
        this.ux[i] = newux;
        this.uy[i] = newuy;
    },

    // Returns if the simulation is stable or not.
    isStable: function () {

        var stable = true;

        var xdim = this.xdim;
        var ydim = this.ydim;
        var rho = this.rho;

        for (var x = 0; x < xdim; x++) {
            var index = x + (ydim / 2) * xdim;	// look at middle row only
            if (rho[index] <= 0) stable = false;
        }
        return stable
    },

    // Initializes fluid to given speed.
    init: function (initialFluidSpeed) {        

        var xdim = this.xdim;
        var ydim = this.ydim;        
        
        for (var y = 0; y < ydim; y++) {
            for (var x = 0; x < xdim; x++) {
                this.setEquilibrium(x, y, initialFluidSpeed, 0, 1);
                this.curl[x + y * xdim] = 0.0;
            }
        }
    },

    // Compute the curl for plotting.
    // todo: do this automatically after each frame .
    computeCurl: function () {

        var xdim = this.xdim;
        var ydim = this.ydim;        
        var ux = this.ux;
        var uy = this.uy;

        for (var y=1; y<ydim-1; y++) {			// interior sites only; leave edges set to zero
            for (var x = 1; x < xdim - 1; x++) {
                var i = x + y * this.xdim;
                this.curl[x + y * xdim] = uy[x + 1 + y * xdim] - uy[x - 1 + y * xdim] - ux[x + (y + 1) * xdim] + ux[x + (y - 1) * xdim];
                var dt = 0.1; // no idea?
                var vel = Math.sqrt(this.ux[i] * this.ux[i] + this.uy[i] * this.uy[i]) / dt;
                this.pressure[i] = this.rho[i] * (1 / (vel + 1)) / 30;
            }
        }
    },
    
}
      