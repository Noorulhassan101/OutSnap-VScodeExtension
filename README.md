# OutSnap 📸

### Automatic Terminal Screenshot Capture — On *Your* Terms

**OutSnap** is a free and open-source Visual Studio Code extension that automatically captures screenshots of your integrated terminal whenever a command completes successfully (`exit code 0`).

Built for developers, students, technical writers, educators, and content creators who want a seamless way to document terminal workflows, create tutorials, generate progress reports, or maintain a visual command history — without interrupting their workflow.

---

## ✨ Why OutSnap?

Writing documentation while coding is tedious.
Taking screenshots manually is worse.

OutSnap automates the entire process.

Run commands normally in the VS Code terminal, and OutSnap quietly captures clean screenshots only when commands succeed — helping you build visual documentation effortlessly.

---

## 🚀 Features

### 📸 Automatic Terminal Capture

Automatically captures a screenshot the moment a terminal command completes successfully.

* ✅ Captures only successful commands (`exit code 0`)
* ❌ Ignores failed commands and errors
* ⚡ Works silently in the background

---

### 🧠 Smart Terminal Cropping

OutSnap intelligently crops screenshots to focus only on the terminal area.

* Default crop: bottom **45%** of the VS Code window
* Keeps screenshots clean and tutorial-ready
* Adjustable anytime from the status bar

---

### 🎛️ Zero-Config Experience

No setup required.

Simply click:

```text
OutSnap: OFF
```

in the VS Code status bar to enable capturing.

---

### 📄 Word Document Export

Generate professional reports instantly.

Export:

* Screenshots
* Terminal command history
* Session timeline

into a single `.docx` document with one command.

Perfect for:

* Lab reports
* Assignments
* Tutorials
* Dev logs
* Progress documentation

---

### 🔒 Privacy First

Your data never leaves your machine.

* No telemetry
* No cloud uploads
* No tracking
* No backend servers

Everything is stored locally on your device.

---

### ⚙️ Highly Customizable

Fine-tune OutSnap to match your workflow.

Customize:

* Output folders
* Capture delays
* Ignored commands
* Crop size
* Session behavior
* Confirmation prompts

---

# 📦 Installation

Install directly from the VS Code Marketplace.

1. Open **Extensions** (`Ctrl + Shift + X`)
2. Search for:

```text
OutSnap
```

3. Click **Install**
4. Enable it from the status bar

---

# 💡 How It Works

## 1️⃣ Enable OutSnap

Click the status bar button:

```text
OutSnap: OFF
```

It will switch to:

```text
OutSnap: ON
```

---

## 2️⃣ Run Commands Normally

Example:

```bash
npm install
```

or

```bash
python app.py
```

---

## 3️⃣ Automatic Screenshot Capture

After the command completes successfully:

```text
📸 Saved: screenshot_001.png
```

You can:

* 👀 View the screenshot
* ↩️ Undo and delete it instantly

---

## 4️⃣ Export Your Session

Open the Command Palette:

```text
Ctrl + Shift + P
```

Run:

```text
OutSnap: Export to Word Document
```

A professional `.docx` report is generated automatically.

---

# ⚙️ Extension Settings

OutSnap provides the following configurable settings:

| Setting                           | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `termsnap.enabled`                | Master ON/OFF toggle                              |
| `termsnap.sessionOnly`            | Automatically reset to OFF when VS Code closes    |
| `termsnap.outputPath`             | Output folder for screenshots                     |
| `termsnap.renderDelay`            | Delay before capture (ms)                         |
| `termsnap.confirmBeforeCapture`   | Ask before saving screenshots                     |
| `termsnap.excludeCommands`        | Ignore specific commands like `ls`, `cd`, `clear` |
| `termsnap.cropToTerminal`         | Enable smart terminal cropping                    |
| `termsnap.terminalCropPercentage` | Adjust crop percentage (default: `45%`)           |

---

# 🖼️ Default Output Location

```text
~/Desktop/OutSnap/
```

All screenshots and exported documents are stored locally here by default.

---

# 🛠️ Known Limitations

* Requires **VS Code Shell Integration API** (`v1.93+`) in **Rich Mode**
* Captures the active VS Code window region
* Custom VS Code layouts may require crop percentage adjustments

---

# 🎯 Perfect For

✅ Developers
✅ Students
✅ Technical Writers
✅ Educators
✅ Tutorial Creators
✅ DevOps Engineers
✅ Lab Reports
✅ Documentation Workflows

---

# 📝 Release Notes

## v1.0.0 — Initial Release

### Included Features

* Status bar toggle UI
* Adjustable crop controls
* Automatic screenshot capture
* Smart terminal cropping
* Word document exporter
* Configurable extension settings
* Local-only storage

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

Feel free to open a pull request or create an issue on GitHub.

---

# ⭐ Support the Project

If you find OutSnap useful:

* ⭐ Star the repository
* 🐛 Report issues
* 💡 Suggest new features
* 📢 Share it with others

---

# 📜 License

This project is licensed under the MIT License.

---

## 🔗 GitHub

View the project on GitHub and contribute to the development of OutSnap.

