try { importScripts('../node_modules/webextension-polyfill/dist/browser-polyfill.js'); } catch (e) {}

let volumeTimeout = null;
let lastSavedVolume;
let audioWindowId = null;
const connections = {};
let savedRadioData = {
    dj: "",
    song: "",
    listenerCount: ""
};

async function initVolume() {
    lastSavedVolume = (await browser.storage.local.get('volume')).volume;
}

async function initAudioWindowId() {
    const savedId = (await browser.storage.local.get('audioWindowId')).audioWindowId;
    const isWindowOpen = (await browser.windows.getAll()).some(win => win.id === savedId);

    if (savedId && isWindowOpen) {
        audioWindowId = savedId;
    } else {
        await browser.storage.local.set({ audioWindowId: null });
        audioWindowId = null;
    }
}


async function setupAudioWindow(maxWidth, maxHeight) {
    if (audioWindowId !== null) return broadcastMessage({ setButtonStatus: 'play' });

    const { volume } = await browser.storage.local.get('volume');
    lastSavedVolume = volume;
    broadcastMessage({ setVolumeSlider: volume });

    const window = await browser.windows.create({
        url: `../audio/audio_window.html?volume=${volume}`,
        type: 'popup',
        width: 1,
        height: 1,
        left: maxWidth,
        top: maxHeight,
        focused: false
    });
    audioWindowId = window.id;
    await browser.storage.local.set({ audioWindowId });
}

async function fetchAndUpdateRadioData() {
    if (Object.keys(connections).length === 0) return;

    const response = await fetch('https://tornfm.xyz/api/nowplaying/tornfm');
    const data = await response.json();

    const radioData = response.ok && data ? {
        dj: data.live.streamer_name || 'No DJ',
        song: [data.now_playing.song.artist, data.now_playing.song.title].filter(Boolean).join(' - '),
        listenerCount: data.listeners.unique
    } : {
        dj: "Server Error",
        song: " ",
        listenerCount: " "
    };

    if (JSON.stringify(radioData) === JSON.stringify(savedRadioData)) return;

    savedRadioData = radioData;
    broadcastMessage({ setRadioData: savedRadioData });
}

function broadcastMessage(message) {
    Object.values(connections).forEach(port => {
        if (port.name.startsWith("content-")) port.postMessage(message);
    });
}

async function checkAndCloseAudioWindow() {
    const queryTabsAndClose = async () => {
        const tabs = await browser.tabs.query({ url: ["*://www.torn.com/*"] });
        if (tabs.length === 0) closeAudioWindow();
    };

    await queryTabsAndClose();
    setTimeout(queryTabsAndClose, 200);
}

async function closeAudioWindow() {
    if (Object.keys(connections).length != 0) broadcastMessage({ setButtonStatus: 'stop' });

    if (audioWindowId == null) return;
    browser.windows.remove(audioWindowId);
    audioWindowId = null;
    await browser.storage.local.set({ audioWindowId: null });
}

function saveVolume(volume) {
    lastSavedVolume = volume;
    if (volumeTimeout) return;

    browser.storage.local.set({ volume });

    volumeTimeout = setTimeout(() => {
        volumeTimeout = null;
        if (lastSavedVolume !== volume) saveVolume(lastSavedVolume);
    }, 500);
}

function initContentPage(port) {
    let message = { setButtonStatus: audioWindowId !== null ? 'play' : 'stop' }

    if (lastSavedVolume !== undefined) message.setVolumeSlider = lastSavedVolume;
    if (!Object.values(savedRadioData).every(value => !value)) message.setRadioData = savedRadioData;

    port.postMessage(message);
}
async function init() {
    await initVolume();
    await initAudioWindowId();
    fetchAndUpdateRadioData();
    setInterval(fetchAndUpdateRadioData, 5000);

    browser.windows.onRemoved.addListener((id) => {
        if (id !== audioWindowId) return

        broadcastMessage({ setButtonStatus: 'stop' });
        audioWindowId = null;
        browser.storage.local.set({ audioWindowId: null });
    });

    browser.tabs.onRemoved.addListener(checkAndCloseAudioWindow);
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') checkAndCloseAudioWindow();
    });

    browser.runtime.onConnect.addListener((port) => {
        console.log(port.name);

        connections[port.name] = port;

        if (port.name.startsWith("content-")) initContentPage(port)

        port.onDisconnect.addListener(() => { delete connections[port.name]; });

        port.onMessage.addListener((request) => {
            const functions = {
                radioStatus() {
                    if (request.radioStatus === 'stop') closeAudioWindow();
                    broadcastMessage({ setButtonStatus: request.radioStatus });
                },
                setRadioStatus() {
                    switch (request.setRadioStatus) {
                        case 'stop': closeAudioWindow(); break;
                        case 'play': setupAudioWindow(request.width, request.height); break;
                    }
                },
                setVolume() {
                    connections['audio_window']?.postMessage({ setAudioVolume: request.setVolume });
                    saveVolume(request.setVolume);
                    broadcastMessage({ setVolumeSlider: request.setVolume });
                }
            };

            for (let key of Object.keys(request)) { if (functions[key]) functions[key](); }
        });

        port._timer = setTimeout(() =>{ if (port) port.disconnect(); }, 295000);
    });
}

init();