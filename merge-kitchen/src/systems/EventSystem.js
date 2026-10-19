// Real-time events: Lunch Rush (12:00-14:00) and Dinner Rush (19:00-21:00), local time.
// Both give 2x coins. For testing add ?rush=lunch to the URL.
export const RUSH_SCHEDULE = [
  { id: 'lunch', from: 12, to: 14, nameKey: 'rush.lunch', icon: '🍛', mult: 2 },
  { id: 'dinner', from: 19, to: 21, nameKey: 'rush.dinner', icon: '🍝', mult: 2 },
];

const at = (now, hour) => { const d = new Date(now); d.setHours(hour, 0, 0, 0); return d.getTime(); };

export class EventSystem {
  constructor(state) {
    this.state = state;
    this.activeId = null;
    let forced = null;
    try { forced = new URLSearchParams(globalThis.location?.search).get('rush'); } catch { /* ignore */ }
    this.forced = RUSH_SCHEDULE.find((e) => e.id === forced) ?? null;
    this.forcedEnd = Date.now() + 2 * 60 * 60 * 1000;
  }

  /** Currently running event -> { ...def, startsAt, endsAt } or null */
  active(now = Date.now()) {
    if (this.forced) return { ...this.forced, startsAt: now - 60000, endsAt: this.forcedEnd };
    for (const e of RUSH_SCHEDULE) {
      const s = at(now, e.from), f = at(now, e.to);
      if (now >= s && now < f) return { ...e, startsAt: s, endsAt: f };
    }
    return null;
  }

  /** Next upcoming event (today, or tomorrow's lunch) */
  next(now = Date.now()) {
    for (const e of RUSH_SCHEDULE) {
      const s = at(now, e.from);
      if (s > now) return { ...e, startsAt: s, endsAt: at(now, e.to) };
    }
    const e = RUSH_SCHEDULE[0];
    return { ...e, startsAt: at(now, e.from) + 86400000, endsAt: at(now, e.to) + 86400000 };
  }

  mult(now = Date.now()) { return this.active(now)?.mult ?? 1; }

  /** Call once a second: emits event:start / event:end on transitions */
  update(now = Date.now()) {
    const a = this.active(now);
    const id = a?.id ?? null;
    if (id !== this.activeId) {
      const prev = this.activeId;
      this.activeId = id;
      if (prev) this.state.bus.emit('event:end', prev);
      if (id) this.state.bus.emit('event:start', a);
    }
    return a;
  }
}
