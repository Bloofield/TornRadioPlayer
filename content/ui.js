function createElement(tag, className, content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
}

function createIcon(svgString) {
    return parser.parseFromString(svgString, 'image/svg+xml').documentElement;
}

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
    const panelContent = createElement('div', 'tradio-panel');

    panelContent.appendChild(createRadioLine(lastReceivedRadioData.dj, 'tradio-dj', icons.djIcon));
    panelContent.appendChild(createRadioLine(lastReceivedRadioData.song, 'tradio-song', icons.songIcon));
    panelContent.appendChild(createRadioLine(lastReceivedRadioData.listenerCount, 'tradio-listener-count', icons.listenerCountIcon, 'padding-bottom: 8px;'));

    panelContent.appendChild(delimiter.cloneNode(true));

    const controls = createControls();
    panelContent.appendChild(controls);
    panelContent.appendChild(delimiter.cloneNode(true));

    const link = createDiscordLink();
    panelContent.appendChild(link);

    return panelContent;
}

function createRadioLine(text, className, svg, additionalStyles = '') {
    const lineWrapper = createElement('div', 'tradio-line-wrapper');
    if (additionalStyles) lineWrapper.style.cssText = additionalStyles;

    const iconSpan = createElement('span', 'tradio-icon');
    const iconElement = createIcon(svg);
    iconSpan.appendChild(iconElement);
    lineWrapper.appendChild(iconSpan);

    const textWrapper = createElement('div', 'tradio-scrolling-text-wrapper');
    const textSpan = createElement('span', `tradio-scrolling-text ${className}`, text);
    textWrapper.appendChild(textSpan);
    lineWrapper.appendChild(textWrapper);

    return lineWrapper;
}

function createControls() {
    const controls = createElement('div', 'tradio-controls');

    const button = createElement('button', `tradio-play-stop-button ${isPlaying ? 'stop' : 'play'}`);
    const iconString = isPlaying ? icons.stopIcon : icons.playIcon;
    const iconElement = createIcon(iconString);
    button.appendChild(iconElement);
    controls.appendChild(button);

    const input = createElement('input', 'tradio-volume-control');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = volume;
    controls.appendChild(input);

    return controls;
}

function createDiscordLink() {
    const link = createElement('a', 'discord-link', 'Join our Discord!');
    link.href = 'https://discord.gg/j4G3kd5fjw';
    link.target = '_blank';
    return link;
}

function applyStyles() {
    const link = createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = browser.runtime.getURL('content/styles.css');
}

function initializeScrollingText(panelContent) {
    const speed = 50; // pixels per second
    const hangTime = 1.5; // seconds
    const scrollingTexts = panelContent.querySelectorAll('.tradio-scrolling-text-wrapper .tradio-scrolling-text');

    scrollingTexts.forEach((textElement, index) => {
        const textOverflowLength = textElement.scrollWidth - textElement.parentElement.clientWidth;

        let styleSheet = document.getElementById(`dynamic-keyframes-${index}`);
        if (textOverflowLength <= 0) return styleSheet && styleSheet.remove();

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

        if (!styleSheet) {
            styleSheet = createElement('style');
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
    port.postMessage({ setRadioStatus: action, width: window.screen.availWidth, height: window.screen.availHeight });
}

function handleVolumeControlInput(event) {
    const volume = event.target.value / 100;
    port.postMessage({ setVolume: volume });
}

function updateVolume(newVolume) {
    volume = newVolume * 100;
    const volumeControl = document.querySelector('.tradio-volume-control');
    if (!volumeControl) return;
    volumeControl.value = volume;
}

function updateMusicStatus(status) {
    isPlaying = status === 'play';
    const playStopButton = document.querySelector('.tradio-play-stop-button');
    if (!playStopButton) return;
    updatePlayStopButton(playStopButton, status === 'play' ? 'stop' : 'play');
}

function updateRadioData(data) {
    const { dj, song, listenerCount } = data;

    lastReceivedRadioData = data;

    const djElement = document.querySelector('.tradio-dj');
    const songElement = document.querySelector('.tradio-song');
    const listenerCountElement = document.querySelector('.tradio-listener-count');

    djElement.textContent = dj;
    songElement.textContent = song;
    listenerCountElement.textContent = listenerCount;

    initializeScrollingText(document.querySelector('.tradio-panel'));
}

function updatePlayStopButton(button, state) {
    const isPlayState = state === 'play';
    button.classList.toggle('play', isPlayState);
    button.classList.toggle('stop', !isPlayState);

    while (button.firstChild) button.removeChild(button.firstChild);

    const iconString = isPlayState ? icons.playIcon : icons.stopIcon;
    const iconElement = createIcon(iconString);
    button.appendChild(iconElement);
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