/**
 * 
 */

var app = require('express')();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var directoryPrefix = '/sounds/compressed/';
var folderNameArray = ['BenFTW',
                       'b1rds3y3',
                       'bogaloogaloo',
                       'brice',
                       'bridgesandstructuresbuilding',
                       'Elianna',
                       'EliannaP',
                       'EliannaPa',
                       'Emma Cohen',
                       'Emma Cohen 2',
                       'Emma Cohen 3',
                       'Hello!',
                       'JonnyWang2',
                       'JonnyWang3',
                       'JonnyWangGTCMT',
                       'papertoweltubegoatee',
                       'professorbirdwithaphd',
                       'Recording2',
                       'Test3',
                       'TheBirdIsTheWoooord',
                       'tobleronemaster',
                       'windvalley'];


var latestControlPhrase = 0;
var checkpoint = false;
//checkpoints are as follows:
// 1-5, 6-7, 8-13, 14-19, 20-21, 22-24, 25, 26-27, (28, 29)
var checkpointPhrases = [0, 5, 7, 13, 19, 21, 24, 25, 27, 28, 29, 9999];

var listenerCount = 0;
var choristerCount = 0;
var supremeLeaderCount = 0;

app.get('/', function(req, res){
	  res.sendFile(__dirname + '/vivaldiIndex.html');
});

app.get('/score', function(req, res){
	res.sendFile(__dirname + '/chirpscore.html');
});

app.get('/controller', function(req, res){
	res.sendFile(__dirname + '/vivaldiCommand.html');
});

app.get('/test', function(req, res){
	res.sendFile(__dirname + '/birdcommand4.html');
});

app.get(/^(.*)$/, function(req, res){
	//console.log(req.params[0]);
	res.sendFile(__dirname + req.params[0]);
});

io.on('connection', function(socket){
  //console.log('a user connected');
  socket.on('disconnect', function(){
	  if (socket.birdType == "listener") {
		  listenerCount--;
		  console.log('listener disconnected; listeners remaining: ' + listenerCount);
	  } else if (socket.birdType == "chorister") {
		  choristerCount--;
		  console.log('chorister disconnected; choristers remaining: ' + choristerCount);
	  } else if (socket.birdType == "supreme leader") {
		  supremeLeaderCount--;
		  console.log('supreme leader disconnected; supreme leaders remaining: ' + supremeLeaderCount);
	  } else {
		  console.log('mystery user disconnected');
	  }
  });
  socket.on('control message', function(msg){
	  //these are coming from chirpcommand and going to birdindex
	  console.log('control message: ' + msg);
	  if (msg == "continue") {
		  //this is goofy, but just add 1000 to the latestControlPhrase to generate a new cue for listeners...
		  io.emit('control message', latestControlPhrase + 1000);
		  io.emit('new checkpoint', checkpoint);
		  console.log("moving on to the next checkpoint: " + checkpoint);
	  } else {
		  latestControlPhrase = parseInt(msg, 10);
		  //console.log("latestControlPhrase: " + latestControlPhrase);
		  io.emit('control message', msg);
		  for (phrase in checkpointPhrases) {
			  if (checkpointPhrases[phrase] == latestControlPhrase) {
				  if (checkpointPhrases.length > phrase) {
					  checkpoint = checkpointPhrases[parseInt(phrase, 10) + 1];
				  }
			  }
		  }
		  /*
		  if (!latestControlPhrase) {
			  io.emit('new checkpoint', checkpoint);
		  }
		  */
	  }
  });
  socket.on('checkpoint', function(msg){
	  //uh, maybe this is unused? Did I replace this with "new checkpoint"?
	  //apparently so; the log below hasn't been printed since last time I opened this shell...
	  //the rule is that no one can proceed past a checkpoint until I do...
	  //io.emit('control message', msg);
	  console.log('checkpoint: ' + msg);
  });
  socket.on('message', function(msg){
	    io.emit('message', msg);
	    console.log('message: ' + msg);
  });
  socket.on('i am', function(msg){
	    //io.emit('message', msg);
	  	//add a property that is name, so we can know who's disconnecting as well
	    if (msg == 'listener') {
	    	socket.birdType = msg;
	    	listenerCount++;
	    	console.log("listener connected; listeners: " + listenerCount);
	    	for (var i = 1; i <= 29; i++) {
	    		var randomFolder = folderNameArray[Math.floor(Math.random() * folderNameArray.length)];
	    		var fileToPush = __dirname + directoryPrefix + randomFolder + '/Birds' + i + '.mp3';
	    		pushSoundToClient(fileToPush, i, socket);
	    	}
	    } else if (msg == 'chorister') {
	    	//socket.emit('new checkpoint', checkpoint);
	    	socket.birdType = msg;
	    	choristerCount++;
	    	console.log("chorister connected; choristers: " + choristerCount);
	    } else if (msg == 'supreme leader') {
	    	socket.birdType = msg;
	    	supremeLeaderCount++;
	    	console.log("supreme leader connected; supreme leaders: " + supremeLeaderCount);
	    } else {
	    	console.log("mystery user connected");
	    }
  });
  socket.on('make dir', function(msg){
	  //io.emit('chat message', msg);
	  fs.mkdir(msg, function(err) {
		  if(err) {
			  console.log("FOOL! " + err);
		  } else {
			  console.log('new directory: ' + msg);
		  }
	  });
  });
  socket.on('post audio', function(msg){
	  console.log(Date.now());
	  //io.emit('chat message', msg);
	  // + "/Birds" + currentPoemLine + ".wav"
	  var birdFileName = msg[1] + "/Birds" + msg[2] + ".wav";
	  fs.writeFile(birdFileName, msg[0], 'base64', function(err) {
		  if(err) {
			  console.log("FOOL! " + err);
		  } else {
			  console.log(Date.now());
			  console.log('posting file ' + birdFileName);
			  //loadSound(msg[2], socket);
			  //io.emit('chat message', msg[2]);
		  }
	  });
	  //console.log('posting file...');
  });
  socket.emit('audio', { audio: true, buffer: referenceTone, index: 0 });
  socket.emit('get type', 'because you just connected!');
});

function pushSoundToClient(filename, bufferIndex, socket) {
	//console.log('Pushing ' + filename + ' to buffer index ' + bufferIndex + ' on socket ' + socket);
	fs.readFile(filename, function(err, buf){
		if (err) {
			console.log("Error: " + err);
		} else {
			//console.log('audio index:' + bufferIndex);
		    socket.emit('audio', { audio: true, buffer: buf, index: bufferIndex });
		}
	});
}

var referenceTone;
var fileToRead = __dirname + '/sounds/Fl_G4b.wav';
fs.readFile(fileToRead, function(err, buf){
	// loading pitch reference/test file
	if (err) {
		console.log("Error: " + err);
	} else {
		referenceTone = buf;
		console.log('pitch reference loaded');
	}
});

// is it possible that we could start listening and someone could connect before referenceTone is loaded?
http.listen(8200, function(){
  console.log('listening on *:8200');
});

