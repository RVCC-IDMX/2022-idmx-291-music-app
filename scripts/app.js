\
import * as Tone from 'tone';
import * as Nexus from 'nexusui';

// get html elements
let playButton = document.querySelector('.play-pause-button');
let playSvg = document.querySelector('.play');
let pauseSvg = document.querySelector('.pause');

//set variables
let notes = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'];
let numRows = notes.length;
let numCols = 16;
let noteInterval = `${numCols}n`;

// don't initialize audio context until user interaction - in our case, pressing play button
playButton.addEventListener('pointerdown', () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
    updatePlayState();
})

// create synth - poly synth bc we want polyphony
let polySynth = new Tone.PolySynth(Tone.Synth).toDestination();
polySynth.set({
    oscillator: {
        type: 'sine'
    }
})

// create UI sequencer from nexus (thank you nexus!!)
let sequencer = new Nexus.Sequencer('#seq', {
    'size': [400, 200],
    'mode': 'toggle',
    'rows': numRows,
    'columns': numCols,
});

// every time the UI sequencer steps into the next column, store it
let column;
sequencer.on('step', (v) => {
    column = v;
})

// callback function for Tone.Transport.scheduleRepeat
// occurs in 16th note interval
let repeat = (time) => {
    sequencer.next();
    for (let i = 0; i < numRows; i++) {
        let currentNote = notes[i];
        if (column[i] === 1) {
            polySynth.triggerAttackRelease(currentNote, "32n", time);
        }
    }
}

Tone.Transport.scheduleRepeat(repeat, noteInterval);

//we can make user control this
Tone.Transport.bpm.value = 80;


// for play/pause button
let reflectPlayState = () => {
    if (playButton.dataset.playing === "false") {
        playSvg.style.display = 'block';
        pauseSvg.style.display = 'none';
    } else {
        playSvg.style.display = 'none';
        pauseSvg.style.display = 'block';
    }
}

// start/stop sound based on play/pause button
let updatePlayState = () => {
    if (playButton.dataset.playing === "false") {
        playButton.dataset.playing = "true";
        Tone.Transport.start();
    } else {
        playButton.dataset.playing = "false";
        Tone.Transport.stop();
        
    }
    reflectPlayState();
}

reflectPlayState();


