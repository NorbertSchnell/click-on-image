const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const defaultImageFadeTime = 2;
const defaultAudioFadeTime = 0.1;

const nodes = {
  /////////////////////////////////////////////////////////////////
  cat: { // node name
    image: { // image parameters
      fileName: "cat.png", // image file name
      fadeTime: 2, // duration of fade from the last image to this one
    },
    audio: { // audio parameters
      fileName: "cat.wav", // sound file name
      gainInDb: 0, // gain in dB
      loop: false, // whether the sound is looped
      sync: false, // whether the sound is started with an offset to allow sounds with the same duration to be in phase
      fadeInTime: 0, // fade-in duration
      fadeOutTime: 0.1, // fade-out duration
    },
    points: [ // list of link points
      {
        coordinates: [0.423713, 0.464627], // x and y coordinates of the point
        size: 5, // size (diameter) of the point
        target: "dog", // target node
      }, {
        coordinates: [0.494841, 0.565965],
        size: 4,
        target: "fish",
      }, {
        coordinates: [0.564823, 0.464627],
        size: 5,
        target: "elefant",
      }
    ]
  },
  /////////////////////////////////////////////////////////////////
  dog: {
    image: {
      fileName: "dog.png",
      fadeTime: 2,
    },
    audio: {
      fileName: "dog.wav",
      gainInDb: 0,
      loop: false,
      sync: false,
      fadeInTime: 0,
      fadeOutTime: 0.1,
    },
    gain: 0,
    points: [
      {
        coordinates: [0.537110, 0.193116],
        size: 2,
        target: "cat",
      }, {
        coordinates: [0.546789, 0.288718],
        size: 3.5,
        target: "fish",
      }, {
        coordinates: [0.601641, 0.223709],
        size: 2,
        target: "elefant",
      }
    ]
  },
  /////////////////////////////////////////////////////////////////
  fish: {
    image: {
      fileName: "fish.png",
      fadeTime: 2,
    },
    audio: {
      fileName: "fish.wav",
      gainInDb: 0,
      loop: false,
      sync: false,
      fadeInTime: 0,
      fadeOutTime: 0.1,
    },
    gain: 0,
    points: [
      {
        coordinates: [0.125497, 0.533460],
        size: 4.5,
        target: "dog",
      }, {
        coordinates: [0.431965, 0.439770],
        size: 6,
        target: "cat",
      }, {
        coordinates: [0.436391, 0.864244],
        size: 8,
        target: "elefant",
      }
    ]
  },
  /////////////////////////////////////////////////////////////////
  elefant: {
    image: {
      fileName: "elefant.png",
      fadeTime: 2,
    },
    audio: {
      fileName: "elefant.wav",
      gainInDb: 0,
      loop: true,
      sync: false,
      fadeInTime: 2,
      fadeOutTime: 4,
    },
    gain: 0,
    points: [
      {
        coordinates: [0.186982, 0.441682],
        size: 8,
        target: "dog",
      }, {
        coordinates: [0.587042, 0.270220],
        size: 3,
        target: "fish",
      }, {
        coordinates: [0.796451, 0.434034],
        size: 2,
        target: "cat",
      }
    ]
  }
};

// constants and state variables
const nodeKeys = Object.keys(nodes);
const imageContainer = document.getElementById('image-container');
const pointContainer = document.getElementById('point-container');
let lastNode = null;
let currentNode = null;
let fadeStartTime = Infinity;
let currentSound = null;

// register event listeners
window.addEventListener('resize', fitNodesToScreen);
window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('keyup', onKeyUp, false);
pointContainer.addEventListener('click', onPointContainerClick);

// load images and sounds
let numItemsToLoad = 2 * nodeKeys.length;
initNodes();

// load images of all nodes
async function initNodes() {
  for (let key in nodes) {
    const node = nodes[key];
    const img = new Image();

    // add image to node
    node.image.element = img;

    // when image is loaded
    img.addEventListener('load', () => {
      // insert image into container
      imageContainer.appendChild(img);

      // start when everything is loaded
      if (--numItemsToLoad == 0) {
        startAtFirstNode();
      }
    });

    // assign and load image file
    img.src = `images/${node.image.fileName}`;

    // load audio file
    const audioContext = new AudioContext();
    fetch(`sounds/${node.audio.fileName}`)
      .then(data => data.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(decodedAudio => {
        // assign loaded audio buffer
        node.audio.buffer = decodedAudio;
        if (--numItemsToLoad == 0) {
          startAtFirstNode();
        }
      });
  }
}

// start from the beginning
function startAtFirstNode() {
  const keyOfFirstNode = nodeKeys[0];
  currentNode = nodes[keyOfFirstNode];
  currentNode.image.element.style.opacity = 1;
  fitNodesToScreen();
  displayPoints(currentNode);
}

// perfom cross-fade in animation loop
function crossFadeImages() {
  const now = 0.001 * performance.now();
  const imageIn = currentNode.image;
  const imageOut = lastNode.image;

  const fadeTime = imageIn.fadeTime || defaultImageFadeTime;
  const fadeInOpacity = Math.min(1, (now - fadeStartTime) / fadeTime);
  const fadeOutOpacity = 1 - fadeInOpacity;

  // set opacity (square looks better)
  imageIn.element.style.opacity = fadeInOpacity * fadeInOpacity;
  imageOut.element.style.opacity = fadeOutOpacity * fadeOutOpacity;

  if (now >= fadeStartTime + fadeTime) {
    // cross-fade completed
    lastNode = null;
    displayPoints(currentNode);
  } else {
    // still cross-fading
    requestAnimationFrame(crossFadeImages);
  }
}

function startSound(node) {
  const time = audioContext.currentTime;

  // fade current sound out and stop
  if (currentSound !== null) {
    currentSound.sourceNode.stop(time + currentSound.fadeOutTime);
    currentSound.gainNode.gain.setValueAtTime(currentSound.gainFactor, time);
    currentSound.gainNode.gain.linearRampToValueAtTime(0, time + currentSound.fadeOutTime);
  }

  const audio = node.audio;
  const gainFactor = decibelToLinear(audio.gainInDb );
  const fadeInTime = audio.fadeInTime || defaultAudioFadeTime;
  let offset = node.sync ? (time - loopStartTime) % audio.buffer.duration : 0;

  // create gain node (for fade-in and intensity)
  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(gainFactor, time + fadeInTime);

  // create buffer source (for sound playback)
  const source = audioContext.createBufferSource();
  source.connect(gain);
  source.buffer = audio.buffer;
  source.loop = !!audio.loop;
  source.start(time, offset);

  currentSound = {
    sourceNode: source,
    gainNode: gain,
    fadeOutTime: audio.fadeOutTime || defaultAudioFadeTime,
    gainFactor: gainFactor,
  };
}

// fit images of current and last node to screen
function fitNodesToScreen() {
  if (currentNode !== null) {
    fitImageToScreen(currentNode.image.element);
    fitPointContainerToNode(currentNode);
  }

  if (lastNode !== null) {
    fitImageToScreen(lastNode.image.element);
  }
}

function fitImageToScreen(image) {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;
  const imageRatio = (imageWidth / imageHeight);
  const containerWidth = imageContainer.clientWidth;
  const containerHeight = imageContainer.clientHeight;
  const containerRatio = (containerWidth / containerHeight);

  if (imageRatio >= containerRatio) {
    image.style.width = `${containerWidth}px`;
    image.style.height = `${containerWidth / imageRatio}px`;
    image.style.left = 0;
    image.style.top = `${0.5 * containerHeight - 0.5 * imageHeight * containerWidth / imageWidth}px`;
  } else {
    image.style.width = `${containerHeight * imageRatio}px`;
    image.style.height = `${containerHeight}px`;
    image.style.left = `${0.5 * containerWidth - 0.5 * imageWidth * containerHeight / imageHeight}px`;
    image.style.top = 0;
  }
}

function fitPointContainerToNode(node) {
  pointContainer.style.cssText = node.image.element.style.cssText;
  pointContainer.style.opacity = 1;
  pointContainer.style.zIndex = 1;
}

// display points of given node
function displayPoints(node) {
  const points = node.points;

  for (let point of points) {
    const rect = pointContainer.getBoundingClientRect();
    const size = 0.01 * rect.width * point.size;
    const div = document.createElement('div');

    div.classList.add('point');
    div.style.left = `${100 * point.coordinates[0]}%`;
    div.style.top = `${100 * point.coordinates[1]}%`;
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.marginLeft = `${-0.5 * size}px`;
    div.style.marginTop = `${-0.5 * size}px`;

    div.dataset.target = point.target;
    div.addEventListener('click', onPointClick);

    pointContainer.appendChild(div);
  }
}

// handle click on link point --> advance to target
function onPointClick(evt) {
  if (audioContext === null) {
    // create audio context on first click
    audioContext = new AudioContext();
  }

  if (!evt.shiftKey) {
    const now = 0.001 * performance.now();

    // handle click when we are not cross-fading
    const eventTarget = evt.target;
    let targetNode = nodes[eventTarget.dataset.target];

    // clear points
    pointContainer.replaceChildren();

    // assign node
    lastNode = currentNode;
    currentNode = targetNode;
    fitNodesToScreen();

    // start cross-fade
    fadeStartTime = now;
    requestAnimationFrame(crossFadeImages);

    // start sound
    startSound(currentNode);
  }
}

// handle click with shift on point container --> post position to console
function onPointContainerClick(evt) {
  if (evt.shiftKey) {
    const rect = pointContainer.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    console.log(`[${x.toFixed(6)}, ${y.toFixed(6)}]`);
  }
}

function onKeyDown(evt) {
  if (evt.key === "Shift" && currentNode !== null) {
    let point = pointContainer.firstChild;

    while (point) {
      point.classList.add('show');
      point = point.nextSibling;
    }
  }
}

function onKeyUp(evt) {
  if (evt.key === "Shift" && currentNode !== null) {
    let point = pointContainer.firstChild;

    while (point) {
      point.classList.remove('show');
      point = point.nextSibling;
    }
  }
}

function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}