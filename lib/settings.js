import { DEFAULT_SETTINGS, SAVE_MODES } from "./constants.js";

export async function ensureDefaultSettings() {
  const stored = await chrome.storage.local.get(["saveMode"]);
  const normalized = normalizeSettings(stored);

  if (!Object.prototype.hasOwnProperty.call(stored, "saveMode") || stored.saveMode !== normalized.saveMode) {
    await chrome.storage.local.set(normalized);
  }

  return normalized;
}

export async function readSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function writeSaveMode(saveMode) {
  const normalized = normalizeSettings({ saveMode });
  await chrome.storage.local.set(normalized);
  return normalized;
}

function normalizeSettings(partialSettings) {
  const saveMode = Object.values(SAVE_MODES).includes(partialSettings.saveMode)
    ? partialSettings.saveMode
    : DEFAULT_SETTINGS.saveMode;

  return {
    ...DEFAULT_SETTINGS,
    ...partialSettings,
    saveMode
  };
}
