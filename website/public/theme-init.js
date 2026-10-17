// The landing page's theme, set before the first paint so it never flashes the wrong one (the app does the same with
// its own public/theme-init.js). It reads the key Starlight's docs pages use, `starlight-theme` ('light', 'dark', or
// '' / absent for "match the system"), so a reader's choice follows them between the landing page and the docs.
// An external file rather than an inline script, like the app's, so the page needs no inline script.
(function () {
	var stored = '';
	try {
		stored = localStorage.getItem('starlight-theme') || '';
	} catch (e) {}
	var theme = stored === 'light' || stored === 'dark' ? stored : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	document.documentElement.dataset.theme = theme;
	document.documentElement.dataset.themeChoice = stored === 'light' || stored === 'dark' ? stored : 'auto';
})();
