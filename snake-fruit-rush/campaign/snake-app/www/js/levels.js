/* Level registry. The 100 authored levels live in levels/world1..5.js (plain data, one object per level);
 * this file only indexes them, builds engine runtimes on demand and writes the on-screen texts. */
(function (S) {
  'use strict';
  const E = window.SFREngine;
  S.LEVELS = (window.SFR_LEVELS || []).slice().sort((a, b) => a.id - b.id);
  const rtCache = {};
  S.getLevel = (id) => S.LEVELS[S.clamp(id, 1, S.LEVELS.length) - 1];
  S.getRT = (id) => rtCache[id] || (rtCache[id] = E.makeRuntime(S.getLevel(id)));
  S.levelCount = () => S.LEVELS.length;

  const requiredCount = (lv) => lv.items.filter((i) => i.type === 'fruit' && i.required !== false).length;
  S.objectiveText = (lv) => {
    const req = requiredCount(lv), keys = lv.items.filter((i) => i.type === 'key').length;
    let s = '';
    if (keys) s += keys > 1 ? 'Grab the keys, ' : 'Grab the key, ';
    s += keys ? (req > 1 ? 'eat ' + req + ' fruit' : 'eat the fruit') : (req > 1 ? 'Eat ' + req + ' fruit' : 'Eat the fruit');
    s += ', then reach the exit';
    if (lv.hardMoveLimit) s += ' (max ' + lv.hardMoveLimit + ' moves)';
    return s;
  };
  const NAME = { bigfruit: 'big fruit', golden: 'golden apple' };
  const nm = (sp) => NAME[sp] || sp;
  // text for each star: [one, two, three, extras[]]
  S.starGoals = (lv) => {
    const sr = lv.starRules, three = sr.three, extras = [];
    let cap = sr.two.value;
    three.forEach((r) => {
      if (r.type === 'movesAtMost') cap = r.value;
      else if (r.type === 'exactLength') extras.push('Exit at length ' + r.value);
      else if (r.type === 'collectOptional') extras.push('Grab the bonus ' + nm(r.species));
      else if (r.type === 'skipOptional') extras.push('Skip the optional ' + nm(r.species));
      else if (r.type === 'fruitOrder') extras.push('Eat the fruit in order');
      else if (r.type === 'switchOrder') extras.push('Use the switches in order');
      else if (r.type === 'switchesAll') extras.push('Use every switch');
    });
    return { one: 'Escape with all fruit', two: 'Finish within ' + sr.two.value + ' moves', three: 'Perfect route: ' + cap + ' moves' + (extras.length ? '' : ' or fewer'), extras: extras };
  };
  // the first level that uses each mechanic gets a short tutorial
  const ORDER = ['wall', 'optional', 'cap', 'key', 'switch', 'bomb', 'ice', 'portal'];
  S.mechIntro = { 1: 'basic' };
  ORDER.forEach((m) => { const lv = S.LEVELS.find((l) => l.mechanics.indexOf(m) >= 0); if (lv) S.mechIntro[lv.id] = m; });
  S.mechForLevel = (id) => S.mechIntro[id] || null;
  S.firstLevelOfWorld = (w) => w * 20 + 1;
})(window.SFR);
