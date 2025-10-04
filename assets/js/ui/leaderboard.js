// Simple local leaderboard (Name + Score + Length + Time)

const STORAGE_KEY = 'snakeLeaderboard';

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function saveLeaderboard(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function tryInsertScore({ name, score, length, timeMs }) {
  const list = loadLeaderboard();
  const record = { name: name || '玩家', score, length, timeMs, ts: Date.now() };
  list.push(record);
  list.sort((a, b) => b.score - a.score || b.length - a.length || a.timeMs - b.timeMs);
  const rank = list.findIndex(e => e === record) + 1;
  if (list.length > 10) list.length = 10;
  saveLeaderboard(list);
  return { record, rank, list };
}

export function renderLeaderboardSimple(container, list, { highlightKey } = {}) {
  container.innerHTML = '';
  const ul = document.createElement('div');
  ul.className = 'leaderboard-list';
  list.forEach((item, idx) => {
    const row = document.createElement('div');
    const rankClass = idx < 3 ? `rank-${idx + 1}` : '';
    const key = `${item.name}|${item.score}|${item.ts || ''}`;
    const isHighlight = highlightKey && key === highlightKey;
    row.className = `leaderboard-item ${rankClass}${isHighlight ? ' highlight' : ''}`;
    const rank = document.createElement('div');
    const medalClass = idx === 0 ? 'medal-gold' : idx === 1 ? 'medal-silver' : idx === 2 ? 'medal-bronze' : '';
    rank.className = `leaderboard-rank ${medalClass}`;
    rank.textContent = `${idx + 1}.`;
    const name = document.createElement('div');
    name.className = 'leaderboard-name';
    name.textContent = item.name;
    const score = document.createElement('div');
    score.className = 'leaderboard-score';
    score.textContent = `${item.score}`;
    row.append(rank, name, score);
    ul.appendChild(row);
  });
  container.appendChild(ul);
}

export function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

export function sizeLeaderboard(overlay, listContainer, button, state) {
  // Keep default styles; placeholder for responsive adjustments if needed
}

// Seed demo data (max 10) if no leaderboard yet
// seedLeaderboardDemo removed for production

// Check whether a given score would qualify for top 10 without inserting
export function willQualify(score, length = 0, timeMs = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(score) || score <= 0) return false;
  const list = loadLeaderboard();
  if (list.length < 10) return true;
  const copy = list.slice();
  const ts = Date.now();
  copy.push({ name: '玩家', score, length, timeMs, ts });
  copy.sort((a, b) => b.score - a.score || b.length - a.length || a.timeMs - b.timeMs || a.ts - b.ts);
  const idx = copy.findIndex(e => e.ts === ts);
  return idx > -1 && idx < 10;
}

// Return projected rank (1-based) if this score would place in top 10; otherwise null
export function projectedRank(score, length = 0, timeMs = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(score) || score <= 0) return null;
  const list = loadLeaderboard();
  const copy = list.slice();
  const ts = Date.now();
  copy.push({ name: '玩家', score, length, timeMs, ts });
  copy.sort((a, b) => b.score - a.score || b.length - a.length || a.timeMs - b.timeMs || a.ts - b.ts);
  const idx = copy.findIndex(e => e.ts === ts);
  return (idx > -1 && idx < 10) ? (idx + 1) : null;
}
