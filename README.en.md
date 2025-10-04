# Snake Classic

<div align="center">
  <p>A classic Snake game for desktop and mobile</p>
  <p>English | <a href="README.md">中文</a></p>
</div>

## ✨ Features
- Neon / Retro themes
- Desktop keyboard control, mobile on‑screen arrow buttons + gestures
- Local Top 10 leaderboard (name + score), inline name entry on qualify
- Snake‑specific SFX: start, turn, eat, die
- Mobile optimizations: prevent double‑tap zoom, adaptive bottom D‑pad

## 🎮 Controls
- Desktop (PC)
  - Direction: Arrow keys or WASD
  - Start: Enter
  - Pause: ESC
- Mobile
  - Direction: On‑screen arrow buttons or short swipe on canvas
  - Start: Tap “Start Game”

## 🚀 Usage
### Run directly
Open `index.html` in a modern browser.

### Local server
```bash
python3 -m http.server 8080
# or
npx http-server -p 8080
```

## 📁 Project Structure
```
.
├─ index.html                # Single page with external CSS/JS
├─ assets/
│  ├─ css/styles.css         # Styles (themes, mobile D‑pad, overlays)
│  └─ js/
│     ├─ main.js             # Game loop, input, overlays, theme, audio unlock
│     ├─ core/
│     │  ├─ snake.js         # Grid, movement, eat, collision
│     │  ├─ draw.js          # Canvas rendering (head elastic scale, eat glow/trail burst)
│     │  └─ audio.js         # Audio engine (Snake SFX)
│     └─ ui/
│        └─ leaderboard.js   # Leaderboard logic + render (Top 10, highlight current)
```

## 🏆 Leaderboard
- Inserts positive scores only; keeps Top 10 (descending score, then length/time)
- On qualify, prompts inline name entry at game over, then highlights the current record

## 🔧 Compatibility
- Works in modern browsers (Chrome, Safari/iOS, Firefox, Edge, Android WebView)
- Prefer a local server (module loading may fail under file://)

---

<div align="center">
  <p>Made with ❤️ by Zenver Tao</p>
  <p><a href="LICENSE">License: MIT</a></p>
</div>
