/* ============================================================
   backend.js — player profile + online leaderboard (Supabase REST).
   Works with NO backend too: the board then shows scores from this device.
   See supabase/schema.sql for the tables + row-level-security rules.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, D = G.Storage.data, C = window.ASCEND_CONFIG || {};
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const B = (G.Backend = {
    online: () => !!(C.supabaseUrl && C.supabaseAnonKey),
    ensureId() { if (!D.profile.id) { D.profile.id = uuid(); G.Storage.save(); } return D.profile.id; },
    async req(path, opts) {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(C.supabaseUrl + '/rest/v1/' + path, Object.assign({}, opts, { signal: ctl.signal, headers: Object.assign({ apikey: C.supabaseAnonKey, Authorization: 'Bearer ' + C.supabaseAnonKey, 'Content-Type': 'application/json' }, opts && opts.headers) }));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const t = await r.text(); return t ? JSON.parse(t) : null;
      } finally { clearTimeout(to); }
    },
    validName: n => /^[\p{L}\p{N} _.\-]{2,16}$/u.test((n || '').trim()),
    validEmail: e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim()),
    // email is only stored when the player ticked the consent box (so we can send game notifications)
    async register(name, email, consent) {
      const p = D.profile; p.name = name.trim(); p.email = consent ? email.trim() : ''; p.consent = !!consent; p.registered = true; B.ensureId(); G.Storage.save();
      if (B.online()) {
        try { await B.req('players?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: p.id, name: p.name, email: p.email || null, notify_consent: p.consent }) }); } catch (e) { return { ok: true, offline: true }; }
        B.flush();
      }
      return { ok: true, offline: !B.online() };
    },
    guest() { D.profile.registered = false; G.Storage.save(); },
    // record a finished run: always on the local board, uploaded when registered + online
    submit(mode, score, level) {
      score = Math.floor(score); if (score <= 0) return;
      D.board.push({ mode, score, level: level || 0, date: Date.now() });
      const top = {}; D.board.sort((a, b) => b.score - a.score); D.board = D.board.filter(e => (top[e.mode] = (top[e.mode] || 0) + 1) <= 20);
      if (D.profile.registered) { D.pending.push({ mode, score, level: level || 0 }); if (D.pending.length > 40) D.pending.shift(); }
      G.Storage.save(); B.flush();
    },
    async flush() {
      if (!B.online() || !D.profile.registered || !D.pending.length || B.flushing) return;
      B.flushing = true;
      try { while (D.pending.length) { const s = D.pending[0]; await B.req('scores', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ player_id: D.profile.id, mode: s.mode, score: s.score, level: s.level }) }); D.pending.shift(); G.Storage.save(); } } catch (e) {}
      B.flushing = false;
    },
    // -> {rows:[{name,score}], source:'online'|'device'}
    async top(mode, limit) {
      if (B.online()) {
        try { const rows = await B.req('leaderboard?mode=eq.' + mode + '&order=score.desc&limit=' + (limit || 50)); return { rows: rows.map(r => ({ name: r.name, score: r.score })), source: 'online' }; } catch (e) {}
      }
      return { rows: D.board.filter(e => e.mode === mode).slice(0, limit || 50).map(e => ({ name: D.profile.name || 'You', score: e.score })), source: 'device' };
    }
  });
})();
