import './style.css';
import { createGame } from './game/game.js';
import { initLobby } from './net/lobby.js';

const canvas = document.getElementById('game');
const hudContainer = document.getElementById('hud');

async function boot() {
  const net = await initLobby();
  const game = createGame(canvas, hudContainer, net);
  game.start();
}

boot();
