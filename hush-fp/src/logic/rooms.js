/* Room templates: the name of a room on a level's route (Reception, Tank Gallery, Egg Gallery...) decides its kind (which sets its furniture, lamp colour, signs and tint) and its shape
   (a long hall, a small closet, a wide cavern), so the rooms of each level are the rooms the design document names, not generic boxes. */
export const MIX = {
  reception: ['sofa', 'counter', 'chair', 'cabinet'], office: ['desk', 'chair', 'computer', 'cabinet'], security: ['console', 'desk', 'computer', 'chair'], storage: ['shelf', 'crate', 'barrel', 'trolley'],
  archive: ['shelf', 'cabinet', 'shelf', 'crate'], canteen: ['table', 'chair', 'table', 'trolley'], hall: ['crate', 'trolley', 'chair', 'barrel'], lab: ['labbench', 'computer', 'cabinet', 'trolley'],
  specimen: ['specimen', 'specimen', 'labbench', 'trolley'], observation: ['console', 'sofa', 'computer', 'chair'], medical: ['bed', 'trolley', 'cabinet', 'bed'], pump: ['pump', 'pipe', 'tank', 'barrel'],
  generator: ['genprop', 'machine', 'pipe', 'barrel'], control: ['console', 'server', 'computer', 'desk'], cells: ['cage', 'bed', 'bones', 'crate'], hive: ['cocoon', 'pod', 'bones', 'cocoon'],
  nursery: ['pod', 'pod', 'cocoon', 'bones'], tunnel: ['pipe', 'crate', 'bones', 'barrel'], maintenance: ['machine', 'pipe', 'crate', 'trolley'], vault: ['column', 'crate', 'cabinet', 'shelf']
};
export const LAND = { reception: 'counter', office: 'desk', security: 'console', storage: 'shelf', archive: 'shelf', canteen: 'table', hall: 'trolley', lab: 'labbench', specimen: 'specimen', observation: 'console', medical: 'bed',
  pump: 'pump', generator: 'genprop', control: 'console', cells: 'cage', hive: 'cocoon', nursery: 'pod', tunnel: 'pipe', maintenance: 'machine', vault: 'column' };
const RULES = [
  [/egg|nurser|incubat|hatch/, 'nursery'], [/hive|nest|cavern|heartbeat|resonance|source|outer|shrine|core$/, 'hive'], [/cell|containment|isolation/, 'cells'],
  [/generator|fuse|reactor|cooling|cable|power|electrical|breaker|panel/, 'generator'], [/pump|valve|drain|flood|sluice|wet|bulkhead|decon/, 'pump'],
  [/specimen|tank|garden|botanical|sample/, 'specimen'], [/observation|window|perch|booth|glass/, 'observation'], [/medical|bay|cache/, 'medical'],
  [/lab|prep|echo|acoustic|sound|sonar|signal/, 'lab'], [/control|lift|probe|relay|radio|dispatch|station|camera|code|keypad|reader/, 'control'],
  [/security|guard|watch|patrol|niche|sentinel/, 'security'], [/archive|records|note/, 'archive'], [/canteen|staff|locker/, 'canteen'],
  [/corridor|passage|walkway|wing|gallery|spine|stair|bridge|catwalk|channel|ring|hall|junction|platform|shaft|tunnel|lock|crawl|vent|wall|hidden|ruins|collapsed|rust/, 'hall'],
  [/office|cubicle|supervisor|admin|antechamber|recording|keycard|key/, 'office'], [/reception|lobby|exit|gate|dawn|surface|door|locked/, 'reception'], [/storage|store|supply|janitor|cage|cabinet|loading|room/, 'storage']
];
/* the three chapters dress the same names differently: offices in the flooded section are laboratories, in the nest they are maintenance rooms */
const REMAP = [{}, { office: 'lab', reception: 'observation', canteen: 'medical', storage: 'pump', archive: 'specimen', security: 'observation', hall: 'pump' }, { reception: 'tunnel', office: 'maintenance', archive: 'cells', canteen: 'maintenance', storage: 'tunnel', security: 'maintenance', lab: 'generator', hall: 'tunnel', observation: 'hive', medical: 'nursery' }];
const SMALL = /closet|niche|alcove|booth|cabinet|cage|store$|stores?\b|locker|safe door|key room|keycard room|card door|code door|door$|reader|hidden|false wall|vent|side vent/;
const WIDE = /cavern|chamber|garden|reception|lobby|canteen|office wing|open office|reactor|core|gallery|lab$|hive|hall$/;
export function roomTemplate(name, ch, R) {
  const n = String(name || '').toLowerCase(); let kind = 'storage'; for (const [re, k] of RULES) if (re.test(n)) { kind = k; break; }
  const longHall = /corridor|passage|walkway|spine|stair|bridge|catwalk|channel|tunnel|junction|ring|platform|wing|crawl/.test(n);
  kind = REMAP[ch][kind] || kind;
  let w = [5, 7], h = [5, 6];
  if (longHall) { if (R() < 0.5) { w = [8, 9]; h = [5, 5]; } else { w = [5, 5]; h = [6, 7]; } kind = REMAP[ch].hall || 'hall'; if (ch === 0 && /service|maintenance|junction/.test(n)) kind = 'maintenance'; }
  else if (SMALL.test(n)) { w = [5, 5]; h = [5, 5]; } else if (WIDE.test(n)) { w = [7, 9]; h = [5, 7]; }
  return { kind, w, h };
}
