export const SAVE_MODES = Object.freeze({
  INSTANT: "instant",
  PROMPT: "prompt"
});

export const DEFAULT_SETTINGS = Object.freeze({
  saveMode: SAVE_MODES.INSTANT
});

export const MENU_ID = "save-image-as-png";
export const MENU_TITLE = "PNGとして保存";
export const FALLBACK_FILE_STEM = "image";
export const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
export const OFFSCREEN_REASONS = Object.freeze(["BLOBS"]);
export const OFFSCREEN_JUSTIFICATION = "Convert images to PNG and create temporary blob URLs for downloads.";
export const NOTIFICATION_ICON_PATH = "icons/icon_128.png";

export const MESSAGE_TYPES = Object.freeze({
  OFFSCREEN_CONVERT_TO_PNG: "offscreen-convert-to-png",
  OFFSCREEN_REVOKE_OBJECT_URL: "offscreen-revoke-object-url"
});

export const MODE_OPTIONS = Object.freeze([
  {
    value: SAVE_MODES.INSTANT,
    title: "ダウンロードフォルダに即保存",
    description: "確認なしでそのまま保存します。"
  },
  {
    value: SAVE_MODES.PROMPT,
    title: "保存先を選ぶ",
    description: "保存ダイアログを開いて保存先を選びます。"
  }
]);

export function formatDateStamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
