import './style.css';
import { createGame } from './game/game.js';

const canvas = document.getElementById('game');
const hudContainer = document.getElementById('hud');

createGame(canvas, hudContainer).start();
