let lastReceivedRadioData = {
    dj: "",
    song: "",
    listenerCount: ""
};
let isPlaying = false;
let volume = 50;
const parser = new DOMParser();

const icons = {
    djIcon: '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 512 512"><path d="M332.64,64.58C313.18,43.57,286,32,256,32c-30.16,0-57.43,11.5-76.8,32.38-19.58,21.11-29.12,49.8-26.88,80.78C156.76,206.28,203.27,256,256,256s99.16-49.71,103.67-110.82C361.94,114.48,352.34,85.85,332.64,64.58Z"/><path d="M432,480H80A31,31,0,0,1,55.8,468.87c-6.5-7.77-9.12-18.38-7.18-29.11C57.06,392.94,83.4,353.61,124.8,326c36.78-24.51,83.37-38,131.2-38s94.42,13.5,131.2,38c41.4,27.6,67.74,66.93,76.18,113.75,1.94,10.73-.68,21.34-7.18,29.11A31,31,0,0,1,432,480Z"/></svg>',
    songIcon: '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256"><path d="M216,64v48a7.99991,7.99991,0,0,1-10.29883,7.6626L136,98.75195V184a48.06946,48.06946,0,1,1-16-35.73877V88.186q-.0044-.18239,0-.36573V40a7.99991,7.99991,0,0,1,10.29883-7.6626l80,24A7.99972,7.99972,0,0,1,216,64Z"/></svg>',
    listenerCountIcon: '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 512 512"><path d="M256 32C114.52 32 0 146.496 0 288v48a32 32 0 0 0 17.689 28.622l14.383 7.191C34.083 431.903 83.421 480 144 480h24c13.255 0 24-10.745 24-24V280c0-13.255-10.745-24-24-24h-24c-31.342 0-59.671 12.879-80 33.627V288c0-105.869 86.131-192 192-192s192 86.131 192 192v1.627C427.671 268.879 399.342 256 368 256h-24c-13.255 0-24 10.745-24 24v176c0 13.255 10.745 24 24 24h24c60.579 0 109.917-48.098 111.928-108.187l14.382-7.191A32 32 0 0 0 512 336v-48c0-141.479-114.496-256-256-256z"/></svg>',
    playIcon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 4l10 6-10 6V4z"/></svg>`,
    stopIcon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="red" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="12" height="12"/></svg>`,
};

let port;

(async () => {
    port = await browser.runtime.connect({ name: `content-${Date.now()}` });

    setupMessageListener();
    await createPanel();
    observeDOMChanges();
})();

function setupMessageListener() {
    port.onMessage.addListener((request, sender, sendResponse) => {
        const functions = {
            setButtonStatus() { updateMusicStatus(request.setButtonStatus); },
            setVolumeSlider() { updateVolume(request.setVolumeSlider); },
            setRadioData() {
                lastReceivedRadioData = request.setRadioData;
                updateRadioData(request.setRadioData);
            }
        };

        for (let key of Object.keys(request)) { if (functions[key]) functions[key](); }
    });
}