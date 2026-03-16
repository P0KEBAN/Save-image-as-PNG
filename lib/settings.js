import { DEFAULT_SETTINGS, SAVE_MODES } from "./constants.js";

export async function ensureDefaultSettings() {
  const storage = getStorageArea();
  const stored = await storage.get(["saveMode"]);
  const normalized = normalizeSettings(stored);

  if (!Object.prototype.hasOwnProperty.call(stored, "saveMode") || stored.saveMode !== normalized.saveMode) {
    await storage.set(normalized);
  }

  return normalized;
}

export async function readSettings() {
  const storage = getStorageArea();
  const stored = await storage.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function writeSaveMode(saveMode) {
  const storage = getStorageArea();
  const normalized = normalizeSettings({ saveMode });
  await storage.set(normalized);
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

function getStorageArea() {
  if (!chrome.storage?.local) {
    throw new Error("The storage API is unavailable.");
  }

  return chrome.storage.local;
}
