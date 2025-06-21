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

const GAME_SIZE = 20;
const TICK_RATE = 200; 
const IDLE_TIMEOUT = 5000; 

let players = {};
let apple = generateApple();
let gameState = {
    gameTime: 0,
    isGameRunning: false,
    gameOver: false,
    winner: null,
};

function resetGame() {
    console.log("Сброс игры и состояния игроков.");
    gameState.gameTime = 0;
    gameState.isGameRunning = false;
    gameState.gameOver = false;
    gameState.winner = null;

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

setInterval(() => {
    if (gameState.isGameRunning) {
        gameState.gameTime++;
    }
}, 1000);

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
    idleTime: 0,
  };

  io.emit("updateState", { players, apple, gameState });

  socket.on('playerReady', () => {
    if (players[socket.id]) {
      players[socket.id].isReady = true;
      
      const allPlayers = Object.values(players);
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
        player.idleTime = 0;
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
    resetGame(); 
    io.emit("updateState", { players, apple, gameState });
  });
});

setInterval(() => {
  if (!gameState.isGameRunning) return;

  Object.values(players).forEach(player => {
    if (!player.direction) {
        player.idleTime += TICK_RATE;
        if (player.idleTime >= IDLE_TIMEOUT) {
            player.direction = 'right';
        }
    }

    if (!player.direction) return; 

    player.tail.push({ x: player.x, y: player.y });
    if (player.direction === "up") player.y--;
    if (player.direction === "down") player.y++;
    if (player.direction === "left") player.x--;
    if (player.direction === "right") player.x++;

    if (player.x === apple.x && player.y === apple.y) {
      apple = generateApple();
    } else {
      player.tail.shift();
    }
  });

  const playerIds = Object.keys(players);
  const playersArray = Object.values(players);
  let loserId = null;

  for (const player of playersArray) {
    if (player.x < 0 || player.x >= GAME_SIZE || player.y < 0 || player.y >= GAME_SIZE) {
        loserId = player.id;
        break;
    }
    for (const segment of player.tail) {
        if (player.x === segment.x && player.y === segment.y) {
            loserId = player.id;
            break;
        }
    }
    if (loserId) break;

    for (const otherPlayer of playersArray) {
        if (player.id === otherPlayer.id) continue;
        if (player.x === otherPlayer.x && player.y === otherPlayer.y) {
            loserId = 'draw'; 
            break;
        }
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
  
  if (loserId) {
    gameState.isGameRunning = false;
    gameState.gameOver = true;

    if (loserId === 'draw') {
        gameState.winner = 'Ничья!';
    } else {
        const winner = playersArray.find(p => p.id !== loserId);
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
