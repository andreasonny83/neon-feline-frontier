import { FIRE_COOLDOWN } from "../shared/types";
import { state } from "./state";
import { socket } from "./network";

export function updatePlayerCount(): void {
  const count = 1 + Object.keys(state.players).length;
  document.getElementById("player-count")!.innerText = String(count);
}

export function updateStatsUI(): void {
  // Update score
  const yourScore = state.scores[socket?.id ?? ""] || 0;
  document.getElementById("your-score")!.innerText = String(yourScore);

  // Update cooldown bar
  const now = Date.now();
  const cooldownRemaining = Math.max(0, FIRE_COOLDOWN - (now - state.lastFireTime));
  const cooldownPercent = (1 - cooldownRemaining / FIRE_COOLDOWN) * 100;
  (document.getElementById("cooldown-fill") as HTMLElement).style.width = cooldownPercent + "%";
}

export function updateScoreboard(): void {
  const scoreboardList = document.getElementById("scoreboard-list");
  if (!scoreboardList) return;

  // Create array of player scores with their names
  const playerScores: { id: string; name: string; score: number; color: string }[] = [];
  for (const playerId in state.players) {
    const player = state.players[playerId];
    const score = state.scores[playerId] || 0;
    playerScores.push({
      id: playerId,
      name: player.name || "Unknown",
      score: score,
      color: player.name.startsWith("Penny") ? "pink" : player.color,
    });
  }

  // Add local player if not already in list
  const socketId = socket?.id;
  if (socketId && !playerScores.find((p) => p.id === socketId)) {
    playerScores.push({
      id: socketId,
      name: state.localPlayer.name,
      score: state.scores[socketId] || 0,
      color: state.localPlayer.name.startsWith("Penny") ? "pink" : state.localPlayer.color,
    });
  }

  // Sort by score (descending)
  playerScores.sort((a, b) => b.score - a.score);

  // Generate HTML
  let html = "";
  playerScores.forEach((player, index) => {
    const rank = index + 1;
    const isLocalPlayer = player.id === socket?.id;
    const highlightClass = isLocalPlayer ? "highlight" : "";

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
