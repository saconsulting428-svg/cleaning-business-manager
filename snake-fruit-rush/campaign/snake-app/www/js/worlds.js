/* The five worlds: palettes and the colour swaps that retint the shared wall / portal art. */
(function (S) {
  'use strict';
  // colours used inside wall-block.svg that get replaced per world
  const WALL_KEYS = ['#46624e', '#263c35', '#91b47a', '#78966a', '#314b3d', '#b7cf8a'];
  const PORTAL_KEYS = ['#8ef5d4', '#52d6ba', '#64e5bb', '#d8fff0', '#17425a', '#153b56', '#216fa4'];

  S.WORLDS = [
    { id: 'garden', name: 'Garden', trail: 'GARDEN TRAIL', first: 1, mood: 'Fresh and friendly',
      bgTop: '#2f6a41', bgBot: '#14341f', glow: '#7fe08a', floorA: '#a7d948', floorB: '#9bcf3f', frame: '#203a28', accent: '#46bd61', accent2: '#a3d849', pattern: 0,
      wall: ['#46624e', '#263c35', '#91b47a', '#78966a', '#314b3d', '#b7cf8a'], portal: PORTAL_KEYS.slice() },
    { id: 'desert', name: 'Desert', trail: 'DESERT TRAIL', first: 21, mood: 'Warm and sandy',
      bgTop: '#9a6430', bgBot: '#4b2f18', glow: '#ffcf7a', floorA: '#ecd29a', floorB: '#e0c386', frame: '#5b3b1c', accent: '#24a99d', accent2: '#f4b92f', pattern: 1,
      wall: ['#b9966a', '#5e4730', '#e3cda2', '#cfb084', '#7a5d3d', '#f0e2bd'],
      portal: ['#ffd47a', '#f4a93a', '#ffc65c', '#fff3c0', '#5a3a14', '#6b4414', '#c9651f'] },
    { id: 'ice', name: 'Ice', trail: 'ICE TRAIL', first: 41, mood: 'Cool and crisp',
      bgTop: '#2a7ba5', bgBot: '#0e3550', glow: '#9fe8ff', floorA: '#e4f4ff', floorB: '#d2eafa', frame: '#17405c', accent: '#36bde7', accent2: '#b9f3ff', pattern: 2,
      wall: ['#7fa9bf', '#3d6a80', '#d9f2ff', '#b9dcef', '#5d8ca3', '#eaf9ff'],
      portal: ['#b9fff0', '#7be9d0', '#9ef5e8', '#f0fffb', '#16415a', '#12405b', '#2a7fb0'] },
    { id: 'volcano', name: 'Volcano', trail: 'VOLCANO TRAIL', first: 61, mood: 'Hot and dangerous',
      bgTop: '#4a2d28', bgBot: '#1c1210', glow: '#ff9a52', floorA: '#54443f', floorB: '#493a36', frame: '#251a17', accent: '#ff7047', accent2: '#ffb347', pattern: 3,
      wall: ['#2f2825', '#161110', '#8a4a30', '#4a3f3b', '#7a3a25', '#ff9a52'],
      portal: ['#ff9a52', '#ff5a2a', '#ff7a3a', '#fff0d0', '#3a1a12', '#4a1f14', '#c2410c'] },
    { id: 'night', name: 'Night', trail: 'NIGHT TRAIL', first: 81, mood: 'Mysterious',
      bgTop: '#2f3870', bgBot: '#10132c', glow: '#a58cff', floorA: '#34407a', floorB: '#2d3869', frame: '#141838', accent: '#a58cff', accent2: '#f5f4ff', pattern: 4,
      wall: ['#3b4680', '#161a3a', '#8f9be0', '#566294', '#252c54', '#a58cff'],
      portal: ['#d9e0ff', '#a58cff', '#b3b9df', '#f5f4ff', '#161a3a', '#1c2150', '#566294'] }
  ];
  S.WALL_KEYS = WALL_KEYS; S.PORTAL_KEYS = PORTAL_KEYS;
  S.worldOf = (level) => S.WORLDS[Math.min(4, Math.max(0, Math.floor((level - 1) / 20)))];
  S.worldIndex = (level) => Math.min(4, Math.max(0, Math.floor((level - 1) / 20)));

  // UI colours shared by every screen (the cream card look of the design package)
  S.UI = {
    cream: '#fff6dc', cream2: '#fff8e8', creamEdge: '#d3bd82', creamShade: '#e6d6a8', ink: '#49351b', inkSoft: '#8a7447', inkFaint: '#b7a574',
    gold1: '#ffe879', gold2: '#f4b92f', goldEdge: '#a97725', goldDark: '#8c5a12',
    green: '#46bd61', greenDark: '#2d8a45', red: '#ef4444', redDark: '#b91c1c', locked: '#6b7480', lockedDark: '#303847',
    dark: '#07170e', dark2: '#102b1c', white: '#ffffff'
  };
})(window.SFR);
