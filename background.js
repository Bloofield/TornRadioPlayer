let creating = null;
let volumeTimeout = null;
let lastSavedVolume = null;

async function setupOffscreenDocument() {
    const existingContexts = await getOffscreen();

    if (existingContexts.length > 0) return;

    const createOffscreenDocument = async () => {
        const { volume } = await chrome.storage.local.get('volume')
        creating = chrome.offscreen.createDocument({
            url: `off_screen.html?volume=${volume}`,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play radio stream in the background'
        });
        
        await creating;
        creating = null;
        startMonitoring();
    };

    if (!creating) { 
        await createOffscreenDocument();
    } else {
        await creating;
    }
}

function sendMessageToTabs(message, ignoreCurrentActiveTab = false) {
    const query = { url: ["*://www.torn.com/*"] };

    chrome.tabs.query(query, tabs => {
        tabs.forEach(tab => {
            if (ignoreCurrentActiveTab && tab.active && tab.currentWindow) return;
            // the lastError part exists to stop a million errors popping up when we send a message and a tab hasn't been initialised 
            chrome.tabs.sendMessage(tab.id, message, () => chrome.runtime.lastError);
        });
    });
}

async function getOffscreen() {
    return await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });
}

async function checkAndCloseOffscreen() {
    console.log("checking")
    const query = { url: ["*://www.torn.com/*"] };

    chrome.tabs.query(query, async (tabs) => {
        if (tabs.length === 0 && (await getOffscreen()).length > 0) {
            await chrome.offscreen.closeDocument();
        }
    });
}

// This exists so we aren't putting a strain on the user's device when they change volume settings.
function saveVolume(volume) {
    if (volumeTimeout) return;

    chrome.storage.local.set({ volume });
    lastSavedVolume = volume;

    volumeTimeout = setTimeout(() => {
        volumeTimeout = null;
        if (lastSavedVolume !== volume) saveVolume(volume);
    }, 500);
}

// Chrome likes to delete audio elements that aren't playing music for ~30s.
// Something about saving data or some horseshit. Anyways, they also have no way for us to detect that,
// So I have to spam the ever living shit out of their API to maintain parity between the front and backend.
function startMonitoring() {
    const monitoringInterval = setInterval(async () => {
        if ((await getOffscreen()).length > 0) return;

        clearInterval(monitoringInterval);
        sendMessageToTabs({ action: 'setButtonStop' });
    }, 500);
}

chrome.tabs.onRemoved.addListener(checkAndCloseOffscreen);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') checkAndCloseOffscreen();
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (!request.target || request.target !== "background") return;

    const setters = {
        async stop() {
            await chrome.offscreen.closeDocument();
            return { action: 'setButtonStop' };
        },
        async play() {
            await setupOffscreenDocument();
            return {};
        },
        async playing() {
            return { action: 'setButtonPlay' }
        },
        async volume() {
            // the lastError part exists to stop a million errors popping up when we send a message and there's no offscreen to receive it. 
            chrome.runtime.sendMessage({ input: request.volume, target: 'offscreen' }, () => chrome.runtime.lastError);
            saveVolume(request.volume);
            return { action: 'setVolume', volume: request.volume };
        }
    };

    const getters = {
        extensionId() {
            return { extensionId: chrome.runtime.id }
        }
    }

    const handleRequest = async () => {
        if (request.input && setters[request.input]) {
            const { ignoreCurrentActiveTab = false, ...message } = await setters[request.input]();
            if (!message) return;
            sendMessageToTabs(message, ignoreCurrentActiveTab);
        } else if (request.get && getters[request.get]) {
            const response = getters[request.get]();
            sendResponse(response);
        }
    };
    
    handleRequest();
});