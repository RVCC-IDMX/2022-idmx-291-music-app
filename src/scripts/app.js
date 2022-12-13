import {Synth, PolySynth, Transport, Draw, Volume, Players} from 'tone';
//import { Oscilloscope } from 'nexusui';
// import { Scene, PerspectiveCamera, IcosahedronGeometry, MeshLambertMaterial, WebGLRenderer, Mesh, AmbientLight, SpotLight, Vector3 } from 'three';
// import { createNoise3D } from 'simplex-noise';



//load drum samples - the way parcel likes it
const tom = require("url:../drum-samples/tom.wav");
const kick = require('url:../drum-samples/kick.mp3');
const hihat = require('url:../drum-samples/hihat.wav');
const clap = require('url:../drum-samples/clap.wav');

// get html elements
let overlay = document.querySelector('.overlay');
let playButton = document.querySelector('.play-pause-button');
let enterButton = document.querySelector('.overlay__group--button');
let playSvg = document.querySelector('.play');
let pauseSvg = document.querySelector('.pause');
let clearButton = document.querySelector('.clear');

//set variables
let notes = ['A4', 'G4', 'E4', 'D4', 'C4', 'A3'];
let drumNames = ['hihat', 'clap', 'tom', 'kick'];
let numRows = notes.length;
let totalRows = notes.length + drumNames.length;
let numCols = 16;
let noteInterval = `${numCols}n`;

//enterButton on welcome screen
enterButton.addEventListener('pointerdown', () => { 
    removeOverlay();

    //create context
    let context = new AudioContext();
    if (context.state !== 'running') context.resume();
})

enterButton.addEventListener('keydown', (e) => { 
    if (e.code === "Space" || e.code === "Enter") {     
        removeOverlay();

        //create context
        let context = new AudioContext();
        if (context.state !== 'running') context.resume();
    }
})

//playButton stuff
playButton.addEventListener('pointerdown', () => {
    updatePlayState();
});

playButton.addEventListener('keydown', (e) => {
    if (e.code === "Space" || e.code === "Enter") {
        updatePlayState();
    }
})

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
        playButton.ariaChecked = "true";
        Transport.start("+0.1");
    } else {
        playButton.dataset.playing = "false";
        playButton.ariaChecked = "false";
        Transport.stop();
        
    }
    reflectPlayState();
}

reflectPlayState();

//called when enter button on welcome screen is pressed
function removeOverlay() {
    overlay.classList.add('hide');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
}

//music time!
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

//make array of every cell - good to have
let allCells = cells.concat(drumCells).flat();

// create players for our drum sounds
const drumSamples = new Players({
    urls: {
        'hihat': hihat,
        'clap': clap,
        'tom': tom,
        'kick': kick,
    },
    onload: () => {
        console.log('loaded');
    },
    onerror: (error) => console.log(error),
}).toDestination();

// callback function for Tone.Transport.scheduleRepeat
// occurs in 16th note interval
//index corresponds to columns, i corresponds to sounds
let index = 0;
let repeat = (time) => {
    Draw.schedule(() => {
        for (let i = 0; i < numRows; i++) {
            //set variables
            let currentNote = notes[i];
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

//clear button
let clearSequencer = () => {
    for (let i = 0; i < allCells.length; i++) {
        allCells[i].checked = false;
    }
}

clearButton.addEventListener('pointerdown', clearSequencer);
clearButton.addEventListener('keydown', (e) => {
    if (e.code === "Space" || e.code === "Enter") {
        clearSequencer();
    }
});

//get ui for volume control
let volSlider = document.querySelector('#volume');
let volume = new Volume(-Infinity).toDestination();
polySynth.connect(volume);
drumSamples.connect(volume);
polySynth.volume.value = volSlider.value;
drumSamples.volume.value = volSlider.value;
volSlider.addEventListener('input', () => {
    polySynth.volume.value = volSlider.value;
    drumSamples.volume.value = volSlider.value;
})

//get ui for bpm control
let tempoSlider = document.querySelector('#tempo');
Transport.bpm.value = tempoSlider.value;
tempoSlider.addEventListener('input', () => {
    Transport.bpm.value = tempoSlider.value;
});

// get ui to choose oscillator
let chooseWaveform = document.querySelector('#synth-ctrl');
let waveformOptions = chooseWaveform.querySelectorAll("input");
waveformOptions.forEach((rButton) => {
    rButton.addEventListener('input', (e) => {
        if (e.target.checked) {
            polySynth.set({
                oscillator: {
                    type: e.target.value,
                }
            })
        }
    })
})

// create visualizer w threejs
//https://github.com/santosharron/audio-visualizer-three-js/blob/main/script.js
//used ^ to help, but it uses an older version of threejs...

//get analyser from webaudio api, not tonejs or threejs
// let analyser = context.createAnalyser();
// analyser.fftSize = 512;

// //connect analyser to our sources
// polySynth.chain(analyser, Destination);
// drumSamples.chain(analyser, Destination);

// //length is half the fft, create array to hold info
// let bufferLength = analyser.frequencyBinCount;
// let dataArray = new Uint8Array(bufferLength);

// //do threejs stuff
// let scene = new Scene();
// let camera = new PerspectiveCamera(45, 1, 1, 100);

// let renderer = new WebGLRenderer({ alpha: true, antialias: true });
// renderer.setSize(500, 500);
// document.body.appendChild(renderer.domElement);

// // geometry + material = ball mesh
// let icoGeo = new IcosahedronGeometry(1, 2);
// let lambertMaterial = new MeshLambertMaterial({
//     color: 0x9999ce,
//     wireframe: true
// });
// let ball = new Mesh(icoGeo, lambertMaterial);
// scene.add(ball);
// camera.position.z = 6;

// //lighting
// let ambientLight = new AmbientLight(0xbbbbbb);
// scene.add(ambientLight);

// let spotLight = new SpotLight(0xff00ff);
// spotLight.intesity = 0.3;
// spotLight.position.set(-5, 20, 10);
// spotLight.lookAt(ball);
// spotLight.castShadow = true;
// scene.add(spotLight);

// //helper functions
// let fractionate = (val, minVal, maxVal) => {
//     return (val - minVal) / (maxVal - minVal);
// }

// let modulate = (val, minVal, maxVal, outMin, outMax) => {
//     var fr = fractionate(val, minVal, maxVal);
//     var delta = outMax - outMin;
//     return outMin + (fr * delta);
// }

// let avg = (arr) => {
//     var total = arr.reduce(function (sum, b) { return sum + b; });
//     return (total / arr.length);
// }

// let max = (arr) => {
//     return arr.reduce(function (a, b) { return Math.max(a, b); })
// }
// //end helper functions

// let warpBall = (mesh, bassFr, treFr) => {
//     //get all the vertices
//     let posAtt = mesh.geometry.getAttribute('position');
//     //create vector3 to hold single vertex
//     let vertex = new Vector3();
//     //loop through each vertex
//     for (let i = 0; i < posAtt.count; i++) {
//         //get current vertex
//         vertex.fromBufferAttribute(posAtt, i);

//         //variables
//         let offset = mesh.geometry.parameters.radius;
//         var amp = 1;
//         var time = window.performance.now();

//         //normalize vertex - change distance to 1, just get direction (unit vector)
//         vertex.normalize();

//         //idk what this is, also don't understand noise...
//         var rf = 0.00001;
//         let noise3d = createNoise3D();

//         //calculate new distance based off of bass and treble frequencies
//         var distance = (offset + bassFr) + noise3d(vertex.x + time * rf * 7, vertex.y + time * rf * 8, vertex.z + time * rf * 9) * amp * treFr;

//         //multiply x y z values of vector by the new distance
//         vertex.multiplyScalar(distance);

//         //actually set the vertex to its new values
//         mesh.geometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
//     }
//     //need this for some reason or else verteces won't update
//     mesh.geometry.attributes.position.needsUpdate = true;
// }

// let render = () => {
//     analyser.getByteFrequencyData(dataArray);

//     var lowerHalfArray = dataArray.slice(0, (dataArray.length/2) - 1);
//     var upperHalfArray = dataArray.slice((dataArray.length/2) - 1, dataArray.length - 1);

//     var lowerMax = max(lowerHalfArray);
//     var upperAvg = avg(upperHalfArray);

//     var lowerMaxFr = lowerMax / lowerHalfArray.length;
//     var upperAvgFr = upperAvg / upperHalfArray.length;

//     warpBall(ball, modulate(Math.pow(lowerMaxFr, 1), 0, .5, 0, .2), modulate(upperAvgFr, 0, .5, 0, .5));

//     ball.rotation.y += 0.005;
//     ball.rotation.x += 0.002;
//     ball.rotation.z += 0.003;

//     renderer.render(scene, camera);
//     requestAnimationFrame(render);
// }

// render();



