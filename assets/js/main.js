import * as AudioCore from './core/audio.js';
import { loadLeaderboard, saveLeaderboard, tryInsertScore, renderLeaderboardSimple as renderLB, sizeLeaderboard as sizeLB, willQualify, projectedRank } from './ui/leaderboard.js';
import { drawSnakeGame } from './core/draw.js';
import { COLS, ROWS, NEON_SNAKE, NEON_FOOD, RETRO_SNAKE, RETRO_FOOD, RETRO_ON, RETRO_FLASH, createInitialSnake, randomFood, stepSnake, oppositeDir } from './core/snake.js';

document.addEventListener('DOMContentLoaded', () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const urlParams = new URLSearchParams(window.location.search);
  const devMode = urlParams.get('dev') === 'true' || localStorage.getItem('devMode') === 'true';
  if (urlParams.get('dev') === 'true') { localStorage.setItem('devMode', 'true'); }
  if (devMode) { document.querySelector('.sfx-tester').style.display = 'block'; }

  // Elements
  const body = document.body;
  const canvas = document.getElementById('snake');
  const context = canvas.getContext('2d');
  const scoreElement = isMobile ? document.getElementById('score-mobile') : document.getElementById('score-desktop');
  const levelElement = isMobile ? document.getElementById('level-mobile') : document.getElementById('level-desktop');
  const timeElement = isMobile ? null : document.getElementById('time-desktop');
  const lengthElement = isMobile ? null : document.getElementById('length-desktop');

  const gameOverlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayScore = document.getElementById('overlay-score');
  const overlayButton = document.getElementById('overlay-button');
  const overlayRestartBtn = document.getElementById('overlay-restart-btn');
  const overlayLeaderboardBtn = document.getElementById('overlay-leaderboard-btn');
  const overlayLeaderboardBox = document.getElementById('overlay-leaderboard');
  const overlayNameForm = document.getElementById('overlay-name-form');
  const nameInput = document.getElementById('name-input');
  const nameSaveBtn = document.getElementById('name-save-btn');
  const overlayInstructions = document.getElementById('overlay-instructions');
  const overlayControls = document.getElementById('overlay-controls');

  const neonThemeBtn = isMobile ? document.getElementById('theme-neon-btn-mobile') : document.getElementById('theme-neon-btn');
  const retroThemeBtn = isMobile ? document.getElementById('theme-retro-btn-mobile') : document.getElementById('theme-retro-btn');

  const sfxTestSelect = document.getElementById('sfx-test-select');
  const sfxTestBtn = document.getElementById('sfx-test-btn');

  // State
  let snake, food, dir, pendingDir = null, score, level, gameOver, isPaused = true, tickInterval = null, lastTick = 0, speedMs = 150;
  // Persist highlight for current session until restart
  let sessionHighlightKey = null;
  let currentTheme = localStorage.getItem('snakeTheme') || 'neon';
  let startTime = 0; let elapsedMs = 0;

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('snakeTheme', theme);
    body.classList.remove('theme-neon', 'theme-retro');
    body.classList.add(`theme-${theme}`);
    // Reflect selection state on buttons
    const neonBtns = [document.getElementById('theme-neon-btn'), document.getElementById('theme-neon-btn-mobile')].filter(Boolean);
    const retroBtns = [document.getElementById('theme-retro-btn'), document.getElementById('theme-retro-btn-mobile')].filter(Boolean);
    neonBtns.forEach(b => b.setAttribute('aria-pressed', theme === 'neon' ? 'true' : 'false'));
    retroBtns.forEach(b => b.setAttribute('aria-pressed', theme === 'retro' ? 'true' : 'false'));
    if (snake) drawEverything();
  }
  applyTheme(currentTheme);

  function populateSfxTester() {
    sfxTestSelect.innerHTML = '';
    for (const key in AudioCore.SNAKE_SFX) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = AudioCore.SNAKE_SFX[key].name;
      sfxTestSelect.appendChild(option);
    }
  }
  if (devMode) populateSfxTester();
  if (sfxTestBtn) sfxTestBtn.addEventListener('click', () => {
    const key = sfxTestSelect.value;
    const preset = AudioCore.SNAKE_SFX[key];
    if (preset) AudioCore.playScore(preset);
  });

  function resetGame() {
    snake = createInitialSnake();
    dir = { x: 1, y: 0 };
    pendingDir = null;
    food = randomFood(snake);
    score = 0; level = 1; speedMs = 150; elapsedMs = 0; startTime = performance.now();
    gameOver = false; isPaused = true;
    sessionHighlightKey = null;
    updateStats();
    drawEverything();
  }

  function updateStats() {
    if (scoreElement) scoreElement.textContent = String(score);
    if (levelElement) levelElement.textContent = String(level);
    if (timeElement) timeElement.textContent = formatMs(elapsedMs);
    if (lengthElement) lengthElement.textContent = String(snake.length);
  }

  function formatMs(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  let overlayState = 'menu';
  // Track the exact previous overlay to return to when closing leaderboard
  let overlayPrevState = null;
  function setOverlay(visible, title = '', showScore = false, buttonText = '开始游戏') {
    gameOverlay.style.display = visible ? 'flex' : 'none';
    overlayTitle.textContent = title;
    overlayScore.style.display = showScore ? 'block' : 'none';
    if (showScore) {
      const scoreEl = document.getElementById('overlay-score-value');
      if (scoreEl) scoreEl.textContent = String(score);
    }
    overlayButton.textContent = buttonText;
    const actionsEl = document.getElementById('overlay-actions');
    // Determine overlay mode
    const isMenu = title === '贪吃蛇' || overlayState === 'menu';
    const isPause = title === '暂停' || overlayState === 'pause';
    const isGameOver = showScore;
    // Controls visibility
    // Show the main action button on menu and pause; hide on game over
    if (overlayControls) overlayControls.style.display = isGameOver ? 'none' : 'block';
    // Show operation tips on menu and pause; hide on game over
    if (overlayInstructions) overlayInstructions.style.display = isGameOver ? 'none' : 'block';
    // Actions container
    if (actionsEl) actionsEl.style.display = visible ? 'flex' : 'none';
    // Button visibility
    overlayRestartBtn.style.display = (isGameOver || isPause) ? 'inline-block' : 'none';
    overlayLeaderboardBtn.style.display = (isGameOver || isMenu) ? 'inline-block' : 'none';
    // Ensure game-over centers properly and leaderboard layout is cleared
    gameOverlay.classList.toggle('game-over', showScore);
    gameOverlay.classList.remove('showing-leaderboard');
    document.body.classList.remove('lb-open');
    overlayLeaderboardBox.style.display = 'none';
    overlayNameForm.style.display = 'none';
  }

  // Simple elastic effect state for head on eat
  let eatFx = { active: false, t: 0, dur: 240, queue: 0 };
  function easeOutBack(x, s = 2.2) { const t = x - 1; return (t * t * ((s + 1) * t + s) + 1); }
  function drawEverything() {
    const blockSize = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
    const themeColors = currentTheme === 'retro' ? { snakeColors: RETRO_SNAKE, foodColor: RETRO_FOOD, retroStroke: RETRO_FLASH } : { snakeColors: NEON_SNAKE, foodColor: NEON_FOOD, retroStroke: RETRO_FLASH };
    let headScale = 1, headGlowAlpha = 0, burstPower = 0;
    if (eatFx.active) {
      const p = Math.min(1, eatFx.t / eatFx.dur);
      const amp = 0.28 + Math.min(0.38, 0.08 * eatFx.queue);
      const overshoot = easeOutBack(p);
      headScale = 1 + amp * (1 - overshoot); // elastic settle
      headGlowAlpha = Math.max(0, 0.6 * (1 - p));
      burstPower = Math.max(0, 1.0 - p);
    }
    drawSnakeGame({
      context,
      canvas,
      gridCols: COLS,
      gridRows: ROWS,
      theme: currentTheme,
      blockSize,
      snake,
      food,
      colors: themeColors,
      effects: { headScale, headGlowAlpha, burstPower }
    });
  }

  function resizeGame() {
    const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 140);
    const target = Math.max(240, Math.min(640, Math.floor(maxSize / 24) * 24));
    canvas.width = target;
    canvas.height = target;
    drawEverything();
  }
  window.addEventListener('resize', resizeGame);

  function gameTick(timestamp) {
    if (isPaused || gameOver) return;
    if (!lastTick) lastTick = timestamp;
    const elapsed = timestamp - lastTick;
    if (elapsed >= speedMs) {
      lastTick = timestamp;
      // apply pending dir if not opposite
      if (pendingDir && !oppositeDir(pendingDir, dir)) {
        dir = pendingDir; pendingDir = null;
      }
      const res = stepSnake({ snake, dir, food });
      if (res.crashed) return onGameOver();
      snake = res.nextSnake;
      if (res.ate) {
        score += 10;
        // smoother speed progression: accelerate every 3 foods, cap minimum interval
        if (snake.length % 3 === 0) { level++; speedMs = Math.max(70, speedMs - 8); }
        food = randomFood(snake);
        AudioCore.playSound('eat', currentTheme);
        // Trigger elastic FX; queue if already active
        if (eatFx.active && eatFx.t < eatFx.dur) {
          eatFx.queue = Math.min(5, eatFx.queue + 1);
        } else {
          eatFx.queue = 0;
          eatFx.t = 0;
          eatFx.active = true;
        }
      } else {
        // no move tick each step; keep sound only on turn/eat/die
      }
      elapsedMs = performance.now() - startTime;
      updateStats();
      drawEverything();
    }
    // Progress eat animation smoothness per frame
    if (eatFx.active) {
      eatFx.t += elapsed;
      if (eatFx.t >= eatFx.dur) {
        if (eatFx.queue > 0) { eatFx.queue--; eatFx.t = Math.max(0, eatFx.dur * 0.4); }
        else { eatFx.active = false; eatFx.t = 0; }
      }
    }
    tickInterval = requestAnimationFrame(gameTick);
  }

  function onGameOver() {
    gameOver = true;
    isPaused = true;
    cancelAnimationFrame(tickInterval);
    AudioCore.playSound('die', currentTheme);
    elapsedMs = performance.now() - startTime;
    updateStats();
    setOverlay(true, '游戏结束', true, '重新开始');
    overlayState = 'gameover';
    // Prompt for name input if score qualifies
    if (willQualify(score, snake.length, elapsedMs)) {
      overlayNameForm.style.display = 'block';
      // hide actions while entering name
      const actionsEl = document.getElementById('overlay-actions');
      if (actionsEl) actionsEl.style.display = 'none';
      // focus input for immediate typing
      setTimeout(() => { nameInput?.focus(); }, 0);
      const congrats = document.getElementById('overlay-congrats');
      const pr = projectedRank(score, snake.length, elapsedMs);
      if (congrats) { congrats.textContent = pr ? `恭喜进入第 ${pr} 名！` : ''; }
    }
  }

  function startGame() {
    if (gameOver) resetGame();
    isPaused = false;
    setOverlay(false);
    lastTick = 0;
    startTime = performance.now();
    if (!introPlayed) {
      introPlayed = true;
      AudioCore.playScore(AudioCore.SNAKE_SFX[`${currentTheme}_start`]);
    }
    tickInterval = requestAnimationFrame(gameTick);
  }

  // Controls
  function setDir(nx, ny, forceSound = false) {
    const nd = { x: nx, y: ny };
    // play feedback on opposite direction too, but do not apply
    if (oppositeDir(nd, dir)) {
      AudioCore.playSound('invalid', currentTheme);
      return;
    }
    const sameAsDir = nd.x === dir.x && nd.y === dir.y;
    const sameAsPending = pendingDir && nd.x === pendingDir.x && nd.y === pendingDir.y;
    // Only play turn SFX if it represents a real direction change
    if (forceSound || (!sameAsDir && !sameAsPending)) {
      pendingDir = nd;
      AudioCore.playSound('turn', currentTheme);
    } else {
      // Update pendingDir for consistency but do not play sound
      pendingDir = nd;
    }
  }
  window.addEventListener('keydown', (e) => {
    // Ignore ALL game hotkeys while typing name on leaderboard; form handles Enter itself
    const typingName = overlayNameForm && overlayNameForm.style.display !== 'none' && document.activeElement === nameInput;
    if (typingName) return;
    // While paused, ignore directional inputs to avoid SFX or pending dir changes
    if (overlayState === 'pause') {
      if (e.key === 'Escape') {
        // resume is handled below
      } else if (e.key === 'Enter') {
        // allow Enter to resume like clicking Continue
        setOverlay(false);
        isPaused = false;
        overlayState = 'running';
        tickInterval = requestAnimationFrame(gameTick);
      }
      return;
    }
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') setDir(0, -1);
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') setDir(0, 1);
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') setDir(-1, 0);
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') setDir(1, 0);
    else if (e.key === 'Enter') {
      if (gameOverlay.style.display !== 'none') {
        // Unlock audio when starting via keyboard
        AudioCore.unlockAudio?.();
        startGame();
      }
    } else if (e.key === 'Escape') {
      if (gameOverlay.style.display === 'none') {
        isPaused = true;
        overlayState = 'pause';
        setOverlay(true, '暂停', false, '继续');
      } else if (overlayTitle.textContent === '暂停') {
        setOverlay(false);
        tickInterval = requestAnimationFrame(gameTick);
        isPaused = false;
        overlayState = 'running';
      }
    }
  });

  // Mobile buttons
  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  // Use passive listeners for touchstart on D-pad buttons to avoid scroll-blocking warnings
  if (btnUp) btnUp.addEventListener('touchstart', () => setDir(0, -1, true), { passive: true });
  if (btnDown) btnDown.addEventListener('touchstart', () => setDir(0, 1, true), { passive: true });
  if (btnLeft) btnLeft.addEventListener('touchstart', () => setDir(-1, 0, true), { passive: true });
  if (btnRight) btnRight.addEventListener('touchstart', () => setDir(1, 0, true), { passive: true });

  // Gesture controls on canvas (short swipe)
  let touchStart = null;
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
  }
  function onTouchMove(e) {
    // prevent scroll while interacting on game area
    e.preventDefault();
  }
  function onTouchEnd(e) {
    if (!touchStart) return; const dx = (e.changedTouches[0].clientX - touchStart.x); const dy = (e.changedTouches[0].clientY - touchStart.y);
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 24) { touchStart = null; return; }
    if (adx > ady) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }
  // touchstart/end can be passive; touchmove remains non-passive to allow preventDefault
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });

  // Prevent iOS Safari double-tap zoom globally
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  neonThemeBtn?.addEventListener('click', () => applyTheme('neon'));
  retroThemeBtn?.addEventListener('click', () => applyTheme('retro'));

  overlayButton.addEventListener('click', () => {
    // First user gesture unlocks audio
    AudioCore.unlockAudio?.();
    // If paused, resume without resetting timers/music
    if (overlayState === 'pause') {
      setOverlay(false);
      isPaused = false;
      overlayState = 'running';
      tickInterval = requestAnimationFrame(gameTick);
      return;
    }
    // Otherwise, start a new or first game
    startGame();
  });
  overlayRestartBtn.addEventListener('click', () => {
    AudioCore.unlockAudio?.();
    resetGame();
    // ensure start music on restart as well
    introPlayed = false;
    startGame();
  });
  const overlayBackBtn = document.getElementById('overlay-back-btn');
  overlayBackBtn?.addEventListener('click', () => {
    // Back from leaderboard to the exact previous overlay state
    gameOverlay.classList.remove('showing-leaderboard');
    overlayLeaderboardBox.style.display = 'none';
    overlayNameForm.style.display = 'none';
    overlayBackBtn.style.display = 'none';
    // Restore using explicit previous state
    const prev = overlayPrevState;
    overlayPrevState = null;
    if (prev === 'menu') {
      setOverlay(true, '贪吃蛇', false, '开始游戏');
      overlayState = 'menu';
    } else if (prev === 'pause') {
      setOverlay(true, '暂停', false, '继续');
      overlayState = 'pause';
    } else if (prev === 'gameover') {
      setOverlay(true, '游戏结束', true, '重新开始');
      overlayState = 'gameover';
    } else {
      // Fallback to start menu
      setOverlay(true, '贪吃蛇', false, '开始游戏');
      overlayState = 'menu';
    }
  });
  overlayLeaderboardBtn.addEventListener('click', () => {
    AudioCore.unlockAudio?.();
    // Capture the previous overlay before entering leaderboard
    overlayPrevState = overlayState;
    overlayState = 'leaderboard';
    gameOverlay.classList.add('showing-leaderboard');
    document.body.classList.add('lb-open');
    overlayTitle.textContent = '排行榜';
    overlayScore.style.display = 'none';
    if (overlayControls) overlayControls.style.display = 'none';
    const overlayInstructions = document.getElementById('overlay-instructions');
    if (overlayInstructions) overlayInstructions.style.display = 'none';
    overlayLeaderboardBox.style.display = 'block';
    // Show actions row with only Back button
    const actionsEl = document.getElementById('overlay-actions');
    if (actionsEl) actionsEl.style.display = 'flex';
    // only Back visible in actions row
    overlayRestartBtn.style.display = 'none';
    overlayLeaderboardBtn.style.display = 'none';
    if (overlayBackBtn) overlayBackBtn.style.display = 'inline-block';
    // Hide name form initially for a cleaner look
    overlayNameForm.style.display = 'none';
    const list = loadLeaderboard();
    renderLB(overlayLeaderboardBox, list, { highlightKey: sessionHighlightKey });
  });
  // Submit handler: allow Enter within form to confirm
  overlayNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim() || '玩家';
    const { record, rank, list } = tryInsertScore({ name, score, length: snake.length, timeMs: elapsedMs });
    nameInput.value = '';
    // Switch overlay to leaderboard view (previous state is gameover here)
    overlayPrevState = 'gameover';
    overlayNameForm.style.display = 'none';
    overlayTitle.textContent = '排行榜';
    overlayScore.style.display = 'none';
    if (overlayControls) overlayControls.style.display = 'none';
    const overlayInstructions = document.getElementById('overlay-instructions');
    if (overlayInstructions) overlayInstructions.style.display = 'none';
    gameOverlay.classList.add('showing-leaderboard');
    document.body.classList.add('lb-open');
    // Show list and Back button only
    overlayLeaderboardBox.style.display = 'block';
    // Hide congrats in leaderboard view; it belongs inside the form only
    const congrats = document.getElementById('overlay-congrats');
    if (congrats) { congrats.textContent = ''; }
    const actionsEl = document.getElementById('overlay-actions');
    if (actionsEl) actionsEl.style.display = 'flex';
    overlayRestartBtn.style.display = 'none';
    overlayLeaderboardBtn.style.display = 'none';
    if (overlayBackBtn) overlayBackBtn.style.display = 'inline-block';
    // Render with highlight for current record
    sessionHighlightKey = `${name}|${score}|${record.ts || ''}`;
    renderLB(overlayLeaderboardBox, list, { highlightKey: sessionHighlightKey });
  });

  // Initial
  resetGame();
  setOverlay(true, '贪吃蛇', false, '开始游戏');
  // Keep default overlay layout; remove JS positioning tweak
  // Defer intro to first click on Start to avoid premature playback
  let introPlayed = false;
  // Remove demo seeding to use real scores only
  resizeGame();
});
