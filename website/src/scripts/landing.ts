// The landing page's one bit of behaviour: the light / system / dark switch in the nav (sun · monitor · moon, as in
// the app's header). public/theme-init.js applied the stored choice before the first paint; this keeps it in step,
// storing it under Starlight's key so the docs pages agree.
const KEY = 'starlight-theme';
type Choice = 'light' | 'auto' | 'dark';

const media = matchMedia('(prefers-color-scheme: light)');

function apply(choice: Choice) {
	const theme = choice === 'auto' ? (media.matches ? 'light' : 'dark') : choice;
	document.documentElement.dataset.theme = theme;
	document.documentElement.dataset.themeChoice = choice;
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')) b.setAttribute('aria-pressed', String(b.dataset.themeSet === choice));
}

function current(): Choice {
	const c = document.documentElement.dataset.themeChoice;
	return c === 'light' || c === 'dark' ? c : 'auto';
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')) {
	b.addEventListener('click', () => {
		const choice = b.dataset.themeSet as Choice;
		try {
			localStorage.setItem(KEY, choice === 'auto' ? '' : choice);
		} catch {}
		apply(choice);
	});
}
media.addEventListener('change', () => current() === 'auto' && apply('auto'));
apply(current());
