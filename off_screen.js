document.addEventListener('DOMContentLoaded', async() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialVolume = parseFloat(urlParams.get('volume'));
    createAudioElement(initialVolume);
});

// some dingy russian rock radio thing. feel free to replace it with your own.
const serverUrl = 'https://radiostream.pl/tuba8-1.mp3';
let checkServerStatusInterval;
let audioElement;

async function createAudioElement(initialVolume) {
    audioElement = new Audio(serverUrl);
    audioElement.id = 'radioPlayer';
    audioElement.autoplay = true;
    audioElement.volume = initialVolume;

    audioElement.addEventListener('playing', onPlaying);

    document.body.appendChild(audioElement);
}

function onPlaying() {
    chrome.runtime.sendMessage({ input: 'playing', target: 'background' });
    monitorAudioPlayback();
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