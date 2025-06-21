const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// --- Игровые константы ---
const GAME_SIZE = 20;
const TICK_RATE = 200; // мс
const IDLE_TIMEOUT = 5000; // 5 секунд для авто-движения

// --- Игровое состояние ---
let players = {};
let apple = generateApple();
let gameState = {
    gameTime: 0,
    isGameRunning: false,
    gameOver: false,
    winner: null,
};

// Функция для сброса и начала новой игры
function resetGame() {
    console.log("Сброс игры и состояния игроков.");
    gameState.gameTime = 0;
    gameState.isGameRunning = false;
    gameState.gameOver = false;
    gameState.winner = null;

    // Сбрасываем состояние игроков, но не удаляем их
    Object.values(players).forEach(player => {
        player.x = Math.floor(Math.random() * GAME_SIZE);
        player.y = Math.floor(Math.random() * GAME_SIZE);
        player.tail = [];
        player.direction = null;
        player.isReady = false;
        player.idleTime = 0;
    });
    apple = generateApple();
}

function generateApple() {
    return { x: Math.floor(Math.random() * GAME_SIZE), y: Math.floor(Math.random() * GAME_SIZE) };
}

// Таймер
setInterval(() => {
    if (gameState.isGameRunning) {
        gameState.gameTime++;
    }
}, 1000);

// --- Обработка подключений ---
io.on("connection", (socket) => {
  console.log("Игрок подключился: ", socket.id);

  if (Object.keys(players).length >= 2) {
    socket.emit("full", "Извините, игра уже заполнена.");
    socket.disconnect();
    return;
  }
  
  const colors = ["#2ecc71", "#3498db"];
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * GAME_SIZE),
    y: Math.floor(Math.random() * GAME_SIZE),
    color: colors[Object.keys(players).length],
    tail: [],
    direction: null,
    isReady: false,
    idleTime: 0, // <-- НОВОЕ: Счетчик бездействия
  };

  io.emit("updateState", { players, apple, gameState });

  socket.on('playerReady', () => {
    if (players[socket.id]) {
      players[socket.id].isReady = true;
      
      const allPlayers = Object.values(players);
      // Если игра окончена, готовность запускает сброс
      if (gameState.gameOver) {
          resetGame();
      } else {
        const allReady = allPlayers.length === 2 && allPlayers.every(p => p.isReady);
        if (allReady) {
            console.log("Все готовы! Начинаем игру.");
            gameState.isGameRunning = true;
            io.emit('gameStart');
        }
      }
      io.emit("updateState", { players, apple, gameState });
    }
  });

  socket.on("move", (direction) => {
    if (players[socket.id] && gameState.isGameRunning) {
        const player = players[socket.id];
        player.idleTime = 0; // Сбрасываем счетчик бездействия
        const currentDirection = player.direction;
        if ((direction === 'up' && currentDirection !== 'down') ||
            (direction === 'down' && currentDirection !== 'up') ||
            (direction === 'left' && currentDirection !== 'right') ||
            (direction === 'right' && currentDirection !== 'left')) {
            player.direction = direction;
        }
    }
  });

  socket.on("disconnect", () => {
    console.log("Игрок отключился: ", socket.id);
    delete players[socket.id];
    resetGame(); // Если кто-то вышел, сбрасываем игру
    io.emit("updateState", { players, apple, gameState });
  });
});

// --- Основной игровой цикл ---
setInterval(() => {
  if (!gameState.isGameRunning) return;

  // 1. Движение и проверка на бездействие
  Object.values(players).forEach(player => {
    // Проверка на бездействие
    if (!player.direction) {
        player.idleTime += TICK_RATE;
        if (player.idleTime >= IDLE_TIMEOUT) {
            player.direction = 'right'; // Начинаем двигаться вправо по умолчанию
        }
    }

    if (!player.direction) return; // Если все еще нет направления, пропускаем ход

    // Двигаем змейку
    player.tail.push({ x: player.x, y: player.y });
    if (player.direction === "up") player.y--;
    if (player.direction === "down") player.y++;
    if (player.direction === "left") player.x--;
    if (player.direction === "right") player.x++;

    // Съедение яблока
    if (player.x === apple.x && player.y === apple.y) {
      apple = generateApple();
    } else {
      player.tail.shift();
    }
  });

  // 2. Проверка столкновений
  const playerIds = Object.keys(players);
  const playersArray = Object.values(players);
  let loserId = null;

  for (const player of playersArray) {
    // Столкновение со стеной
    if (player.x < 0 || player.x >= GAME_SIZE || player.y < 0 || player.y >= GAME_SIZE) {
        loserId = player.id;
        break;
    }
    // Столкновение со своим хвостом
    for (const segment of player.tail) {
        if (player.x === segment.x && player.y === segment.y) {
            loserId = player.id;
            break;
        }
    }
    if (loserId) break;

    // Столкновение с другим игроком
    for (const otherPlayer of playersArray) {
        if (player.id === otherPlayer.id) continue;
        // Столкновение с головой другого игрока (ничья)
        if (player.x === otherPlayer.x && player.y === otherPlayer.y) {
            loserId = 'draw'; // Ничья
            break;
        }
        // Столкновение с хвостом другого игрока
        for (const segment of otherPlayer.tail) {
            if (player.x === segment.x && player.y === segment.y) {
                loserId = player.id;
                break;
            }
        }
        if (loserId) break;
    }
    if (loserId) break;
  }
  
  // 3. Обработка конца игры
  if (loserId) {
    gameState.isGameRunning = false;
    gameState.gameOver = true;

    if (loserId === 'draw') {
        gameState.winner = 'Ничья!';
    } else {
        const winner = playersArray.find(p => p.id !== loserId);
        // Находим имя победителя
        const winnerIndex = playerIds.indexOf(winner.id) + 1;
        gameState.winner = `Игрок ${winnerIndex}`;
    }
    console.log(`Игра окончена. Победитель: ${gameState.winner}`);
  }

  io.emit("updateState", { players, apple, gameState });
}, TICK_RATE);


server.listen(3000, '0.0.0.0', () => {
    console.log("Сервер запущен и доступен по сети на порту 3000.");
});
