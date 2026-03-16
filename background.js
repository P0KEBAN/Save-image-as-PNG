import {
  FALLBACK_FILE_STEM,
  formatDateStamp,
  MENU_ID,
  MENU_TITLE,
  MESSAGE_TYPES,
  NOTIFICATION_ICON_PATH,
  OFFSCREEN_DOCUMENT_PATH,
  OFFSCREEN_JUSTIFICATION,
  OFFSCREEN_REASONS,
  SAVE_MODES
} from "./lib/constants.js";
import { ensureDefaultSettings, readSettings } from "./lib/settings.js";

let setupPromise = Promise.resolve();
let offscreenDocumentPromise = null;

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

  let source = null;
  let downloadStarted = false;

  try {
    const settings = await readSettings();
    source = await createDownloadSource(info, tab);
    const filename = buildFileName(source);

    await downloadFile({
      url: source.downloadUrl,
      filename,
      saveAs: settings.saveMode === SAVE_MODES.PROMPT
    });

    downloadStarted = true;
  } catch (error) {
    console.error("PNG save failed", error);
    await notifyFailure(error);
  } finally {
    if (!downloadStarted) {
      await cleanupDownloadSource(source, tab, info.frameId);
    }
  }
}

async function createDownloadSource(info, tab) {
  const pageSource = await tryCreatePageDownloadSource(info, tab);

  if (pageSource) {
    return pageSource;
  }

  return createOffscreenDownloadSource(info.srcUrl);
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

    return {
      ...payload,
      cleanupTarget: {
        kind: "page",
        tabId: tab.id,
        frameId: info.frameId
      }
    };
  } catch (error) {
    console.warn("Page-context conversion failed. Falling back to the extension context.", error);
    return null;
  }
}

async function createOffscreenDownloadSource(srcUrl) {
  await ensureOffscreenDocument();
  const payload = await sendRuntimeMessage({
    type: MESSAGE_TYPES.OFFSCREEN_CONVERT_TO_PNG,
    srcUrl
  });

  return {
    ...payload,
    cleanupTarget: {
      kind: "offscreen"
    }
  };
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (!offscreenDocumentPromise) {
    offscreenDocumentPromise = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [...OFFSCREEN_REASONS],
      justification: OFFSCREEN_JUSTIFICATION
    }).catch(async (error) => {
      if (await hasOffscreenDocument()) {
        return;
      }

      throw error;
    }).finally(() => {
      offscreenDocumentPromise = null;
    });
  }

  await offscreenDocumentPromise;
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });

    return contexts.length > 0;
  }

  const matchedClients = await clients.matchAll();
  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function cleanupDownloadSource(source, tab, frameId) {
  if (!source?.downloadUrl) {
    return;
  }

  try {
    if (source.cleanupTarget?.kind === "page" && tab?.id) {
      await chrome.scripting.executeScript({
        target: buildScriptTarget(tab.id, frameId),
        world: "MAIN",
        func: revokeObjectUrlInPage,
        args: [source.downloadUrl]
      });
      return;
    }

    if (source.cleanupTarget?.kind === "offscreen") {
      await ensureOffscreenDocument();
      await sendRuntimeMessage({
        type: MESSAGE_TYPES.OFFSCREEN_REVOKE_OBJECT_URL,
        downloadUrl: source.downloadUrl
      });
    }
  } catch (error) {
    console.warn("Could not clean up a temporary download URL.", error);
  }
}

function buildScriptTarget(tabId, frameId) {
  const target = { tabId };

  if (Number.isInteger(frameId) && frameId >= 0) {
    target.frameIds = [frameId];
  }

  return target;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "Extension message failed."));
        return;
      }

      resolve(response.payload || null);
    });
  });
}

async function notifyFailure(error) {
  try {
    await createNotification({
      type: "basic",
      iconUrl: NOTIFICATION_ICON_PATH,
      title: "PNGとして保存に失敗しました",
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
    return "画像を PNG として保存できませんでした。";
  }

  if (detail.includes("blob URL")) {
    return "この画像は現在のページ文脈でしか取得できず、保存できませんでした。";
  }

  if (detail.includes("Image fetch failed") || detail.includes("Failed to fetch")) {
    return "画像を取得できませんでした。ログイン状態やサイト側の制限を確認してください。";
  }

  if (
    detail.includes("create a 2D context") ||
    detail.includes("convert the canvas to PNG") ||
    detail.includes("createImageBitmap")
  ) {
    return "画像を PNG に変換できませんでした。";
  }

  return `画像を保存できませんでした: ${detail}`;
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

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not convert the canvas to PNG."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    const downloadUrl = URL.createObjectURL(pngBlob);
    scheduleObjectUrlCleanup(downloadUrl);

    return {
      downloadUrl,
      finalUrl: response.url || srcUrl,
      headerFileName: readHeaderFileNameValue(response.headers.get("content-disposition") || "")
    };
  } finally {
    imageBitmap.close();
  }
}

function revokeObjectUrlInPage(downloadUrl) {
  if (typeof downloadUrl === "string" && downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
  }
}

function scheduleObjectUrlCleanup(downloadUrl) {
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 120000);
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
