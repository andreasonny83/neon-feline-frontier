import { state, localPlayer, PROJECTILE_COOLDOWN } from './state';
import { socket } from './network';

export function addChatMessage(name: string, text: string, color: string): void {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'chat-msg';

  // Sanitization
  const cleanName = name.replace(/</g, '&lt;');
  const cleanText = text.replace(/</g, '&lt;');

  div.innerHTML = `<span style="color:${color}; font-weight:bold;">[${cleanName}]</span>: ${cleanText}`;
  container.appendChild(div);

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

export function updatePlayerCount(): void {
  const count = 1 + Object.keys(state.players).length;
  const el = document.getElementById('player-count');
  if (el) {
    el.innerText = String(count);
  }
}

export function updateStatsUI(): void {
  // Update score
  const yourScore = state.scores[socket?.id ?? ''] || 0;
  const scoreEl = document.getElementById('your-score');
  if (scoreEl) {
    scoreEl.innerText = String(yourScore);
  }

  // Update cooldown bar
  const now = Date.now();
  const cooldownRemaining = Math.max(0, PROJECTILE_COOLDOWN - (now - state.lastFireTime));
  const cooldownPercent = (1 - cooldownRemaining / PROJECTILE_COOLDOWN) * 100;
  const fillEl = document.getElementById('cooldown-fill') as HTMLElement;
  if (fillEl) {
    fillEl.style.width = cooldownPercent + '%';
  }
}

export function updateScoreboard(): void {
  const scoreboardList = document.getElementById('scoreboard-list');
  if (!scoreboardList) return;

  // Create array of player scores with their names
  const playerScores: Array<{ id: string; name: string; score: number; color: string }> = [];

  for (const playerId in state.players) {
    const player = state.players[playerId];
    const score = state.scores[playerId] || 0;
    playerScores.push({
      id: playerId,
      name: player.name || 'Unknown',
      score: score,
      color: player.color,
    });
  }

  // Add local player if not already in list
  const socketId = socket?.id;
  if (socketId && !playerScores.find((p) => p.id === socketId)) {
    playerScores.push({
      id: socketId,
      name: localPlayer.name,
      score: state.scores[socketId] || 0,
      color: localPlayer.color,
    });
  }

  // Sort by score (descending)
  playerScores.sort((a, b) => b.score - a.score);

  // Generate HTML
  let html = '';
  playerScores.forEach((player, index) => {
    const rank = index + 1;
    const isLocalPlayer = player.id === socket?.id;
    const highlightClass = isLocalPlayer ? 'highlight' : '';

    html += `
      <div class="scoreboard-entry ${highlightClass}">
        <span class="scoreboard-rank">#${rank}</span>
        <span class="scoreboard-name" style="color: ${player.color}">${player.name}</span>
        <span class="scoreboard-score">🐟 ${player.score}</span>
      </div>
    `;
  });

  scoreboardList.innerHTML = html;
}
