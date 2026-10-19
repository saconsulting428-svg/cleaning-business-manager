// Registers every popup screen with the PopupManager.
import { dailyScreen } from './daily.js';
import { welcomeScreen } from './welcome.js';
import { questsScreen } from './quests.js';
import { albumScreen } from './album.js';
import { shopScreen } from './shop.js';
import { chestScreen } from './chest.js';
import { leaderboardScreen } from './leaderboard.js';
import { settingsScreen } from './settings.js';
import { levelupScreen, dishScreen } from './celebration.js';
import { rivalScreen } from './rival.js';
import { adMockScreen, confirmScreen, energyScreen } from './misc.js';

export function registerScreens(popups) {
  const screens = {
    daily: dailyScreen,
    welcome: welcomeScreen,
    quests: questsScreen,
    album: albumScreen,
    shop: shopScreen,
    chest: chestScreen,
    leaderboard: leaderboardScreen,
    settings: settingsScreen,
    levelup: levelupScreen,
    dish: dishScreen,
    rival: rivalScreen,
    adMock: adMockScreen,
    confirm: confirmScreen,
    energy: energyScreen,
  };
  Object.entries(screens).forEach(([name, def]) => popups.register(name, def));
}
