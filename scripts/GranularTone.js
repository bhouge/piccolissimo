/**
 * GranularTone
 * by Ben Houge
 * A pretty straightforward granular synthesis implementation based on a provided waveform.
 * Uses a half sine window by default, but that can be overridden.
 * Right now grains are synchronous; I may add a random offset at some point.
 * Pitch has no randomness, but you can provide an array, and one will be chosen at random when you play a tone
 * You can play a granularTone three ways:
 * basic play will choose a duration within the range specified and play a steady granular tone for that duration,
 * playRandomPhrase will allow you to specify a min/max number of repeats, and several phrases will play consecutively,
 * playDescendingPhrase picks a note, then keeps picking lower notes until it gets to the bottom; it will continue
 * this behavior until it reaches the specified timeout.
 * All of these behaviors have some end state that is chosen at the beginning, precluding the possibility
 * that notes will get stuck on if a network event doesn't come through for whatever reason.
 * 
 */

// creating a GranularPhrase object with an object constructor
function GranularTone(buffer, minToneDur, maxToneDur, grainInterval, minGrainDur, maxGrainDur, minVol, maxVol, pitch) {
	this.buffer = buffer;
	this.minToneDur = minToneDur;
	this.maxToneDur = maxToneDur;
	this.toneDur;
	this.grainInterval = grainInterval;
	this.minGrainDur = minGrainDur;
	this.maxGrainDur = maxGrainDur;
	this.minVol = minVol;
	this.maxVol = maxVol;
	this.outputNode;
	this.isPlaying = false;
	this.grainWindow = (function() {
		//Set half sine up as default, but allow it to be overridden
		var grainWindow;
		var grainWindowLength = 16384;
		grainWindow = new Float32Array(grainWindowLength);
		for (var i = 0; i < grainWindowLength; ++i)
		    grainWindow[i] = Math.sin(Math.PI * i / grainWindowLength);
		return grainWindow;
	})();
	this.targetTime;

	// should this all be made private?
	this.pitchArray = [];
	if (typeof(pitch) == 'number') {
		this.pitchArray.push(pitch);
	} else {
		this.pitchArray = pitch.sort();
	}
	this.currentPitch;
	this.lastPitch = 0.;
	this.minReps = 0;
	this.maxReps = 0;
	this.phraseDur = 0.;
	
	var grainTimerID;
	var phraseTimerID;
	var numberOfReps;
	var descendingTargetTime;
	var octaveMultiplier;
	var isDescending;
	// remember, we do this so that we can access member variables in private functions
	// http://www.crockford.com/javascript/private.html
	var that = this;
	
	function playGrain(bufferToPlay, grainDuration, pitchMultiplier, volume) {
		// this will be in seconds, adjusted for pitch
		var bufferDuration = (bufferToPlay.length/bufferToPlay.sampleRate)/pitchMultiplier;
		var startTime;
		if (grainDuration > bufferDuration) {
			grainDuration = bufferDuration;
			startTime = 0;
		} else {
			startTime = (bufferDuration - grainDuration) * Math.random() * pitchMultiplier;
		}
		
		var context = that.outputNode.context;
		var fileNode = context.createBufferSource();
		var gainNode = context.createGain();
		var gainNode2 = context.createGain();
		gainNode.connect(gainNode2);
		gainNode2.connect(that.outputNode);
		gainNode2.gain.value = volume;
		fileNode.buffer = bufferToPlay;	
		fileNode.connect(gainNode);
		fileNode.playbackRate.value = pitchMultiplier;
		fileNode.start(0., startTime, grainDuration * pitchMultiplier);
		gainNode.gain.setValueCurveAtTime(that.grainWindow, 0., grainDuration);
	}
	
	function scheduledGrainPlayer() {
		// play grain
		// calculate next grain time
		// if next grain time < toneEndTime, schedule next grain

		var grainDensity = 1. / that.grainInterval;
		var grainDuration = (that.maxGrainDur - that.minGrainDur) * Math.random() + that.minGrainDur;
		var volume = (that.maxVol - that.minVol) * Math.random() + that.minVol;
		playGrain(that.buffer, grainDuration, that.currentPitch, volume);
		//remember, all in seconds...
		//var timeToNextGrain = (2. * grainInterval) * Math.random();
		var timeToNextGrain = that.grainInterval;
		var nextGrainTime = that.outputNode.context.currentTime + timeToNextGrain;
		if (nextGrainTime < that.targetTime && that.isPlaying) {
			//remember, setTimeout wants ms...
			var timeToNextGrainInMs = timeToNextGrain * 1000.;
			if (timeToNextGrainInMs < 10.) {
				timeToNextGrainInMs = 10.;
			}
			grainTimerID = window.setTimeout(scheduledGrainPlayer, timeToNextGrainInMs);
		} else {
			that.isPlaying = false;
		}
	}
	
	function scheduledPhrasePlayer() {
		var currentPhraseDur = that.play();
		if (numberOfReps > 0) {
			phraseTimerID = window.setTimeout(scheduledPhrasePlayer, currentPhraseDur * 1000.)
			numberOfReps--;
		} else if (that.outputNode.context.currentTime < descendingTargetTime || 
				that.pitchArray.indexOf(that.lastPitch) != 0) {
			phraseTimerID = window.setTimeout(scheduledPhrasePlayer, currentPhraseDur * 1000.)
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
	
	this.play = function() {
		this.isPlaying = true;
		//note that these are in seconds
		this.toneDur = (this.maxToneDur - this.minToneDur) * Math.random() + this.minToneDur;
		
		if (this.pitchArray.length > 1) {
			if (isDescending) {
				if (this.lastPitch == this.pitchArray[0]) {
					// pick any index except the first one
					this.currentPitch = this.pitchArray[Math.floor((Math.random() * (this.pitchArray.length - 1))) + 1];
				} else {
					// pick any index that's less than the last one
					var maxIndex = this.pitchArray.indexOf(this.lastPitch);
					if (maxIndex <= 0) {
						maxIndex = this.pitchArray.length;
					}
					var newIndex = Math.floor(Math.random() * maxIndex);
					this.currentPitch = this.pitchArray[newIndex];
				}
			} else {
				do {
					this.currentPitch = this.pitchArray[Math.floor((Math.random() * this.pitchArray.length))];
				} while (this.currentPitch == this.lastPitch);
			}
			this.lastPitch = this.currentPitch;
		} else {
			this.currentPitch = this.pitchArray[0];
		}
		
		that.startTime = this.outputNode.context.currentTime;
		this.targetTime = that.startTime + this.toneDur;
		scheduledGrainPlayer();
		return this.toneDur;
	}
	
	this.playRandomPhrase = function(minReps, maxReps, octaveShift) {
		isDescending = false;
		this.minReps = minReps;
		this.maxReps = maxReps;
		this.phraseDur = 0.;
		numberOfReps = Math.floor(((maxReps - minReps) + 1) * Math.random() + minReps);
		octaveMultiplier = 1 + Math.floor((octaveShift + 1) * Math.random());
		if (octaveMultiplier > 1.) {
			this.minVol *= 0.5;
			this.maxVol *= 0.5;
		}
		scheduledPhrasePlayer();
	}
	
	this.playDescendingPhrase = function(phraseDuration, octaveShift) {
		isDescending = true;
		this.minReps = 0;
		this.maxReps = 0;
		this.phraseDur = phraseDuration;
		descendingTargetTime = this.outputNode.context.currentTime + phraseDuration;
		numberOfReps = 0;
		octaveMultiplier = 1 + Math.floor((octaveShift + 1) * Math.random());
		if (octaveMultiplier > 1.) {
			this.minVol *= 0.5;
			this.maxVol *= 0.5;
		}
		scheduledPhrasePlayer();
	}

	this.stop = function() {
		this.isPlaying = false;
		window.clearTimeout(grainTimerID);
		window.clearTimeout(phraseTimerID);
	}
}


