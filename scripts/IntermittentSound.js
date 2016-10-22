/**
 * IntermittentSound
 * by Ben Houge
 * IntermittentSound encapsulates the functionality of a sound that repeats intermittently, appropriately enough.
 * It's a technique I've used in many of my pieces (dating back to graphic score 'A Reading from _____' in 2003): 
 * Specify a buffer of PCM data, min/max repeats, and min/max pause between repeats.
 * Note that we're talking repeats, not plays; when you press play, it will always play at least once.
 */

// creating an intermittentSound object with an object constructor
function IntermittentSound(buffer, minPause, maxPause, minReps, maxReps, minVol, maxVol, minDur, maxDur, pitchArray, startWithPause, completionCallback) {
	//alert(this);
	this.buffer = buffer;
	this.minPause = minPause;
	this.maxPause = maxPause;
	this.minReps = minReps;
	this.maxReps = maxReps;
	this.minVol = minVol;
	this.maxVol = maxVol;
	this.minDur = minDur;
	this.maxDur = maxDur;
	this.outputNode;
	this.isPlaying = false;
	this.pitchArray = pitchArray;
	this.startWithPause = startWithPause;
	this.completionCallback = completionCallback;
	
	this.dur = Math.random() * (this.maxDur - this.minDur) + this.minDur;
	if (this.dur > this.buffer.duration) {
		this.dur = this.buffer.duration;
		this.startTime = 0;
	} else {
		this.startTime = Math.random() * (this.buffer.duration - this.dur);
	}
	
	// private variables
	var timerID;
	// Douglas Crockford told me to do this: http://www.crockford.com/javascript/private.html
	// It's a convention that allows private member functions to access the object
	// due to an error in the ECMAScript Language Specification
	var that = this;
	
	function playBuffer(bufferIndex, volume, pitch) {
		//somewhere in here we should probably error check to make sure an outputNode with an audioContext is connected
		//var newNow = that.outputNode.context.currentTime + 0.1;
		var audioBufferSource = that.outputNode.context.createBufferSource();
		audioBufferSource.buffer = bufferIndex;
		audioBufferSource.playbackRate.value = pitch;
		audioBufferGain = that.outputNode.context.createGain();
		//audioBufferGain.gain.value = volume;
		//audioBufferGain.gain.setValueAtTime(0., newNow);
		//audioBufferGain.gain.setValueAtTime(0., that.outputNode.context.currentTime);
		audioBufferSource.connect(audioBufferGain);
		audioBufferGain.connect(that.outputNode);
		try {
			//audioBufferSource.start(newNow, that.startTime, that.dur);
			
			//alert(that.outputNode.context.currentTime);
			//audioBufferGain.gain.linearRampToValueAtTime(volume, newNow + 0.05);
			
			audioBufferGain.gain.linearRampToValueAtTime(0.0, that.outputNode.context.currentTime);
			audioBufferGain.gain.linearRampToValueAtTime(volume, that.outputNode.context.currentTime + 0.05);
			audioBufferGain.gain.linearRampToValueAtTime(volume, that.outputNode.context.currentTime + that.dur - 0.05);
			audioBufferGain.gain.linearRampToValueAtTime(0.0, that.outputNode.context.currentTime + that.dur);
			
			audioBufferSource.start(that.outputNode.context.currentTime, that.startTime, that.dur);
		} catch(e) {
			alert(e);
		}		
	}
	
	// making this a private member function
	function tickDownIntermittentSound() {
		var volume = (that.maxVol - that.minVol) * Math.random() + that.minVol;
		var pitchIndex = Math.floor(Math.random() * that.pitchArray.length); 
		var pitch = pitchClassToMultiplier(that.pitchArray[pitchIndex][0], that.pitchArray[pitchIndex][1]);
		playBuffer(that.buffer, volume, pitch);
		//var bufferDur = that.buffer.duration;
		// not anymore, now I'm specifying this, right?
		var bufferDur = that.dur;
		if (that.numberOfReps > 0 && that.isPlaying) {
			var pauseDur = (that.maxPause - that.minPause) * Math.random() + that.minPause;
			timerID = window.setTimeout(tickDownIntermittentSound, (pauseDur + bufferDur/pitch) * 1000.);
		} else {
			timerID = window.setTimeout(finishedPlaying, (bufferDur/pitch) * 1000.);
		}
		that.numberOfReps--;
	}
	
	function finishedPlaying() {
		//alert(that);
		that.isPlaying = false;
		//console.log("this is how we know an intermittent sound is done, right?");
		if (that.completionCallback) {
			that.completionCallback();
		}
	}
	
	function pitchClassToMultiplier(octave, interval) {
		var multiplier = Math.pow(2., (12. * octave + interval) / 12.);
		return multiplier;
	}
	
	this.play = function() {
		this.isPlaying = true;
		this.numberOfReps = Math.floor(((this.maxReps - this.minReps) + 1) * Math.random() + this.minReps);
		if (this.startWithPause) {
			var pauseDur = (that.maxPause - that.minPause) * Math.random() + that.minPause;
			timerID = window.setTimeout(tickDownIntermittentSound, pauseDur * 1000.);
		} else {
			tickDownIntermittentSound();
		}
	}
	
	this.stop = function() {
		if (this.isPlaying) {
			window.clearTimeout(timerID);
			this.isPlaying = false;
			finishedPlaying();
		}
	}
	
	this.connect = function(nodeToConnectTo) {
		try {
			if (nodeToConnectTo.destination) {
				this.outputNode = nodeToConnectTo.destination;
			} else {
				this.outputNode = nodeToConnectTo;
			}
		} catch(e) {
			alert("It seems you have not specified a valid node.");
		}
	}
	
	this.estimateDuration = function() {
		var midiPitchArray = [];
		for (var i = 0; i < this.pitchArray.length; i++) {
			var midiPitch = this.pitchArray[i][0] * 12;
			midiPitch += this.pitchArray[i][1];
			midiPitchArray.push(midiPitch);
		}
		var averagePitch = 0;
		for (var i = 0; i < midiPitchArray.length; i++) {
			averagePitch += midiPitchArray[i];
		}
		averagePitch = averagePitch / midiPitchArray.length;
		averagePitch = pitchClassToMultiplier(0, averagePitch);
		var averageDur = ((this.minDur + this.maxDur) / 2.0) / averagePitch;
		var averageReps = (this.minReps + this.maxReps) / 2.0; 
		var averagePause = (this.minPause + this.maxPause) / 2.0;
		var estimate = averageDur * (averageReps + 1.0) + averagePause * averageReps;
		if (this.startWithPause) {
			estimate += averagePause;
		}
		return estimate;
	}
}
