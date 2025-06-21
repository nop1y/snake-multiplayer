/**
 * Этот файл содержит все функции, отвечающие за отрисовку 
 * элементов игры на canvas.
 */

// Ключевое слово `export` делает функцию доступной для импорта в других файлах.
export function drawSnakeSegment(ctx, GRID_SIZE, x, y, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
        (x + 0.5) * GRID_SIZE, 
        (y + 0.5) * GRID_SIZE, 
        GRID_SIZE / 2.2, 
        0, 
        2 * Math.PI
    );
    ctx.fill();
    ctx.stroke();
}

export function drawSnakeHead(ctx, GRID_SIZE, x, y, direction, color) {
    // Рисуем основную часть головы
    ctx.fillStyle = color;
    ctx.strokeStyle = '#1d1d1d';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(
        (x + 0.5) * GRID_SIZE, 
        (y + 0.5) * GRID_SIZE, 
        GRID_SIZE / 2, 
        0, 
        2 * Math.PI
    );
    ctx.fill();
    ctx.stroke();

    // Рисуем глаза
    ctx.fillStyle = 'white';
    const eyeSize = GRID_SIZE / 5;
    let eye1_dx = 0, eye1_dy = 0, eye2_dx = 0, eye2_dy = 0;

    // Определяем положение глаз в зависимости от направления
    switch (direction) {
        case 'up':
            eye1_dx = -GRID_SIZE / 4; eye1_dy = -GRID_SIZE / 4;
            eye2_dx = GRID_SIZE / 4;  eye2_dy = -GRID_SIZE / 4;
            break;
        case 'down':
            eye1_dx = -GRID_SIZE / 4; eye1_dy = GRID_SIZE / 4;
            eye2_dx = GRID_SIZE / 4;  eye2_dy = GRID_SIZE / 4;
            break;
        case 'left':
            eye1_dx = -GRID_SIZE / 4; eye1_dy = -GRID_SIZE / 4;
            eye2_dx = -GRID_SIZE / 4; eye2_dy = GRID_SIZE / 4;
            break;
        case 'right':
            eye1_dx = GRID_SIZE / 4; eye1_dy = -GRID_SIZE / 4;
            eye2_dx = GRID_SIZE / 4; eye2_dy = GRID_SIZE / 4;
            break;
        default: // Если стоит на месте или в начале игры
            eye1_dx = -GRID_SIZE / 4; eye1_dy = -GRID_SIZE / 4;
            eye2_dx = GRID_SIZE / 4;  eye2_dy = -GRID_SIZE / 4;
            break;
    }
    
    // Рисуем белки глаз
    const centerX = (x + 0.5) * GRID_SIZE;
    const centerY = (y + 0.5) * GRID_SIZE;

    ctx.beginPath();
    ctx.arc(centerX + eye1_dx, centerY + eye1_dy, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + eye2_dx, centerY + eye2_dy, eyeSize, 0, 2 * Math.PI);
    ctx.fill();
}

export function drawApple(ctx, GRID_SIZE, x, y) {
    // Основная часть яблока
    ctx.fillStyle = '#e74c3c'; // Красный цвет
    ctx.beginPath();
    ctx.arc(
        (x + 0.5) * GRID_SIZE, 
        (y + 0.5) * GRID_SIZE, 
        GRID_SIZE / 2.5, 
        0, 
        2 * Math.PI
    );
    ctx.fill();

    // Блик на яблоке для объема
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(
        (x + 0.35) * GRID_SIZE, 
        (y + 0.35) * GRID_SIZE, 
        GRID_SIZE / 6, 
        0, 
        2 * Math.PI
    );
    ctx.fill();
}