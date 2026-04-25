import { createNetClient } from './client.js';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || window.location.origin;
const WS_URL = WORKER_URL.replace(/^http/, 'ws');

export async function initLobby() {
  const params = new URLSearchParams(window.location.search);

  // ?new → create a room, then redirect to ?room=<id>
  if (params.has('new')) {
    const overlay = showOverlay('Creating room…');
    const res = await fetch(`${WORKER_URL}/rooms`, { method: 'POST' });
    const { roomId } = await res.json();
    overlay.remove();
    window.location.replace(`?room=${roomId}`);
    return new Promise(() => {}); // never resolves — redirect is happening
  }

  const roomId = params.get('room');

  // No room param → show the main lobby screen, wait for user choice
  if (!roomId) {
    return showLobbyScreen();
  }

  // ?room=<id> → connect and wait for the server to acknowledge the join
  const overlay = showOverlay(`Joining room <span style="color:#00d4ff">${roomId}</span>…`);
  const net = createNetClient(`${WS_URL}/rooms/${roomId}/ws`);

  return new Promise((resolve) => {
    net.onJoined(() => {
      overlay.remove();
      resolve(net);
    });
    net.connect();
  });
}

function showLobbyScreen() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        position:fixed;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:#050810;font-family:monospace;color:#aac8e0;
        gap:20px;z-index:1000;
      ">
        <div style="font-size:28px;letter-spacing:4px;color:#00d4ff;margin-bottom:8px">SOLAR IMPERIUM</div>
        <button id="lb-solo" style="${btnStyle('#00d4ff')}">SOLO</button>
        <button id="lb-new"  style="${btnStyle('#00d4ff')}">MULTIPLAYER — NEW ROOM</button>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="lb-room-id" placeholder="Room ID" maxlength="8"
            style="background:#0a1020;border:1px solid #2a4060;color:#aac8e0;
                   font-family:monospace;font-size:14px;padding:8px 12px;width:120px;
                   letter-spacing:2px;outline:none;text-transform:lowercase"/>
          <button id="lb-join" style="${btnStyle('#aac8e0')}">JOIN</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('#lb-solo').addEventListener('click', () => {
      el.remove();
      resolve(null); // null → single-player
    });

    el.querySelector('#lb-new').addEventListener('click', () => {
      window.location.href = '?new';
    });

    el.querySelector('#lb-join').addEventListener('click', () => {
      const roomId = el.querySelector('#lb-room-id').value.trim();
      if (roomId) window.location.href = `?room=${roomId}`;
    });

    el.querySelector('#lb-room-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el.querySelector('#lb-join').click();
    });
  });
}

function showOverlay(html) {
  const el = document.createElement('div');
  el.innerHTML = `<div style="
    position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    background:#050810;font-family:monospace;font-size:16px;
    color:#aac8e0;letter-spacing:2px;z-index:1000;
  ">${html}</div>`;
  document.body.appendChild(el);
  return el;
}

function btnStyle(color) {
  return `background:transparent;border:1px solid ${color};color:${color};
          font-family:monospace;font-size:14px;letter-spacing:2px;
          padding:10px 24px;cursor:pointer;transition:background 0.1s`;
}
