import { MESSAGE_TYPES } from "./lib/constants.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.OFFSCREEN_CONVERT_TO_PNG) {
    void handleConvertToPng(message)
      .then((payload) => {
        sendResponse({ ok: true, payload });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return true;
  }

  if (message?.type === MESSAGE_TYPES.OFFSCREEN_REVOKE_OBJECT_URL) {
    if (typeof message.downloadUrl === "string" && message.downloadUrl) {
      URL.revokeObjectURL(message.downloadUrl);
    }

    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function handleConvertToPng(message) {
  const srcUrl = String(message.srcUrl || "");

  if (!srcUrl) {
    throw new Error("Image URL is missing.");
  }

  if (srcUrl.startsWith("blob:")) {
    throw new Error("blob URL is not available outside the page context.");
  }

  const response = await fetch(srcUrl, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}.`);
  }

  const sourceBlob = await response.blob();
  const pngBlob = await convertBlobToPng(sourceBlob);
  const downloadUrl = URL.createObjectURL(pngBlob);
  scheduleObjectUrlCleanup(downloadUrl);

  return {
    downloadUrl,
    finalUrl: response.url || srcUrl,
    headerFileName: readHeaderFileName(response.headers)
  };
}

async function convertBlobToPng(sourceBlob) {
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

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not convert the canvas to PNG."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });
  } finally {
    imageBitmap.close();
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

function scheduleObjectUrlCleanup(downloadUrl) {
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 120000);
}
