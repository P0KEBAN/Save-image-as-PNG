import {
  FALLBACK_FILE_STEM,
  formatDateStamp,
  MENU_ID,
  MENU_TITLE,
  SAVE_MODES
} from "./lib/constants.js";
import { ensureDefaultSettings, readSettings } from "./lib/settings.js";

let setupPromise = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => {
  queueSetup();
});

chrome.runtime.onStartup.addListener(() => {
  queueSetup();
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) {
    return;
  }

  void saveImageAsPng(info.srcUrl);
});

queueSetup();

function queueSetup() {
  setupPromise = setupPromise
    .then(async () => {
      await ensureDefaultSettings();
      await rebuildContextMenu();
    })
    .catch((error) => {
      console.error("Extension setup failed", error);
    });
}

async function rebuildContextMenu() {
  await removeAllContextMenus();
  await createContextMenu({
    id: MENU_ID,
    title: MENU_TITLE,
    contexts: ["image"]
  });
}

async function saveImageAsPng(srcUrl) {
  try {
    const settings = await readSettings();
    const source = await fetchSourceImage(srcUrl);
    const pngBlob = await convertBlobToPng(source.blob);
    const dataUrl = await blobToDataUrl(pngBlob);
    const filename = buildFileName(source);

    await downloadFile({
      url: dataUrl,
      filename,
      saveAs: settings.saveMode === SAVE_MODES.PROMPT
    });
  } catch (error) {
    console.error("PNG save failed", error);
  }
}

async function fetchSourceImage(srcUrl) {
  if (srcUrl.startsWith("blob:")) {
    throw new Error("blob URL is not supported in the MVP.");
  }

  const response = await fetch(srcUrl, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}.`);
  }

  return {
    blob: await response.blob(),
    finalUrl: response.url || srcUrl,
    headerFileName: readHeaderFileName(response.headers)
  };
}

async function convertBlobToPng(sourceBlob) {
  const imageBitmap = await createImageBitmap(sourceBlob);

  try {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create a 2D context.");
    }

    context.drawImage(imageBitmap, 0, 0);
    return canvas.convertToBlob({ type: "image/png" });
  } finally {
    imageBitmap.close();
  }
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return `data:${blob.type};base64,${btoa(binary)}`;
}

function buildFileName(source) {
  const stem = deriveFileStem(source);
  const stamp = formatDateStamp();
  return `${stem}_${stamp}.png`;
}

function deriveFileStem(source) {
  try {
    if (source.headerFileName) {
      const headerStem = sanitizeFileName(source.headerFileName.replace(/\.[^.]+$/, ""));

      if (headerStem) {
        return headerStem;
      }
    }

    if (source.finalUrl.startsWith("data:")) {
      return FALLBACK_FILE_STEM;
    }

    const url = new URL(source.finalUrl);
    const lastSegment = url.pathname.split("/").pop() || FALLBACK_FILE_STEM;
    const decoded = decodeURIComponent(lastSegment).replace(/\.[^.]+$/, "");
    const sanitized = sanitizeFileName(decoded);

    return sanitized || FALLBACK_FILE_STEM;
  } catch {
    return FALLBACK_FILE_STEM;
  }
}

function readHeaderFileName(headers) {
  const contentDisposition = headers.get("content-disposition");

  if (!contentDisposition) {
    return "";
  }

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim());
    } catch {
      return encodedMatch[1].trim();
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1]?.trim() || "";
}

function sanitizeFileName(name) {
  return name
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function removeAllContextMenus() {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      resolve();
    });
  });
}

function createContextMenu(options) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function downloadFile(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        ...options,
        conflictAction: "uniquify"
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(downloadId);
      }
    );
  });
}
