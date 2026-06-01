export const SAVE_MODES = Object.freeze({
  INSTANT: "instant",
  PROMPT: "prompt"
});

export const DEFAULT_SETTINGS = Object.freeze({
  saveMode: SAVE_MODES.INSTANT
});

export const MENU_ID = "save-image-as-png";
export const MENU_TITLE = chrome.i18n.getMessage("menuTitle");
export const FALLBACK_FILE_STEM = "image";
export const NOTIFICATION_ICON_PATH = "icons/icon_128.png";

export const MODE_OPTIONS = Object.freeze([
  {
    value: SAVE_MODES.INSTANT,
    title: chrome.i18n.getMessage("modeInstantTitle"),
    description: chrome.i18n.getMessage("modeInstantDescription")
  },
  {
    value: SAVE_MODES.PROMPT,
    title: chrome.i18n.getMessage("modePromptTitle"),
    description: chrome.i18n.getMessage("modePromptDescription")
  }
]);

export function formatDateStamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
