// Builds every system once and wires them together. Scenes read it from game.registry.get('app').
import { SaveSystem } from './SaveSystem.js';
import { GameState } from './GameState.js';
import { EnergySystem } from './EnergySystem.js';
import { GeneratorSystem } from './GeneratorSystem.js';
import { GoalSystem } from './GoalSystem.js';
import { MergeSystem } from './MergeSystem.js';
import { EventSystem } from './EventSystem.js';
import { Economy } from './Economy.js';
import { AudioSystem } from './AudioSystem.js';
import { CustomerSystem } from './CustomerSystem.js';
import { ProgressionSystem } from './ProgressionSystem.js';
import { RivalSystem } from './RivalSystem.js';
import { QuestSystem } from './QuestSystem.js';
import { DailyReward } from './DailyReward.js';
import { IdleEarnings } from './IdleEarnings.js';
import { ChestSystem } from './ChestSystem.js';
import { LeaderboardService } from './LeaderboardService.js';
import { NotificationService } from './NotificationService.js';
import { AdsService } from '../services/AdsService.js';
import { IAPService } from '../services/IAPService.js';
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
  const gen = new GeneratorSystem(state);
  gen.sync();
  const events = new EventSystem(state);
  const economy = new Economy(state, events);
  const merge = new MergeSystem(state, energy, gen);
  const audio = new AudioSystem(state);
  const customers = new CustomerSystem(state, merge, economy);
  const progression = new ProgressionSystem(state, merge);
  const rival = new RivalSystem(state, merge, customers);
  const goals = new GoalSystem(state, gen);
  const quests = new QuestSystem(state, energy);
  const daily = new DailyReward(state, energy);
  const idle = new IdleEarnings(state);
  const chest = new ChestSystem(state, energy, merge);
  const leaderboard = new LeaderboardService(state);
  const notify = new NotificationService(state, energy, events, chest);
  const ads = new AdsService(state);
  const iap = new IAPService(state);
  quests.ensureToday();

  state.bus.on('settings', (key, value) => { if (key === 'vibration') setHapticsEnabled(value); });

  return { saves, state, energy, gen, goals, events, economy, merge, audio, customers, progression, rival, quests, daily, idle, chest, leaderboard, notify, ads, iap, ui: null, toast: null };
}
