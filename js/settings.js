export const SETTINGS_STORAGE_KEY = 'breezing-studio-manager-settings';

export const AUTOSAVE_INTERVAL_MINUTES = [5, 10, 15, 20];
export const RECOVERY_HISTORY_LIMITS = [12, 20, 30];

export const DEFAULT_SETTINGS = {
  autosaveEnabled: true,
  autosaveIntervalMinutes: 5,
  saveRecoveryVersions: true,
  historyLimit: 20,
  restoreDraftOnStartup: true,
};

export function normalizeSettings(settings = {}) {
  const interval = clampNumber(settings.autosaveIntervalMinutes, 5, 20, DEFAULT_SETTINGS.autosaveIntervalMinutes);
  const historyLimit = closestAllowedNumber(settings.historyLimit, RECOVERY_HISTORY_LIMITS, DEFAULT_SETTINGS.historyLimit);

  return {
    autosaveEnabled: settings.autosaveEnabled !== false,
    autosaveIntervalMinutes: closestAllowedNumber(interval, AUTOSAVE_INTERVAL_MINUTES, DEFAULT_SETTINGS.autosaveIntervalMinutes),
    saveRecoveryVersions: settings.saveRecoveryVersions !== false,
    historyLimit,
    restoreDraftOnStartup: settings.restoreDraftOnStartup !== false,
  };
}

export function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null');
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...(stored || {}) });
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetSettings() {
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}

export function getAutosaveIntervalMs(settings) {
  return normalizeSettings(settings).autosaveIntervalMinutes * 60 * 1000;
}

export function getSettingsSummary(settings) {
  const normalized = normalizeSettings(settings);
  if (!normalized.autosaveEnabled) {
    return 'Auto-save is off. Manual recovery versions are still available.';
  }
  const snapshots = normalized.saveRecoveryVersions ? `${normalized.historyLimit} recovery sessions kept` : 'latest draft only';
  return `Auto-save every ${normalized.autosaveIntervalMinutes} minutes when changes exist; ${snapshots}.`;
}

function clampNumber(value, min, max, fallback) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numberValue));
}

function closestAllowedNumber(value, allowedValues, fallback) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return allowedValues.reduce((closest, candidate) => {
    const currentDistance = Math.abs(candidate - numberValue);
    const closestDistance = Math.abs(closest - numberValue);
    return currentDistance < closestDistance ? candidate : closest;
  }, allowedValues.includes(fallback) ? fallback : allowedValues[0]);
}