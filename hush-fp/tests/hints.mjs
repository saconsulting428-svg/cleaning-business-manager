/* stuck hints: logic part (Node) */
import { World } from '../src/logic/world.js';
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { stuckHint } from '../src/ui/stuck.js';
let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; if (!c) console.log('FAIL ' + n + (d ? '  ' + d : '')); };
for (let i = 0; i < LEVELS.length; i++) {
  const w = new World(generate(LEVELS[i]), {}); w.creatures.forEach(c => { c.x = 1; c.y = 1; });
  const h1 = stuckHint(w, 1), h2 = stuckHint(w, 2), h3 = stuckHint(w, 3);
  t('L' + (i + 1) + ' level-1 hint names the goal and the map', h1.text.length > 30 && /MAP/.test(h1.text), h1.text);
  t('L' + (i + 1) + ' level-2 hint adds distance and direction', /steps away/.test(h2.text) || !w.objectiveTargets().length, h2.text);
  t('L' + (i + 1) + ' level-3 hint lights the markers', h3.ping === true && h3.targets.length > 0, JSON.stringify(h3.targets));
}
{ // context: next to a locked door / a creature on the hunt / a collapsed passage
  const idx = LEVELS.findIndex(l => l.gates.includes('key') && l.creatures.length); const w = new World(generate(LEVELS[idx]), {}); w.creatures.forEach(c => { c.x = 1; c.y = 1; }); const d = w.doors.find(x => x.locked); w.player.x = d.x + 0.5 + 1.2; w.player.y = d.y + 0.5; t('next to a locked door the hint says what it needs', /locked|keypad/.test(stuckHint(w, 1).text), stuckHint(w, 1).text);
  w.creatures[0].state = 'hunt'; t('when hunted the hint is about escaping', /hunting you/.test(stuckHint(w, 1).text)); }
{ const idx = 20, w = new World(generate(LEVELS[idx]), {}); w.creatures.forEach(c => { c.x = 1; c.y = 1; c.state = 'roam'; }); const col = w.objs.find(o => o.type === 'prop' && o.kind === 'collapse'); if (col) { w.player.x = col.x + 0.5 + 1.5; w.player.y = col.y + 0.5; t('next to a collapse the hint says to take another way', /collapsed/.test(stuckHint(w, 1).text), stuckHint(w, 1).text); } else t('collapse test level has none (skipped)', true); }
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
