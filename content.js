(function() {
    'use strict';

    const icons = {
        djIcon:
            '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 512 512"><path d="M332.64,64.58C313.18,43.57,286,32,256,32c-30.16,0-57.43,11.5-76.8,32.38-19.58,21.11-29.12,49.8-26.88,80.78C156.76,206.28,203.27,256,256,256s99.16-49.71,103.67-110.82C361.94,114.48,352.34,85.85,332.64,64.58Z"/><path d="M432,480H80A31,31,0,0,1,55.8,468.87c-6.5-7.77-9.12-18.38-7.18-29.11C57.06,392.94,83.4,353.61,124.8,326c36.78-24.51,83.37-38,131.2-38s94.42,13.5,131.2,38c41.4,27.6,67.74,66.93,76.18,113.75,1.94,10.73-.68,21.34-7.18,29.11A31,31,0,0,1,432,480Z"/></svg>',
        songIcon:
            '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256"><path d="M216,64v48a7.99991,7.99991,0,0,1-10.29883,7.6626L136,98.75195V184a48.06946,48.06946,0,1,1-16-35.73877V88.186q-.0044-.18239,0-.36573V40a7.99991,7.99991,0,0,1,10.29883-7.6626l80,24A7.99972,7.99972,0,0,1,216,64Z"/></svg>',
        motdIcon:
            '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 13.8153 2.48451 15.5196 3.33127 16.9883C3.50372 17.2874 3.5333 17.6516 3.38777 17.9647L2.53406 19.8016C2.00986 20.7933 2.72736 22 3.86159 22H12C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM8.0002 13.3C8.71817 13.3 9.3002 12.7179 9.3002 12C9.3002 11.282 8.71817 10.7 8.0002 10.7C7.28223 10.7 6.7002 11.282 6.7002 12C6.7002 12.7179 7.28223 13.3 8.0002 13.3ZM16.0002 13.3C16.7182 13.3 17.3002 12.7179 17.3002 12C17.3002 11.282 16.7182 10.7 16.0002 10.7C15.2822 10.7 14.7002 11.282 14.7002 12C14.7002 12.7179 15.2822 13.3 16.0002 13.3ZM12.0002 13.3C12.7182 13.3 13.3002 12.7179 13.3002 12C13.3002 11.282 12.7182 10.7 12.0002 10.7C11.2822 10.7 10.7002 11.282 10.7002 12C10.7002 12.7179 11.2822 13.3 12.0002 13.3Z"/></svg>',
        listenerCountIcon:
            '<svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 512 512"><path d="M256 32C114.52 32 0 146.496 0 288v48a32 32 0 0 0 17.689 28.622l14.383 7.191C34.083 431.903 83.421 480 144 480h24c13.255 0 24-10.745 24-24V280c0-13.255-10.745-24-24-24h-24c-31.342 0-59.671 12.879-80 33.627V288c0-105.869 86.131-192 192-192s192 86.131 192 192v1.627C427.671 268.879 399.342 256 368 256h-24c-13.255 0-24 10.745-24 24v176c0 13.255 10.745 24 24 24h24c60.579 0 109.917-48.098 111.928-108.187l14.382-7.191A32 32 0 0 0 512 336v-48c0-141.479-114.496-256-256-256z"/></svg>',
        playIcon:
            `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 4l10 6-10 6V4z"/></svg>`,
        stopIcon:
            `<svg width="20" height="20" viewBox="0 0 20 20" fill="red" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="12" height="12"/></svg>`,
    }

    var myExtId

    chrome.runtime.sendMessage({ get: "extensionId", target: "background" }, (response) => {
        myExtId = response.extensionId;
    });


    async function createPanel() {
        const infoHeader = findInfoHeader();
        if (!infoHeader || document.querySelector('.tradio-panel')) return;
        
        const { panel, delimiter } = setupPanel(infoHeader);
        const radioPanelContent = await buildPanelContent(delimiter);
        panel.firstElementChild.appendChild(radioPanelContent);

        applyStyles();
        initializeScrollingText(panel.firstElementChild);
        initializePlayStopButton(panel.firstElementChild);
    }
    
    function findInfoHeader() {
        const headers = document.querySelectorAll('h2');
        return Array.from(headers).find(el => el.textContent.trim() === 'Information')?.closest('div');
    }
    
    function setupPanel(infoHeader) {
        const panel = infoHeader.nextElementSibling.cloneNode(true);
        const delimiter = [...panel.firstElementChild.children].find(el => !el.children.length);
        panel.firstElementChild.textContent = '';
    
        const radioTitleBar = infoHeader.cloneNode(true);
        radioTitleBar.querySelector('h2').textContent = 'Radio';
    
        const informationPanel = infoHeader.nextElementSibling;
        informationPanel.insertAdjacentElement('afterend', radioTitleBar);
        radioTitleBar.insertAdjacentElement('afterend', panel);
    
        return { panel, delimiter };
    }
    
    async function buildPanelContent(delimiter) {
        const panelContent = document.createElement('div');
        panelContent.className = 'tradio-panel';

        const isPlaying = await getState('isPlaying', false);
        const volume = (await getState('volume', 0.25, true)) * 100;
    
        panelContent.innerHTML = `
            ${createRadioLine('DJ Bloofield', icons.djIcon)}
            ${createRadioLine('Lay All Your Love On Me - ABBA', icons.songIcon)}
            ${createRadioLine('TornFM Rush Hour Rock - Powering Your Drive Home', icons.motdIcon)}
            ${createRadioLine('82', icons.listenerCountIcon, 'padding-bottom: 8px;')}
            ${delimiter.outerHTML}
            <div class="delimiter"></div>
            <div class="tradio-controls">
                <button class="tradio-play-stop-button ${isPlaying ? 'stop' : 'play'}">
                    ${isPlaying ? icons.stopIcon : icons.playIcon}
                </button>
                <input type="range" class="tradio-volume-control" min="0" max="100" value="${volume}">
            </div>
        `;
    
        return panelContent;
    }
    
    const getState = async (key, defaultValue, fallbackToLocalStorage = false) => {
        const response = await chrome.runtime.sendMessage(myExtId, { get: key, target: 'offscreen' });
        if (response?.[key] !== undefined) return response[key];

        if (fallbackToLocalStorage) {
            const storageData = await chrome.storage.local.get(key);
            return storageData[key] ?? defaultValue;
        }

        return defaultValue;
    };

    function createRadioLine(text, svg, additionalStyles = '') {
        return `
            <div class="tradio-line-wrapper" style="${additionalStyles}">
                <span class="tradio-icon">${svg}</span>
                <div class="tradio-scrolling-text-wrapper">
                    <span class="tradio-scrolling-text">${text}</span>
                </div>
            </div>
        `;
    }

    function applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tradio-line-wrapper{
                display: flex;
                align-items: center;
                padding-bottom: 5px;
            }
            .tradio-icon {
                width: 17px;
                height: 17px;
                display: inline-block;
                vertical-align: middle;
                padding-right: 5px;
            }
            .tradio-scrolling-text-wrapper {
                overflow: hidden;
            }
            .tradio-scrolling-text {
                display: inline-block;
                vertical-align: middle;
                white-space: nowrap;
                animation-timing-function: linear;
            }
            .tradio-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding-bottom: 5px;
            }
            .tradio-play-stop-button {
                color: currentColor;
                background: #33b4ff;
                width: 20px;
                height: 20px;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                border-radius: 5px;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
                padding: 0;
            }
            .tradio-volume-control {
                -webkit-appearance: none;
                width: 120px;
                height: 7px;
                background: currentColor;
                color: currentColor;
                outline: none;
                border-radius: 5px;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
            }
            .tradio-volume-control::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                background-color: #33b4ff;
                border-radius: 5px;
                overflow: visible;
                cursor: pointer;
            }
            .tradio-volume-control::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background-color: #33b4ff;
                border-radius: 5px;
                overflow: visible;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    function initializeScrollingText(panelContent) {
        const speed = 50; // pixels per second
        const hangTime = 1.5; // seconds
        const scrollingTexts = panelContent.querySelectorAll('.tradio-scrolling-text-wrapper .tradio-scrolling-text');
        
        scrollingTexts.forEach((textElement, index) => {
            const textOverflowLength = textElement.scrollWidth - textElement.parentElement.clientWidth;;
            
            if (textOverflowLength <= 0) return;
    
            const duration = textOverflowLength / speed;
            const totalDuration = duration + 2 * hangTime;
            const startHang = (hangTime / totalDuration) * 100;
            const endHang = ((hangTime + duration) / totalDuration) * 100;
    
            const keyframes = `
                @keyframes scrollText${index} {
                    0%, ${startHang}% { transform: translateX(0); }
                    ${endHang}%, 100% { transform: translateX(-${textOverflowLength}px); }
                }
            `;
            
            let styleSheet = document.getElementById(`dynamic-keyframes-${index}`);
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = `dynamic-keyframes-${index}`;
                document.head.appendChild(styleSheet);
            }
            styleSheet.innerText = keyframes;
            
            textElement.style.animation = `${totalDuration}s linear ${hangTime}s infinite normal scrollText${index}`;
        });
    }

    function initializePlayStopButton(panelContent) {
        const playStopButton = panelContent.querySelector('.tradio-play-stop-button');
        const volumeControl = panelContent.querySelector('.tradio-volume-control');
    
        playStopButton.addEventListener('click', () => handlePlayStopButtonClick(playStopButton));
        volumeControl.addEventListener('input', handleVolumeControlInput);
    }
    
    function handlePlayStopButtonClick(button) {
        const action = button.classList.contains('play') ? 'play' : 'stop';
        chrome.runtime.sendMessage({ target: "background", input: action });
    }
    
    function handleVolumeControlInput(event) {
        const volume = event.target.value / 100;
        chrome.runtime.sendMessage({ target: "background", input: 'volume', volume });
    }

    async function observeDOMChanges() {
        const config = { childList: true, subtree: true };
        let isCreatingPanel = false;
    
        const observer = new MutationObserver(async (mutations, obs) => {
            if (!isCreatingPanel && !document.querySelector('.tradio-panel')) {
                isCreatingPanel = true;
                await createPanel();
                isCreatingPanel = false;
            }
        });
    
        observer.observe(document.body, config);
    }

    function setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

            const actions = {
                setButtonStop() { updateMusicStatus('stopped'); },
                setButtonPlay() { updateMusicStatus('playing'); },
                setVolume() { updateVolume(request.volume); },
                setRadioData() { updateRadioData(request.radioData); }
            };
    
            if (request.action && actions[request.action]) {
                actions[request.action]();
            }
        });
    }
    
    function updatePlayStopButton(button, state) {
        const isPlayState = state === 'play';
        button.classList.toggle('play', isPlayState);
        button.classList.toggle('stop', !isPlayState);
        button.innerHTML = isPlayState ? icons.playIcon : icons.stopIcon;
    }
    
    function updateVolume(volume) {
        const volumeControl = document.querySelector('.tradio-volume-control');
        if (!volumeControl) return;
        volumeControl.value = volume * 100;
    }
    
    function updateMusicStatus(status) {
        const playStopButton = document.querySelector('.tradio-play-stop-button');
        if (!playStopButton) return;
        updatePlayStopButton(playStopButton, status === 'playing' ? 'stop' : 'play');
    }
    
    function updateRadioData(data) {
        const { dj, song, motd, listenerCount, serverStatus } = data;
        // Todo
    }
    
    async function main() {
        await createPanel();
        observeDOMChanges();
        setupMessageListener();
    }
    
    main();
})();