import { initUi } from './ui.js?v=40acf6c';

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
