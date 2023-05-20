const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const defaultImageFadeTime = 2;
const defaultAudioFadeTime = 0.1;

const nodes = {
  cat: {
    image: {
      fileName: "cat.png",
      fadeTime: 2,
    },
    audio: {
      fileName: "cat.wav",
      gainInDb: 0,
      loop: false,
      sync: false,
      fadeInTime: 0,
      fadeOutTime: 0.1,
    },
    points: [
      {
        coordinates: [0.42371362247138644, 0.4646271510516252],
        size: 5,
        target: "dog",
      }, {
        coordinates: [0.494841942046911, 0.5659655831739961],
        size: 5,
        target: "fish",
      }, {
        coordinates: [0.5648230306615399, 0.4646271510516252],
        size: 6,
        target: "elefant",
      }
    ]
  },
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
        coordinates: [0.5371100150406265, 0.1931166347992352],
        size: 2,
        target: "cat",
      }, {
        coordinates: [0.5467897925401853, 0.2887189292543021],
        size: 2,
        target: "fish",
      }, {
        coordinates: [0.6016418650376856, 0.2237093690248566],
        size: 4,
        target: "elefant",
      }
    ]
  },
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
        coordinates: [0.12549700930055666, 0.5334608030592735],
        size: 4.5,
        target: "dog",
      }, {
        coordinates: [0.4319659094838018, 0.4397705544933078],
        size: 6,
        target: "cat",
      }, {
        coordinates: [0.43639145316875844, 0.864244741873805],
        size: 8,
        target: "elefant",
      }
    ]
  },
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
        coordinates: [0.18698263753996952, 0.4416826003824092],
        size: 8,
        target: "dog",
      }, {
        coordinates: [0.5870427121241142, 0.2702205882352941],
        size: 3,
        target: "fish",
      }, {
        coordinates: [0.7964518024883205, 0.4340344168260038],
        size: 2,
        target: "cat",
      }
    ]
  }
};

const nodeKeys = Object.keys(nodes);
const imageContainer = document.getElementById('image-container');
const pointContainer = document.getElementById('point-container');
let lastNode = null;
let currentNode = null;
let fadeStartTime = Infinity;
let currentSound = null;

window.addEventListener('resize', fitToScreen);
window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('keyup', onKeyUp, false);
pointContainer.addEventListener('click', onPointContainerClick);

let numItemsToLoad = 2 * nodeKeys.length;
initNodes();

// load images of all nodes
async function initNodes() {
  for (let key in nodes) {
    const node = nodes[key];
    const image = new Image();

    // add image to node
    node.image.element = image;

    // when image is loaded
    image.addEventListener('load', () => {
      // insert image into container
      imageContainer.appendChild(image);

      // start when everything is loaded
      if (--numItemsToLoad == 0) {
        startAtFirstNode();
      }
    });

    // assign and load image file
    image.src = `images/${node.image.fileName}`;

    // load audio file
    const audioContext = new AudioContext();
    fetch(`sounds/${node.audio.fileName}`)
      .then(data => data.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(decodedAudio => {
        // 
        node.audio.buffer = decodedAudio;
        if (--numItemsToLoad == 0) {
          startAtFirstNode();
        }
      });
  }
}

// start from the beginning
function startAtFirstNode() {
  currentNode = nodes.cat;
  currentNode.image.element.style.opacity = 1;
  fitToScreen();
  displayPoints(currentNode);
}

// fit images of current and last node to screen
function fitToScreen() {
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

// handle click on point (advance to target)
function onPointClick(evt) {
  if (audioContext === null) {
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
    fitToScreen();

    // start cross-fade
    fadeStartTime = now;
    requestAnimationFrame(crossFadeImages);

    // start sound
    startSound(currentNode);
  }
}

// handle click with shift on point container (post position)
function onPointContainerClick(evt) {
  if (evt.shiftKey) {
    const rect = pointContainer.getBoundingClientRect();
    console.log(`[${(evt.clientX - rect.left) / rect.width}, ${(evt.clientY - rect.top) / rect.height}]`);
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

  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(gainFactor, time + fadeInTime);

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

function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}