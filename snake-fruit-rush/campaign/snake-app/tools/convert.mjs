// raw (parsed from the design document) -> normalised level objects
import fs from 'fs';
const SPECIES_CODE = { A: 'apple', O: 'orange', C: 'cherry', G: 'grapes', S: 'strawberry', BF: 'bigfruit', GF: 'golden' };
export function convert(raw) {
  return raw.map((r) => {
    const lv = {
      id: r.id, world: r.world,
      board: { cols: 8, rows: 8, walls: r.walls, ice: r.ice },
      snake: r.snake,
      items: r.items, devices: r.devices,
      exit: r.exit, parMoves: r.parMoves, hardMoveLimit: r.hardMoveLimit,
      difficulty: r.difficulty, hint: r.hint
    };
    // star rules
    const t = r.threeText;
    const three = [];
    const par = r.parMoves;
    const mm = [...t.matchAll(/≤\s*(\d+)/g)].map((m) => +m[1]);
    let movesCap = par;
    if (mm.length) movesCap = Math.min(par, mm[mm.length - 1]);
    three.push({ type: 'movesAtMost', value: movesCap });
    let m;
    if ((m = t.match(/length (\d+)/))) three.push({ type: 'exactLength', value: +m[1] });
    if ((m = t.match(/collect (BF|GF|[AOCGS])\?/))) three.push({ type: 'collectOptional', species: SPECIES_CODE[m[1]] });
    if ((m = t.match(/skip (?:optional )?(BF|GF|[AOCGS])\??/))) three.push({ type: 'skipOptional', species: SPECIES_CODE[m[1]] });
    if (/both fruit objectives|both in order/.test(t) && !/skip/.test(t)) { /* order handled below */ }
    if (r.id === 4) three.push({ type: 'fruitOrder', value: [0, 1] });
    if (/switches? in order|both switches in order/.test(t)) three.push({ type: 'switchOrder', value: [0, 1] });
    else if (/activate both switches/.test(t)) three.push({ type: 'switchesAll' });
    lv.starRules = { one: { type: 'complete' }, two: { type: 'movesAtMost', value: par }, three: three };
    lv.threeText = t;
    // mechanics used (for tutorials / analytics)
    const mech = [];
    const req = r.items.filter((i) => i.type === 'fruit' && i.required !== false).length;
    if (r.walls.length) mech.push('wall');
    if (r.items.some((i) => i.type === 'fruit' && i.required === false)) mech.push('optional');
    if (r.items.some((i) => i.type === 'key')) mech.push('key');
    if (r.devices.some((d) => d.type === 'switch')) mech.push('switch');
    if (r.items.some((i) => i.type === 'bomb')) mech.push('bomb');
    if (r.ice.length) mech.push('ice');
    if (r.devices.some((d) => d.type === 'portal')) mech.push('portal');
    if (r.hardMoveLimit) mech.push('cap');
    lv.mechanics = mech;
    lv.requiredFruit = req;
    return lv;
  });
}
if (process.argv[1] && process.argv[1].endsWith('convert.mjs')) {
  const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  fs.writeFileSync(process.argv[3], JSON.stringify(convert(raw), null, 1));
}
