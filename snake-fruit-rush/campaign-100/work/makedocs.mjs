import fs from 'fs';
const v = JSON.parse(fs.readFileSync('validation.json')), L = JSON.parse(fs.readFileSync('levels.json'));
const W = ['Garden', 'Desert', 'Ice', 'Volcano', 'Night'];
let md = '# Snake Fruit Rush - 100 level campaign\n\nGenerated and validated by `tools/` (see README). All numbers come from running the shipped levels through the rules engine that is embedded in the game.\n\n';
md += '| Level | World | Mechanics | Fruit | Turns | Shortest straight | Reaction time | Par moves | 3 stars | 2 stars | Walls | Bombs | Ice | Time |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
v.forEach((r, i) => { md += `| ${r.id} | ${W[L[i].w]} | ${r.mech} | ${r.fruits} | ${r.corners} | ${r.minSeg} | ${r.reactionMs} ms | ${r.par} | <=${L[i].s3} | <=${L[i].s2} | ${r.walls} | ${r.bombs} | ${r.ice} | ${r.secs}s |\n`; });
fs.writeFileSync('LEVELS.md', md);
const tot = (f) => v.reduce((a, r) => a + f(r), 0);
console.log('levels', v.length, 'errors', tot((r) => r.errors.length), 'avg par', Math.round(tot((r) => r.par) / v.length), 'min reaction ms', Math.min(...v.map((r) => r.reactionMs)));
