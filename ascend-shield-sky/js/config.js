/* ============================================================
   config.js — fill these in when you create your backend / store.
   Nothing here is secret: the Supabase *anon* key is meant to be public
   (security comes from the Row Level Security rules in supabase/schema.sql).
   ============================================================ */
window.ASCEND_CONFIG = Object.assign({
  supabaseUrl: '',          // e.g. 'https://xxxx.supabase.co'   (empty = leaderboard works on this device only)
  supabaseAnonKey: '',      // project settings > API > anon public key
  privacyUrl: '',           // REQUIRED by Google Play + GDPR before you collect emails (link to your privacy policy)
  demoPurchases: true       // true = web demo "purchases" (NO real money). Set false for the store build.
}, window.ASCEND_CONFIG || {});   // a host page may pre-define window.ASCEND_CONFIG
