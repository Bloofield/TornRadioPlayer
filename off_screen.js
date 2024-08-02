document.addEventListener('DOMContentLoaded', async() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialVolume = parseFloat(urlParams.get('volume'));
    createAudioElement(initialVolume);
});

const serverUrl = 'https://tornfm.xyz/listen/tornfm/radio.mp3';
let checkServerStatusInterval;
let audioElement;

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
    chrome.runtime.sendMessage({ input: 'playing', target: 'background' });
    monitorAudioPlayback();
}

function onPaused() {
    chrome.runtime.sendMessage({ input: 'stop', target: 'background' });
}

function monitorAudioPlayback() {
    let lastCurrentTime = audioElement.currentTime;

    clearInterval(checkServerStatusInterval);
    checkServerStatusInterval = setInterval(() => {
        if (audioElement.currentTime === lastCurrentTime) {
            chrome.runtime.sendMessage({ target: 'background', input: 'stop' });
        } else {
            lastCurrentTime = audioElement.currentTime;
        }
    }, 5000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const setters = {
        volume() {
            audioElement.volume = request.volume;
        }
    }

    const getters = {
        isPlaying() {
            return { isPlaying: !audioElement.paused };
        },
        volume() {
            return { volume: audioElement.volume };
        }
    };

    const handleRequest = () => {
        if (request.input && setters[request.input]) {
            setters[request.input]();
        } else if (request.get && getters[request.get]) {
            const response = getters[request.get]();
            sendResponse(response);
        }
    };

    handleRequest();
});