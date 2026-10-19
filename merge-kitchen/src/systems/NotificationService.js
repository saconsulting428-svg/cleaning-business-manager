// Local notification stubs. In the Android build install @capacitor/local-notifications;
// this service already calls it when present, and just logs in the browser.
import { t } from '../data/i18n.js';
import { ENERGY_MAX } from './EnergySystem.js';

const IDS = { energy: 101, rush: 102, chest: 103, burning: 104, daily: 105 };

export class NotificationService {
  constructor(state, energy, events, chest) {
    this.state = state;
    this.energy = energy;
    this.events = events;
    this.chest = chest;
    this.log = []; // what would have been scheduled (handy in browser tests)
  }

  get plugin() { return globalThis.Capacitor?.Plugins?.LocalNotifications ?? null; }

  async requestPermission() {
    try { const r = await this.plugin?.requestPermissions?.(); return r?.display === 'granted'; } catch { return false; }
  }

  async schedule(key, title, body, at) {
    if (at <= Date.now() + 1000) return;
    this.log.push({ key, title, body, at });
    try {
      await this.plugin?.schedule?.({ notifications: [{ id: IDS[key], title, body, schedule: { at: new Date(at) }, smallIcon: 'ic_stat_icon' }] });
    } catch (e) { console.debug('[notif] schedule failed', e); }
  }

  async cancelAll() {
    this.log = [];
    try { await this.plugin?.cancel?.({ notifications: Object.values(IDS).map((id) => ({ id })) }); } catch { /* ignore */ }
  }

  /** Call when the app goes to the background */
  async scheduleAll(now = Date.now()) {
    if (!this.state.data.tutorial.done) return;
    await this.cancelAll();
    const title = t('app.title');
    if (this.energy.value < ENERGY_MAX) await this.schedule('energy', title, t('notif.energy'), now + this.energy.msToFull(now));
    const next = this.events.next(now);
    await this.schedule('rush', title, t('notif.rush', { name: t(next.nameKey) }), next.startsAt);
    await this.schedule('chest', title, t('notif.chest'), now + this.chest.msLeft(now));
    await this.schedule('burning', title, t('notif.burning'), now + 3 * 60 * 60 * 1000);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
    await this.schedule('daily', title, t('notif.daily'), tomorrow.getTime());
  }
}
