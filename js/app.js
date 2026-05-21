import { initUi } from './ui.js?v=20260522-f4';

initUi().catch((error) => {
	console.error('Studio manager failed to start', error);
});

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').catch((error) => {
			console.warn('Service worker registration failed', error);
		});
	});
}
