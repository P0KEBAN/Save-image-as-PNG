import {
  FALLBACK_FILE_STEM,
  formatDateStamp,
  MENU_ID,
  MENU_TITLE,
  NOTIFICATION_ICON_PATH,
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) {
    return;
  }

  void saveImageAsPng(info, tab);
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

async function saveImageAsPng(info, tab) {
  await setupPromise;

  try {
    const settings = await readSettings();
    const source = await createDownloadSource(info, tab);
    const filename = buildFileName(source);

    await downloadFile({
      url: source.downloadUrl,
      filename,
      saveAs: settings.saveMode === SAVE_MODES.PROMPT
    });
  } catch (error) {
    console.error("PNG save failed", error);
    await notifyFailure(error);
  }
}

async function createDownloadSource(info, tab) {
  if (info.srcUrl.startsWith("blob:")) {
    const pageSource = await tryCreatePageDownloadSource(info, tab);

    if (pageSource) {
      return pageSource;
    }

    throw new Error("blob URL is not available outside the page context.");
  }

  return createExtensionDownloadSource(info.srcUrl);
}

async function tryCreatePageDownloadSource(info, tab) {
  if (!tab?.id || !info.srcUrl) {
    return null;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: buildScriptTarget(tab.id, info.frameId),
      world: "MAIN",
      func: createPagePngDownloadSource,
      args: [info.srcUrl]
    });
    const payload = results[0]?.result;

    if (!payload?.downloadUrl) {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn("Page-context conversion failed.", error);
    return null;
  }
}

async function createExtensionDownloadSource(srcUrl) {
  const response = await fetch(srcUrl, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}.`);
  }

  const sourceBlob = await response.blob();
  const pngBlob = await convertBlobToPng(sourceBlob);
  const downloadUrl = await blobToDataUrl(pngBlob);

  return {
    downloadUrl,
    finalUrl: response.url || srcUrl,
    headerFileName: readHeaderFileNameValue(response.headers.get("content-disposition") || "")
  };
}

async function notifyFailure(error) {
  try {
    await createNotification({
      type: "basic",
      iconUrl: NOTIFICATION_ICON_PATH,
      title: chrome.i18n.getMessage("notifyFailureTitle"),
      message: toUserMessage(error)
    });
  } catch (notificationError) {
    console.error("Could not show a failure notification", notificationError);
  }
}

function createNotification(options) {
  return new Promise((resolve, reject) => {
    chrome.notifications.create(`save-image-as-png-${Date.now()}`, options, (notificationId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(notificationId);
    });
  });
}

function toUserMessage(error) {
  const detail = error instanceof Error ? error.message : String(error || "");

  if (!detail) {
    return chrome.i18n.getMessage("errorGeneric");
  }

  if (detail.includes("blob URL")) {
    return chrome.i18n.getMessage("errorBlob");
  }

  if (detail.includes("Image fetch failed") || detail.includes("Failed to fetch")) {
    return chrome.i18n.getMessage("errorFetch");
  }

  if (
    detail.includes("create a 2D context") ||
    detail.includes("convert the canvas to PNG") ||
    detail.includes("createImageBitmap")
  ) {
    return chrome.i18n.getMessage("errorConvert");
  }

  if (detail.includes("downloads API is unavailable")) {
    return chrome.i18n.getMessage("errorDownloadsApi");
  }

  return chrome.i18n.getMessage("errorSaveWithDetail", [detail]);
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

    if (source.finalUrl.startsWith("data:") || source.finalUrl.startsWith("blob:")) {
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
  if (!chrome.downloads?.download) {
    throw new Error("The downloads API is unavailable.");
  }

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

async function createPagePngDownloadSource(srcUrl) {
  if (!srcUrl) {
    throw new Error("Image URL is missing.");
  }

  const response = await fetch(srcUrl, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}.`);
  }

  const sourceBlob = await response.blob();
  const imageBitmap = await createImageBitmap(sourceBlob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create a 2D context.");
    }

    context.drawImage(imageBitmap, 0, 0);
    const downloadUrl = canvas.toDataURL("image/png");

    return {
      downloadUrl,
      finalUrl: srcUrl,
      headerFileName: ""
    };
  } finally {
    imageBitmap.close();
  }
}

function buildScriptTarget(tabId, frameId) {
  const target = { tabId };

  if (Number.isInteger(frameId) && frameId >= 0) {
    target.frameIds = [frameId];
  }

  return target;
}

function readHeaderFileNameValue(contentDisposition) {
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
