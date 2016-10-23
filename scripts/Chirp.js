/**
 * So the idea is that this object will take an intermittent sound and play it intermittently
 * Maybe a first study towards a fully fractal system
 */


// creating a Chirp object with an object constructor
function Chirp(intermittentSound, minPause, maxPause, minReps, maxReps, startWithPause) {
	this.intermittentSound = intermittentSound;
	this.minPause = minPause;
	this.maxPause = maxPause;
	this.minReps = minReps;
	this.maxReps = maxReps;
	this.startWithPause = startWithPause;
	
	//do I need this? copied from IntermittentSound
	this.isPlaying = false;
	
	// private variables
	var timerID;
	// Douglas Crockford told me to do this: http://www.crockford.com/javascript/private.html
	// It's a convention that allows private member functions to access the object
	// due to an error in the ECMAScript Language Specification
	var that = this;
	
	function pauseBetweenPlays() {
		if (that.numberOfReps > 0 && that.isPlaying) {
			var pauseDur = (that.maxPause - that.minPause) * Math.random() + that.minPause;
			timerID = window.setTimeout(nextIntermittentSound, pauseDur * 1000.);
		}
		that.numberOfReps--;
	}
	
	this.intermittentSound.completionCallback = pauseBetweenPlays; 
	
	// making this a private member function
	function nextIntermittentSound() {
		that.intermittentSound.play();
	}
	
	this.play = function() {
		// I guess we should include some check in case it's already playing...
		this.isPlaying = true;
		this.numberOfReps = Math.floor(((this.maxReps - this.minReps) + 1) * Math.random() + this.minReps);
		if (this.startWithPause) {
			var pauseDur = (that.maxPause - that.minPause) * Math.random() + that.minPause;
			timerID = window.setTimeout(nextIntermittentSound, pauseDur * 1000.);
		} else {
			nextIntermittentSound();
		}
	}
	
	this.stop = function() {
		this.isPlaying = false;
		this.intermittentSound.stop();
		window.clearTimeout(timerID); 
	}
	
	this.estimateDuration = function() {
		var intermittentSoundEstimate = this.intermittentSound.estimateDuration();
		var averageReps = (this.minReps + this.maxReps) / 2.0; 
		var averagePause = (this.minPause + this.maxPause) / 2.0;
		var estimate = intermittentSoundEstimate * (averageReps + 1.0) + averagePause * averageReps;
		if (this.startWithPause) {
			estimate += averagePause;
		}
		return estimate;
	}
}