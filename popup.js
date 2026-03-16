import { SAVE_MODES } from "./lib/constants.js";
import { readSettings, writeSaveMode } from "./lib/settings.js";

const form = document.querySelector("#mode-form");
const radios = Array.from(form.elements.saveMode);

void initializePopup();

form.addEventListener("change", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.name !== "saveMode") {
    return;
  }

  try {
    await writeSaveMode(target.value);
  } catch (error) {
    console.error("Could not update the save mode", error);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.saveMode?.newValue) {
    return;
  }

  const nextMode = changes.saveMode.newValue;
  syncSelection(nextMode);
});

async function initializePopup() {
  try {
    const settings = await readSettings();
    syncSelection(settings.saveMode);
  } catch (error) {
    console.error("Could not read settings", error);
    syncSelection(SAVE_MODES.INSTANT);
  }
}

function syncSelection(saveMode) {
  for (const radio of radios) {
    radio.checked = radio.value === saveMode;
  }
}
