import { COLORS } from '../ui/theme.js';
import { T } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { LANGS, t, getLang, setLang } from '../data/i18n.js';
import { openUrl } from '../systems/Platform.js';
import { card, makeToggle } from './kit.js';

export const PRIVACY_URL = 'https://example.com/merge-kitchen/privacy'; // TODO: replace with your hosted policy before release
export const APP_VERSION = '1.0.0';

export const settingsScreen = {
  size: () => ({ title: t('settings.title'), w: 620, h: 900, ribbon: COLORS.smoke }),
  build(popup, scene, app) {
    const c = popup.content;
    const { state } = app;
    const rows = [['sound', 'settings.sound', '🔊'], ['music', 'settings.music', '🎵'], ['vibration', 'settings.vibration', '📳']];
    rows.forEach(([key, label, icon], i) => {
      const y = -300 + i * 100;
      c.add(card(scene, 0, y, 540, 86, COLORS.white, 26));
      c.add(T(scene, -240, y - 2, `${icon}  ${t(label)}`, 38, COLORS.ink, { ox: 0, stroke: false }));
      c.add(makeToggle(scene, 160, y - 2, state.data.settings[key], (v) => {
        state.setSetting(key, v);
        app.audio.play('click');
        if (key === 'vibration' && v) navigator.vibrate?.(30);
      }));
    });

    c.add(T(scene, -250, -12, `🌐  ${t('settings.language')}`, 38, COLORS.ink, { ox: 0, stroke: false }));
    LANGS.forEach((l, i) => {
      const active = getLang() === l.id;
      c.add(new Button(scene, -140 + i * 280, 66, { w: 260, h: 86, color: active ? COLORS.success : COLORS.smoke, label: l.label, fontSize: 36, onClick: () => {
        if (getLang() === l.id) return;
        state.setSetting('lang', l.id);
        setLang(l.id);
        app.ui.reloadUI('settings');
      } }));
    });

    c.add(new Button(scene, 0, 186, { w: 460, h: 90, color: COLORS.gem, icon: '🔒', label: t('settings.privacy'), fontSize: 38, onClick: () => openUrl(PRIVACY_URL) }));
    c.add(new Button(scene, 0, 294, { w: 460, h: 84, color: COLORS.secondary, label: t('settings.reset'), fontSize: 36, onClick: async () => {
      const data = { message: t('settings.resetAsk'), result: false };
      await app.ui.openPopup('confirm', data, true);
      if (data.result) app.ui.resetProgress();
    } }));
    c.add(T(scene, 0, 380, t('settings.version', { v: APP_VERSION }), 32, COLORS.smoke, { stroke: false }));
  },
};
