document.addEventListener('DOMContentLoaded', async() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialVolume = parseFloat(urlParams.get('volume'));
    createAudioElement(initialVolume);
});

const serverUrl = `https://tornfm.xyz/listen/tornfm/radio.mp3?a=${Date.now()}`;
let checkServerStatusInterval;
let audioElement;

let port;

async function createAudioElement(initialVolume) {
    audioElement = new Audio(serverUrl);
    audioElement.id = 'radioPlayer';
    audioElement.autoplay = true;
    audioElement.volume = initialVolume;

    audioElement.addEventListener('playing', onPlaying);
    audioElement.addEventListener('pause', onPaused);

    document.body.appendChild(audioElement);
}

function onPlaying() {
    port.postMessage({ radioStatus: 'play' });
    monitorAudioPlayback();
}

function onPaused() {
    port.postMessage({ radioStatus: 'stop' });
}

function monitorAudioPlayback() {
    let lastCurrentTime = audioElement.currentTime;

    clearInterval(checkServerStatusInterval);
    checkServerStatusInterval = setInterval(() => {
        if (audioElement.currentTime === lastCurrentTime) {
            port.postMessage({ radioStatus: 'stop' });
        } else {
            lastCurrentTime = audioElement.currentTime;
        }
    }, 5000);
}

function setupMessageListener() {
    port = browser.runtime.connect({ name: 'audio_window' });
    port.onMessage.addListener((request) => {
    const functions = {
        setAudioVolume() {
            audioElement.volume = request.setAudioVolume;
        }
    };

    for (let key of Object.keys(request)) { if (functions[key]) functions[key](); }
    });

    port.onDisconnect.addListener(() => { setTimeout(setupMessageListener, 1000); });
}

setupMessageListener();