// The theme before the first paint (no flash of the wrong one): the choice from the last visit, else the system's.
// It's a plain external script, loaded blocking from <head>, because the CSP allows no inline scripts
// (script-src 'self', SPEC R3). src/theme/theme.tsx takes over once the app has loaded; keep the storage key and
// values in step with it (test/theme.test.ts checks).
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('bragdoc.theme') || 'system';
  } catch (e) {
    /* storage blocked: follow the system */
  }
  var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
