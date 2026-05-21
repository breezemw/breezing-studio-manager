import { ACCESS_CODE_HASH, ACCESS_STORAGE_KEY } from './config.js';

const encoder = new TextEncoder();

export function ensureStudioAccess(onAuthorized) {
  const accessScreen = document.querySelector('[data-access-screen]');
  const accessForm = document.querySelector('[data-access-form]');
  const accessInput = document.querySelector('[data-access-code]');
  const accessMessage = document.querySelector('[data-access-message]');

  const authorize = () => {
    document.body.classList.add('is-authorized');
    if (accessScreen) {
      accessScreen.hidden = true;
    }
    onAuthorized();
  };

  if (localStorage.getItem(ACCESS_STORAGE_KEY) === 'authorized') {
    authorize();
    return;
  }

  if (!accessForm || !accessInput) {
    authorize();
    return;
  }

  accessInput.focus();

  accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const codeHash = await hashCode(accessInput.value.trim());

    if (codeHash === ACCESS_CODE_HASH) {
      localStorage.setItem(ACCESS_STORAGE_KEY, 'authorized');
      authorize();
      return;
    }

    accessInput.value = '';
    accessInput.focus();
    if (accessMessage) {
      accessMessage.textContent = 'Access code not recognized.';
    }
  });
}

async function hashCode(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}