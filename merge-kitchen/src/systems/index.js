// Builds every system once and wires them together. Scenes read it from game.registry.get('app').
import { SaveSystem } from './SaveSystem.js';
import { GameState } from './GameState.js';
import { EnergySystem } from './EnergySystem.js';
import { MergeSystem } from './MergeSystem.js';
import { EventSystem } from './EventSystem.js';
import { Economy } from './Economy.js';
import { AudioSystem } from './AudioSystem.js';
import { setHapticsEnabled } from './Platform.js';
import { setLang } from '../data/i18n.js';

export function createSystems() {
  const saves = new SaveSystem();
  const state = new GameState(saves);
  setLang(state.data.settings.lang);
  setHapticsEnabled(state.data.settings.vibration);
  state.data.stats.sessions += 1;

  const energy = new EnergySystem(state);
  energy.sync();
  const events = new EventSystem(state);
  const economy = new Economy(state, events);
  const merge = new MergeSystem(state, energy);
  const audio = new AudioSystem(state);

  state.bus.on('settings', (key, value) => { if (key === 'vibration') setHapticsEnabled(value); });

  return { saves, state, energy, events, economy, merge, audio, ui: null, toast: null, customers: null };
}
