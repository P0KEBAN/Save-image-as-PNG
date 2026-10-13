<div align="center">

<img src="icons/icon_128.png" alt="Save image as PNG" width="96" height="96">

# Save image as PNG

**Right-click any image in Chrome → Convert and save it as PNG**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](manifest.json)

**[日本語](README.md)** | English

---

<img src="docs/screenshot.png" alt="Context menu screenshot" width="400">

*▲ Right-click on an image to see the "Save as PNG" option*

</div>

## ✨ Features

| Feature | Description |
|:---|:---|
| 🖼️ PNG Conversion | Convert and download any right-clicked image as PNG |
| 🎯 Context Menu | "Save as PNG" appears only on image right-click |
| ⚡ Instant Save | Save directly to downloads folder without prompts |
| 📂 Save As | Choose a destination each time via save dialog |
| 💾 Persistent Settings | Save mode preference stored in `chrome.storage.local` |
| 🔢 Auto-numbering | Duplicate filenames are auto-renamed via Chrome's `uniquify` |
| 🔔 Failure Notification | Shows a notification with the reason when a save fails |
| 🌐 English / Japanese | Follows Chrome's display language |

## 🚀 Installation

1. Download `save-image-as-png-vX.X.X.zip` from the [latest release](https://github.com/P0KEBAN/Save-image-as-PNG/releases/latest) and unzip it

2. Open [`chrome://extensions`](chrome://extensions) in Chrome

3. Enable **Developer mode** (top-right toggle)

4. Click **"Load unpacked"**

5. Select the unzipped `save-image-as-png` folder (the one containing `manifest.json`)

> [!TIP]
> The extension stops working if you move or delete the loaded folder. Put the unzipped folder somewhere permanent before loading it.

<details>
<summary>For developers: clone the repository</summary>

```bash
git clone https://github.com/P0KEBAN/Save-image-as-PNG.git
```

After steps 2–4, select the cloned folder.

</details>

## 📖 Usage

### Saving an image

1. **Right-click** on any image on a web page
2. Select **"Save as PNG"** from the context menu
3. The image is converted to PNG and saved 🎉

### Switching save modes

Click the extension icon to open the popup and toggle between two modes:

> | Mode | Behavior |
> |:---|:---|
> | **⚡ Instant Save** | Save directly to downloads folder |
> | **📂 Save As** | Choose destination via file dialog each time |

## 🏗️ Project Structure

```
📦 save-image-as-png
├── 📄 manifest.json      # Extension manifest (Manifest V3)
├── 📄 background.js      # Service Worker / core logic
├── 📄 popup.html          # Popup UI
├── 📄 popup.css           # Popup styles
├── 📄 popup.js            # Popup logic
├── 📁 lib/                # Constants and settings storage
├── 📁 _locales/           # UI strings (en / ja)
├── 📁 icons/              # Extension icons (16/32/48/128px)
└── 📁 docs/               # Screenshots
```

## ⚠️ Notes

### Permissions

| Permission | Purpose |
|:---|:---|
| `contextMenus` | Add "Save as PNG" to the image right-click menu |
| `downloads` | Save the converted PNG |
| `storage` | Keep the save mode setting |
| `notifications` | Notify when a save fails |
| `scripting` | Convert `blob:` URL images to PNG inside the page |
| `<all_urls>` (host permission) | Fetch images from any website |

> [!NOTE]
> The only network request is fetching the image you right-clicked. No images or browsing data are sent to external servers, and there is no analytics or tracking.

### Images that cannot or may not be saved

> [!WARNING]
> - CSS background images (`background-image`) are not supported. The context menu does not appear on them.
> - `blob:` URL images are converted inside the page when possible, but saving fails on some sites.
> - Images that require login or are restricted by the site may fail to save.

## 🛠️ Tech Stack

- **Chrome Extensions Manifest V3**
- **Service Worker**-based background processing
- **Canvas API** for image-to-PNG conversion
- **Chrome Downloads API** for file saving
- **Chrome Storage API** for settings management
- **Chrome Scripting API** for in-page conversion of `blob:` images
- **Chrome i18n API** for English / Japanese localization

## 📄 License

MIT License © 2026 P0KEBAN
