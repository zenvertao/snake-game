// Drawing helpers for Snake

export function drawCell(ctx, x, y, color, size, isClassic = false, classicFlash = '#306230') {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size, size);
  if (isClassic) {
    ctx.strokeStyle = classicFlash;
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
  }
}

function drawScaledCell(ctx, x, y, color, size, scale = 1, glowAlpha = 0, isClassic = false, classicFlash = '#306230', glowColor = 'rgba(255,255,255,0.5)') {
  const cx = x * size + size / 2;
  const cy = y * size + size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  if (isClassic) {
    ctx.strokeStyle = classicFlash;
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2 + 0.5, -size / 2 + 0.5, size - 1, size - 1);
  }
  ctx.restore();
  if (glowAlpha > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = glowColor.replace('0.5', String(glowAlpha));
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.strokeRect(-size / 2 - 1, -size / 2 - 1, size + 2, size + 2);
    ctx.restore();
  }
}

export function drawSnakeGame({ context, canvas, gridCols, gridRows, theme, blockSize, snake, food, colors, effects }) {
  const { snakeColors, foodColor, retroStroke } = colors;
  const bgColor = theme === 'retro' ? '#0d1f0d' : '#0b0e14';
  context.fillStyle = bgColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food
  if (food) {
    drawCell(context, food.x, food.y, foodColor, blockSize, theme === 'retro', retroStroke);
  }

  // Draw snake
  const headColor = snakeColors.head;
  const bodyColor = snakeColors.body;
  const headGlowColor = theme === 'retro' ? 'rgba(147,209,143,0.5)' : 'rgba(0,191,255,0.5)';
  const headScale = effects?.headScale || 1;
  const headGlowAlpha = effects?.headGlowAlpha || 0;
  const burstPower = effects?.burstPower || 0;
  snake.forEach((seg, idx) => {
    if (idx === 0 && (headScale !== 1 || headGlowAlpha > 0)) {
      drawScaledCell(context, seg.x, seg.y, headColor, blockSize, headScale, headGlowAlpha, theme === 'retro', retroStroke, headGlowColor);
    } else {
      drawCell(context, seg.x, seg.y, idx === 0 ? headColor : bodyColor, blockSize, theme === 'retro', retroStroke);
    }
  });

  // Tail burst/glow effects on eat: radial glow + short trail
  if (burstPower > 0 && snake.length > 0) {
    const head = snake[0];
    const next = snake.length > 1 ? snake[1] : head;
    const dx = head.x - next.x;
    const dy = head.y - next.y;
    const baseColor = theme === 'retro' ? 'rgba(147,209,143,' : 'rgba(11,191,255,';
    // Radial glow around head
    const cx = head.x * blockSize + blockSize / 2;
    const cy = head.y * blockSize + blockSize / 2;
    const radius = blockSize * (0.6 + 0.6 * burstPower);
    const grd = context.createRadialGradient(cx, cy, blockSize * 0.2, cx, cy, radius);
    grd.addColorStop(0, baseColor + (0.25 * burstPower).toFixed(3) + ')');
    grd.addColorStop(1, baseColor + '0)');
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = grd;
    context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.fill();
    context.restore();
    // Short trail in opposite of movement
    const trailLen = Math.max(1, Math.floor(2 + 3 * burstPower));
    for (let i = 1; i <= trailLen; i++) {
      const tx = head.x + dx * i;
      const ty = head.y + dy * i;
      context.save();
      context.globalAlpha = Math.max(0, 0.25 - i * 0.07) * burstPower;
      drawCell(context, tx, ty, headColor, blockSize, theme === 'retro', retroStroke);
      context.restore();
    }
  }
}

// Removed next preview (not typical for Snake)
