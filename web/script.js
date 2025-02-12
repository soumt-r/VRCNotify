const blobs = [
    { id: 1, x: 20, y: 20, size: 40 },
    { id: 2, x: 60, y: 60, size: 50 },
    { id: 3, x: 40, y: 80, size: 45 },
];

let currentState = 'waiting for log';

function createBlobs() {
    const app = document.getElementById('app');
    blobs.forEach(blob => {
        const blobElement = document.createElement('div');
        blobElement.id = `blob-${blob.id}`;
        blobElement.className = 'blob';
        blobElement.style.width = `${blob.size}vmax`;
        blobElement.style.height = `${blob.size}vmax`;
        blobElement.style.left = `${blob.x}%`;
        blobElement.style.top = `${blob.y}%`;
        blobElement.style.transform = 'translate(-50%, -50%)';
        app.appendChild(blobElement);
    });
}

function updateBlobs(newPositions, color) {
    blobs.forEach((blob, index) => {
        const blobElement = document.getElementById(`blob-${blob.id}`);
        if (blobElement) {
            blobElement.style.left = `${newPositions[index].x}%`;
            blobElement.style.top = `${newPositions[index].y}%`;
            blobElement.style.background = `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`;
            blobElement.style.opacity = 0.6 + Math.random() * 0.4; // Random opacity between 0.6 and 1
        }
    });
}

function updateState(newState, is_input_required) {
    currentState = newState;
    document.getElementById('status').textContent = currentState;
    
    const inputForm = document.getElementById('input-form');
    const inputField = document.getElementById('input-field');
    if (is_input_required) {
        inputForm.style.display = 'flex';
        inputField.placeholder = "Enter your input";
    }
    else {
        inputForm.style.display = 'none';
    }
}

function updateLatestActivity(activity) {
    document.getElementById('latest-activity').textContent = `${activity}`;
}

function processColorCodes(text) {
    let isSpanOpen = false; // <span> 태그가 열렸는지 추적
    let result = text.replace(/\[\$([0-9A-Fa-f]{6})\$\]/g, (match, color) => {
        if (isSpanOpen) {
            return `</span><span style="color: #${color};">`; // 이전 <span> 닫고 새로운 <span> 열기
        }
        isSpanOpen = true;
        return `<span style="color: #${color};">`; // 새로운 <span> 열기
    });

    // 열린 <span> 태그를 마지막에 닫기
    if (isSpanOpen) {
        result += '</span>';
    }

    return result;
}


function addLogMessage(message) {
    const logTerminal = document.getElementById('log-terminal');
    const logContent = document.getElementById('log-content');
    const processedMessage = processColorCodes(message);
    logContent.innerHTML += processedMessage + '<br>';
    logTerminal.scrollTop = logTerminal.scrollHeight;
    
}

document.getElementById('input-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('input-field').value;
    document.getElementById('input-field').value = '';
    await eel.handle_input(currentState, input)();
});

document.getElementById('toggle-log').addEventListener('click', () => {
    const logTerminal = document.getElementById('log-terminal');
    const button = document.getElementById('toggle-log');
    button.textContent = logTerminal.classList.contains('open') ? '>' : '<';

    logTerminal.classList.toggle('open');

    if (logTerminal.classList.contains('open')) {
        window.resizeTo(window.outerWidth*2, window.outerHeight);
    } else {
        window.resizeTo(window.outerWidth/2, window.outerHeight);
        
    }
});

// Info modal functionality
const infoModal = document.getElementById('info-modal');
const infoButton = document.getElementById('info-button');
const closeButton = document.getElementsByClassName('close')[0];

infoButton.onclick = function() {
    infoModal.style.display = 'block';
    // 강제 리플로우를 위해 setTimeout 사용
    setTimeout(() => {
        infoModal.classList.add('visible');
    }, 10);
}

function closeModal() {
    infoModal.classList.remove('visible');
    // 트랜지션이 완료된 후 display: none 설정
    setTimeout(() => {
        infoModal.style.display = 'none';
    }, 300); // CSS 트랜지션 시간과 동일하게 설정
}

closeButton.onclick = closeModal;

window.onclick = function(event) {
    if (event.target == infoModal) {
        closeModal();
    }
}

// License functionality
const licenseList = document.getElementById('license-list');
const licenseText = document.getElementById('license-text');

async function fetchLicense(licenseName) {
    try {
        const response = await fetch(`/licenses/license-${licenseName}.txt`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error("Could not fetch the license:", error);
        return "License text could not be loaded.";
    }
}

licenseList.addEventListener('click', async function(e) {
    if(e.target && e.target.nodeName == "LI") {
        const license = e.target.getAttribute('data-license');
        const licenseContent = await fetchLicense(license);
        licenseText.textContent = licenseContent;
        
        // 라이센스 텍스트를 표시할 때 페이드 인 효과
        licenseText.style.display = 'block';
        licenseText.style.opacity = '0';
        setTimeout(() => {
            licenseText.style.opacity = '1';
        }, 10);
    }
});

const versionModal = document.getElementById('version-modal');
const versionTrigger = document.getElementById('version-trigger');
const versionCloseButton = versionModal.querySelector('.close');
const currentVersionDisplay = document.getElementById('current-version');
const latestVersionDisplay = document.getElementById('latest-version');
const changelogContent = document.getElementById('changelog-content');

function formatMarkdown(text) {
    // Replace markdown headers with styled divs
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return text
        .split('\n')
        .map(line => {
            if (line.startsWith('### ')) {
                return `<div class="changelog-h3">${line.substring(4)}</div>`;
            } else if (line.startsWith('## ')) {
                return `<div class="changelog-h2">${line.substring(3)}</div>`;
            } else if (line.startsWith('# ')) {
                return `<div class="changelog-h1">${line.substring(2)}</div>`;
            }
            return line;
        })
        .join('\n');
}

async function updateVersionInfo() {
    try {
        const currentVersion = await eel.get_current_version()();
        const latestVersion = await eel.get_latest_version()();
        
        currentVersionDisplay.textContent = currentVersion;
        latestVersionDisplay.textContent = latestVersion;
        versionTrigger.textContent = `v${currentVersion}`;
        
        // Update changelog
        const changelog = await eel.get_changelog()();
        changelogContent.innerHTML = formatMarkdown(changelog);
    } catch (error) {
        console.error("Error updating version info:", error);
        currentVersionDisplay.textContent = "Error";
        latestVersionDisplay.textContent = "Error";
    }
}

function openVersionModal() {
    versionModal.style.display = 'block';
    setTimeout(() => {
        versionModal.classList.add('visible');
    }, 10);
}

function closeVersionModal() {
    versionModal.classList.remove('visible');
    setTimeout(() => {
        versionModal.style.display = 'none';
    }, 300);
}

versionTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    openVersionModal();
});

versionCloseButton.addEventListener('click', closeVersionModal);

window.addEventListener('click', (event) => {
    if (event.target === versionModal) {
        closeVersionModal();
    }
});

// Initial version info update
updateVersionInfo();

createBlobs();

eel.expose(updateState);
eel.expose(updateLatestActivity);
eel.expose(updateBlobs);
eel.expose(addLogMessage);