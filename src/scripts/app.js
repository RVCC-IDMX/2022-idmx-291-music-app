import {Synth, PolySynth, Transport, Draw, Destination, context, Volume, Players} from 'tone';
import {Number, Slider, Oscilloscope, Select} from 'nexusui';

// we can use nexusui for prototyping, then we can design + code our own UI
// elements to replace the nexusui elements as we go

//load drum samples - the way parcel likes it
const tom = require("url:../drum-samples/tom.wav");
const kick = require('url:../drum-samples/kick.mp3');
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

// get synth sequencer
let cells = [];
for (let i = 0; i < numCols; i++) {
    let currentCol = document.querySelectorAll(`.sequencer__column:nth-child(${i + 1}) .cell`);
    cells.push(Array.from(currentCol));
}

// get separate drum sequencer
let drumCells = [];
for (let i = 0; i < numCols; i++) {
    let currentCol = document.querySelectorAll(`.drum-seq__column:nth-child(${i + 1}) .cell`);
    drumCells.push(Array.from(currentCol));
}


// create players for our drum sounds
const drumSamples = new Players({
    urls: {
        'kick': kick,
        'clap': clap,
        'hihat': hihat,
        'tom': tom,
    },
    onload: () => {
        console.log('loaded');
    },
    onerror: (error) => console.log(error),
}).toDestination();

let index = 0;
// callback function for Tone.Transport.scheduleRepeat
// occurs in 16th note interval
let repeat = (time) => {
    Draw.schedule(() => {
        for (let i = 0; i < numRows; i++) {
            //set variables
            let currentNote = notes[numRows - (i + 1)];
            let currentColumn = cells[index].concat(drumCells[index]);
            let synthCol = cells[index];
            let drumCol = drumCells[index];
            let previousColumn = (index === 0)
                ? cells[numCols - 1].concat(drumCells[numCols - 1])
                : cells[index - 1].concat(drumCells[index - 1]);
            
            //signal that the column is being played
            currentColumn.forEach(cell => {
                cell.classList.add('my-turn');
            });
            previousColumn.forEach(cell => {
                cell.classList.remove('my-turn');
            })

            //play the correct sound
            if (synthCol[i].checked) {
                polySynth.triggerAttackRelease(currentNote, "32n", time);
            }
            if (drumCol[i]?.checked) {
                let currentSample = drumSamples.player(drumNames[i]);
                currentSample.start(0, 0, "16n");
            }
        }
        //next column
        index++;
        index = index % 16;
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
bpmUI.colorize("accent", "rgb(153, 153, 206)");

Transport.bpm.value = bpmUI.value;
bpmUI.on('change', (v) => {
    Transport.bpm.value = v;
});

//create ui for volume control
let volSlider = new Slider('#vol-ctrl', {
    'size': [150, 50],
    'mode': 'relative',
    'min': -60,
    'max': 0,
    'step': 1,
    'value': -30,
});
volSlider.colorize("accent", "rgb(153, 153, 206)");
let volume = new Volume(-Infinity).toDestination();
polySynth.connect(volume);
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
select.colorize("accent", "rgb(153, 153, 206)");

// visualizer
let oscilloscope = new Oscilloscope('#oscope', {
    'size': [300, 150]
});
oscilloscope.connect(Destination);
oscilloscope.colorize("accent", "rgb(153, 153, 206)");
oscilloscope.colorize("fill", "rgb(219, 219, 219)");

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


