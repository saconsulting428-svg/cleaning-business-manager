/* "Classic" look: the dark, clean feel of the original Snake Fruit Rush (navy board, yellow accent, flat panels)
 * applied on top of the campaign. Gameplay and level data are untouched; only colours change. Loaded after worlds.js. */
(function (S) {
  'use strict';
  Object.assign(S.UI, {
    cream: '#2a3157', cream2: '#343c6a', creamEdge: '#4a5490', creamShade: '#222850',
    ink: '#eef0ff', inkSoft: '#a4acd6', inkFaint: '#6c7499',
    gold1: '#ffe566', gold2: '#facc15', goldEdge: '#a16207', goldDark: '#854d0e', light: '#e8ecff'
  });
  const P = {   // [bgTop, bgBot, floorA, floorB, frame, wall palette]
    garden: ['#12301f', '#0a1812', '#1f3d2b', '#1a3424', '#2b4f38', ['#7ea77f', '#25392c', '#bfe2ad', '#9cc48f', '#47664f', '#dff0c6']],
    desert: ['#352718', '#1b130b', '#40311f', '#382a1a', '#5b4426', ['#c9a574', '#4f3820', '#ecd8b0', '#d9bc8a', '#7a5d3b', '#f4e8c8']],
    ice: ['#12303f', '#0a1822', '#1c3b4e', '#173246', '#2d5a73', ['#8fbad1', '#31576c', '#e2f6ff', '#c3e4f5', '#5f90aa', '#f0fbff']],
    volcano: ['#2d1714', '#150b0a', '#33241f', '#2b1e1a', '#4a2a22', ['#5a4540', '#1a1210', '#a95a38', '#6d5750', '#8a4328', '#ff9a52']],
    night: ['#181b3b', '#0a0c1f', '#222a55', '#1c2349', '#323d78', ['#4e5aa0', '#161a3a', '#a9b4f0', '#6d7bbd', '#2d3568', '#c1b2ff']]
  };
  S.WORLDS.forEach((w) => {
    const p = P[w.id];
    w.bgTop = p[0]; w.bgBot = p[1]; w.floorA = p[2]; w.floorB = p[3]; w.frame = p[4]; w.wall = p[5];
  });
})(window.SFR);
