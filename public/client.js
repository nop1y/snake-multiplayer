import { drawSnakeSegment, drawSnakeHead, drawApple } from './renderer.js';

const SERVER_IP = "http://192.168.1.76:3000";
const socket = io(SERVER_IP);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const timerEl = document.getElementById("timer");
const playerCountEl = document.getElementById("player-count");
const playerLegendEl = document.getElementById("player-legend");
const readyOverlayEl = document.getElementById("ready-overlay");
const readyButtonEl = document.getElementById("ready-button");
const readyStatusEl = document.getElementById("ready-status");

function resizeCanvas() {
    const size = Math.min(window.innerWidth - 32, 500); 
    canvas.width = size;
    canvas.height = size;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const GRID_SIZE = canvas.width / 20;

socket.on("updateState", (state) => {
    updateUI(state);
    drawGame(state);
});

socket.on("full", (message) => { alert(message); });

socket.on('gameStart', () => {
    readyOverlayEl.classList.add('hidden');
});


readyButtonEl.addEventListener('click', () => {
    socket.emit('playerReady');
    readyButtonEl.disabled = true;
});

window.addEventListener("keydown", (event) => { const directions = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right' }; if (directions[event.key]) { event.preventDefault(); socket.emit("move", directions[event.key]); } });
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleSwipe(e.changedTouches[0].screenX, e.changedTouches[0].screenY); }, { passive: false });
function handleSwipe(endX, endY) { const deltaX = endX - touchStartX; const deltaY = endY - touchStartY; if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) { if (Math.abs(deltaX) > Math.abs(deltaY)) { socket.emit("move", deltaX > 0 ? 'right' : 'left'); } else { socket.emit("move", deltaY > 0 ? 'down' : 'up'); } } }



function updateUI(state) {
    const { players, apple, gameState } = state;
    timerEl.innerText = `Время: ${gameState.gameTime} сек`;
    const numPlayers = Object.keys(players).length;
    playerCountEl.innerText = `Игроков: ${numPlayers}/2`;

    updatePlayerLegend(players);

    if (gameState.gameOver) {
        readyOverlayEl.classList.remove('hidden');
        readyStatusEl.innerHTML = `Игра окончена!<br><strong>Победитель: ${gameState.winner}</strong>`;
        readyButtonEl.innerText = "Играть снова";
        readyButtonEl.disabled = false;
    } else if (numPlayers < 2) {
        readyOverlayEl.classList.remove('hidden');
        readyStatusEl.innerText = "Ожидание второго игрока...";
        readyButtonEl.innerText = "Готов!";
        readyButtonEl.disabled = true;
    } else {
        const me = players[socket.id];
        if (!me.isReady) {
            readyOverlayEl.classList.remove('hidden');
            readyStatusEl.innerText = "Нажмите 'Готов', чтобы начать!";
            readyButtonEl.innerText = "Готов!";
            readyButtonEl.disabled = false;
        } else if (!gameState.isGameRunning) {
            readyStatusEl.innerText = "Ожидание другого игрока...";
            readyButtonEl.disabled = true;
        }
    }
}

function updatePlayerLegend(players) {
    playerLegendEl.innerHTML = '';
    const playerIds = Object.keys(players);
    playerIds.forEach((playerId, index) => {
        const player = players[playerId];
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-entry';
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'player-color-swatch';
        colorSwatch.style.backgroundColor = player.color;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `Игрок ${index + 1}`;
        if (player.id === socket.id) { nameSpan.textContent += " (Вы)"; nameSpan.style.fontWeight = 'bold'; }
        const statusSpan = document.createElement('span');
        statusSpan.className = 'player-status';
        statusSpan.textContent = player.isReady ? '✓ Готов' : 'Ожидание...';
        playerDiv.appendChild(colorSwatch);
        playerDiv.appendChild(nameSpan);
        playerDiv.appendChild(statusSpan);
        playerLegendEl.appendChild(playerDiv);
    });
}

function drawGame(state) {
    const { players, apple } = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (apple) {
        drawApple(ctx, GRID_SIZE, apple.x, apple.y);
    }
    Object.values(players).forEach(player => {
        player.tail.forEach(segment => drawSnakeSegment(ctx, GRID_SIZE, segment.x, segment.y, player.color));
        drawSnakeHead(ctx, GRID_SIZE, player.x, player.y, player.direction, player.color);
    });
}
