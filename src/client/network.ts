import { io, Socket } from 'socket.io-client';
import type {
  Player,
  Projectile,
  Fish,
  ChatMessageData,
  NewPlayerData,
  PlayerStunnedData,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../shared/types';
import { state, localPlayer } from './state';
import { addChatMessage, updatePlayerCount } from './ui';

export let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function initSocket(): void {
  try {
    socket = io();

    socket.on('connect', () => {
      const connStatus = document.getElementById('conn-status');
      if (connStatus) {
        connStatus.innerText = 'CONNECTED';
        connStatus.className = 'text-green-400';
      }
      sendUpdate();
    });

    socket.on('disconnect', () => {
      const connStatus = document.getElementById('conn-status');
      if (connStatus) {
        connStatus.innerText = 'DISCONNECTED';
        connStatus.className = 'text-red-500';
      }
    });

    socket.on('chat-message', (msg: ChatMessageData) => {
      addChatMessage(msg.name, msg.text, msg.color);
    });

    socket.on('players-list', (data: Record<string, Player>) => {
      // Remove players that no longer exist
      for (const id in state.players) {
        if (!data[id]) delete state.players[id];
      }

      // Update or add players
      for (const id in data) {
        if (id === socket?.id) continue;

        if (!state.players[id]) {
          state.players[id] = {
            ...data[id],
            targetX: data[id].x,
            targetY: data[id].y,
          };
        } else {
          state.players[id].targetX = data[id].x;
          state.players[id].targetY = data[id].y;
          state.players[id].name = data[id].name;
          state.players[id].color = data[id].color;
          state.players[id].direction = data[id].direction;
          state.players[id].skinType = data[id].skinType;
        }
      }
      updatePlayerCount();
    });

    socket.on('player-removed', (id: string) => {
      delete state.players[id];
      updatePlayerCount();
    });

    socket.on('projectiles-update', (data: Projectile[]) => {
      state.projectiles = data;
    });

    socket.on('fish-update', (data: Fish[]) => {
      state.fish = data;
    });

    socket.on('scores-update', (data: Record<string, number>) => {
      state.scores = data;
    });

    socket.on('new-player', (data: NewPlayerData) => {
      Object.assign(localPlayer, data.player);
    });

    socket.on('player-stunned', (data: PlayerStunnedData) => {
      state.stunned[data.playerId] = {
        until: data.until,
        immuneUntil: data.immuneUntil,
      };
    });
  } catch (e) {
    console.error('Socket error:', e);
  }
}

export function sendUpdate(): void {
  if (localPlayer.id && socket?.connected) {
    socket.emit('player-update', {
      x: Math.round(localPlayer.x),
      y: Math.round(localPlayer.y),
      color: localPlayer.color,
      direction: localPlayer.direction,
      skinType: localPlayer.skinType,
      name: localPlayer.name,
    });
  }
}

export function sendMessage(): void {
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const text = input.value.trim();
  if (text && socket?.connected) {
    socket.emit('send-chat', {
      text: text,
      name: localPlayer.name,
      color: localPlayer.color,
    });
    addChatMessage(localPlayer.name, text, localPlayer.color);
    input.value = '';
  }
}

export function fireYarn(): void {
  const now = Date.now();

  if (now - state.lastFireTime < 500) {
    return;
  }

  if (state.stunned[socket?.id ?? '']?.until > now) {
    return;
  }

  state.lastFireTime = now;

  if (socket?.connected) {
    socket.emit('fire-yarn', {
      directionX: state.lastMovementDirection.x,
      directionY: 0,
    });
  }
}
