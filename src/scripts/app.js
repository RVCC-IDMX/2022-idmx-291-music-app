import {Synth, PolySynth, Transport, Draw, Destination, context, Player, ToneAudioBuffers, MembraneSynth} from 'tone';
import {Sequencer, Number, Slider, Oscilloscope, Select} from 'nexusui';

// we can use nexusui for prototyping, then we can design + code our own UI
// elements to replace the nexusui elements as we go

//load drum samples - the way parcel likes it
const tom = require("url:../drum-samples/tom.wav");
const kick = require('url:../drum-samples/kick.wav');
const hihat = require('url:../drum-samples/hihat.wav');
const clap = require('url:../drum-samples/clap.wav');

// get html elements
let playButton = document.querySelector('.play-pause-button');
let playSvg = document.querySelector('.play');
let pauseSvg = document.querySelector('.pause');

//set variables
let notes = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'];
let drumNames = ['kick', 'clap', 'hihat', 'tom'];
let numRows = notes.length;
let numCols = 16;
let noteInterval = `${numCols}n`;

// don't initialize audio context until user interaction - in our case, pressing play button
playButton.addEventListener('pointerdown', () => {
    if (context.state !== 'running') context.resume();
    updatePlayState();
})

// create synth - poly synth bc we want polyphony
let polySynth = new PolySynth(Synth).toDestination();

// create UI sequencer from nexus (thank you nexus!!)
let sequencer = new Sequencer('#seq', {
    'size': [400, 200],
    'mode': 'toggle',
    'rows': numRows,
    'columns': numCols,
});

let drumSequencer = new Sequencer('#drum-seq', {
    'size': [400, 100],
    'mode': 'toggle',
    'rows': 4,
    'columns': numCols,
});

let player;
// create player for our drum sounds
const drumSamples = new ToneAudioBuffers({
    urls: {
        'kick': kick,
        'clap': clap,
        'hihat': hihat,
        'tom': tom,
    },
    onload: () => {
        console.log('loaded');
        player = new Player().toDestination();
    },
    onerror: (error) => console.log(error),
});

// every time the UI sequencer steps into the next column, store it
let column;
let drumColumn;
sequencer.on('step', (v) => {
    column = v;
})
drumSequencer.on('step', (v) => {
    drumColumn = v;
})

// callback function for Tone.Transport.scheduleRepeat
// occurs in 16th note interval
let repeat = (time) => {
    drumSequencer.next();
    sequencer.next();
    Draw.schedule(() => {
        for (let i = 0; i < numRows; i++) {
            let currentNote = notes[i];
            if (column[i] === 1 ) {
                polySynth.triggerAttackRelease(currentNote, "32n", time);
            }
            if (drumColumn[i] === 1) {
                player.buffer = drumSamples.get(drumNames[i]);
                player.start();
            }
        }
    }, time);
}
Transport.scheduleRepeat(repeat, noteInterval);

//create ui for bpm control
let bpmUI = new Number('#tempo-ctrl', {
    'size': [60, 30],
    'mode': 'relative',
    'value': 120,
    'min': 0,
    'max': 300,
    'step': 1,
});

Transport.bpm.value = bpmUI.value;
bpmUI.on('change', (v) => {
    Transport.bpm.value = v;
});

//create ui for volume control
let volSlider = new Slider('#vol-ctrl', {
    'size': [150, 50],
    'mode': 'relative',
    'min': -30,
    'max': 0,
    'step': 1,
    'value': -20,
});
polySynth.volume.value = volSlider.value;
volSlider.on('change', (v) => {
    polySynth.volume.value = v;
})

// create ui to choose oscillator
let select = new Select('#synth-ctrl', {
    'size': [100, 30],
    'options': ['sine', 'triangle', 'sawtooth', 'square'],
});
polySynth.set({
    oscillator: {
        type: select.value,
    }
})
select.on('change', (v) => {
    polySynth.set({
        oscillator: {
            type: select.value,
        }
    })
});

// visualizer
let oscilloscope = new Oscilloscope('#oscope', {
    'size': [800, 150]
});
oscilloscope.connect(Destination);


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
        Transport.start();
    } else {
        playButton.dataset.playing = "false";
        Transport.stop();
        
    }
    reflectPlayState();
}

reflectPlayState();


