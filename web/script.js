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

createBlobs();

eel.expose(updateState);
eel.expose(updateLatestActivity);
eel.expose(updateBlobs);
eel.expose(addLogMessage);