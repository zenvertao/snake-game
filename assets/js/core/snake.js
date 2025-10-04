// Core snake logic and grid

export const COLS = 24;
export const ROWS = 24;
// Theme color sets
export const NEON_SNAKE = { head: '#00f5ff', body: '#00aaff' };
export const NEON_FOOD = '#ff3b3b';
export const RETRO_SNAKE = { head: '#b7e1b1', body: '#83c684' };
export const RETRO_FOOD = '#e5c07b';
export const RETRO_ON = '#1f5f1f';
export const RETRO_FLASH = '#2a7a2a';

export function createInitialSnake() {
  const x = Math.floor(COLS / 2);
  const y = Math.floor(ROWS / 2);
  return [ { x, y }, { x: x - 1, y }, { x: x - 2, y } ];
}

export function randomFood(forbidden) {
  const occupied = new Set(forbidden.map(seg => `${seg.x},${seg.y}`));
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    const key = `${x},${y}`;
    if (!occupied.has(key)) return { x, y };
  }
}

export function stepSnake({ snake, dir, food }) {
  const head = snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };
  // wall collision
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    return { crashed: true };
  }
  // self collision: exclude current tail only if we will not grow (i.e., not eating)
  const willEat = food && newHead.x === food.x && newHead.y === food.y;
  const bodyToCheck = willEat ? snake : snake.slice(0, snake.length - 1);
  for (const seg of bodyToCheck) {
    if (seg.x === newHead.x && seg.y === newHead.y) return { crashed: true };
  }
  const nextSnake = [ newHead, ...snake ];
  if (!willEat) nextSnake.pop();
  return { crashed: false, nextSnake, ate: willEat };
}

export function oppositeDir(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}
