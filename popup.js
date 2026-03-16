import { MODE_OPTIONS, SAVE_MODES } from "./lib/constants.js";
import { readSettings, writeSaveMode } from "./lib/settings.js";

const form = document.querySelector("#mode-form");
const radios = Array.from(form.elements.saveMode);
const statusText = document.querySelector("#status-text");

let statusTimerId = 0;

void initializePopup();

form.addEventListener("change", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.name !== "saveMode") {
    return;
  }

  try {
    await writeSaveMode(target.value);
    renderStatus(target.value, "保存モードを更新しました。");
  } catch (error) {
    console.error("Could not update the save mode", error);
    renderStatus(getSelectedMode(), "保存モードを更新できませんでした。");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.saveMode?.newValue) {
    return;
  }

  const nextMode = changes.saveMode.newValue;
  syncSelection(nextMode);
  renderStatus(nextMode);
});

async function initializePopup() {
  try {
    const settings = await readSettings();
    syncSelection(settings.saveMode);
    renderStatus(settings.saveMode);
  } catch (error) {
    console.error("Could not read settings", error);
    syncSelection(SAVE_MODES.INSTANT);
    renderStatus(SAVE_MODES.INSTANT, "設定の読み込みに失敗しました。");
  }
}

function syncSelection(saveMode) {
  for (const radio of radios) {
    radio.checked = radio.value === saveMode;
  }
}

function renderStatus(saveMode, flashMessage = "") {
  window.clearTimeout(statusTimerId);

  if (flashMessage) {
    statusText.textContent = flashMessage;
    statusTimerId = window.setTimeout(() => {
      statusText.textContent = getModeSummary(saveMode);
    }, 1200);
    return;
  }

  statusText.textContent = getModeSummary(saveMode);
}

function getModeSummary(saveMode) {
  const option = MODE_OPTIONS.find((candidate) => candidate.value === saveMode);

  if (!option) {
    return "保存モードを選んでください。";
  }

  if (saveMode === SAVE_MODES.INSTANT) {
    return `現在: ${option.title}`;
  }

  return `現在: ${option.title}`;
}

function getSelectedMode() {
  const selected = radios.find((radio) => radio.checked);
  return selected?.value || SAVE_MODES.INSTANT;
}
