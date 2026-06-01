<div align="center">

<img src="icons/icon_128.png" alt="Save image as PNG" width="96" height="96">

# Save image as PNG

**Right-click any image in Chrome → Convert and save it as PNG**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](manifest.json)

English | **[日本語はこちら](README.ja.md)**

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

## 🚀 Installation

1. Clone or download this repository

   ```bash
   git clone https://github.com/P0KEBAN/save-image-as-png.git
   ```

2. Open [`chrome://extensions`](chrome://extensions) in Chrome

3. Enable **Developer mode** (top-right toggle)

4. Click **"Load unpacked"**

5. Select the cloned folder

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
├── 📁 icons/              # Extension icons (16/32/48/128px)
├── 📁 lib/                # Libraries
└── 📁 docs/               # Documentation & screenshots
```

## ⚠️ Notes

> [!NOTE]
> This extension uses the `<all_urls>` host permission to fetch image URLs from any website.

> [!WARNING]
> The following cases are currently unsupported:
> - `blob:` URL images
> - CSS background images (`background-image`)

## 🛠️ Tech Stack

- **Chrome Extensions Manifest V3**
- **Service Worker**-based background processing
- **Canvas API** for image-to-PNG conversion
- **Chrome Downloads API** for file saving
- **Chrome Storage API** for settings management

## 📄 License

MIT License © 2025 P0KEBAN
