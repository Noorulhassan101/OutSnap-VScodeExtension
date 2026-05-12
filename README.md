OutSnap
Automatic Terminal Screenshot Capture — On Your Terms

OutSnap is a free, open-source Visual Studio Code extension that automatically captures screenshots of your integrated terminal whenever a command completes successfully (exit code 0).

Designed for developers, students, content creators, and technical writers who need a frictionless way to document terminal workflows, build tutorials, track command history visually, or produce progress reports.

View on GitHub

🚀 Features
Automatic Capture: Takes a screenshot automatically the moment a command finishes successfully. (Ignores errors and failing commands!)
Zero Config Required: Just click the "OutSnap: OFF" toggle in your status bar to enable it.
Smart Cropping: Automatically crops the screenshot to just the terminal area (default 45% of the bottom screen) to keep your captures clean.
Adjustable Crop UI: Change the crop percentage on the fly directly from the status bar!
Word Document Export: Compile all your screenshots and command history into a professional .docx report with a single click.
Privacy First: All screenshots are saved locally directly to your Desktop/OutSnap folder. No telemetry, no backend server.
Highly Customizable: Configure output folders, delay times, ignored commands (like ls or cd), and session persistence.
⚙️ Extension Settings
OutSnap contributes the following settings that you can configure via VSCode Settings (Ctrl+,):

termsnap.enabled: Master on/off toggle for capture.
termsnap.sessionOnly: Reset to OFF automatically when VSCode closes.
termsnap.outputPath: Folder where screenshots are saved (default: ~/Desktop/OutSnap/).
termsnap.renderDelay: Milliseconds to wait before capturing the screenshot to allow the terminal to finish drawing.
termsnap.confirmBeforeCapture: Show a toast before each capture to manually confirm saving.
termsnap.excludeCommands: Commands to completely ignore (e.g., ["ls", "cd", "clear"]).
termsnap.cropToTerminal: Crop the bottom portion of the screenshot to simulate capturing only the terminal.
termsnap.terminalCropPercentage: The exact percentage of the screen to crop (default: 45%).
💡 How to Use
Click the OutSnap: OFF button in the bottom left status bar to turn it ON.
Run any command in your terminal (e.g., npm install or echo "Hello World").
Wait half a second. A toast notification will pop up: 📸 Saved: ...
Click View to see the screenshot or Undo to instantly delete it.
When you're done working, open the Command Palette (Ctrl+Shift+P), type Export to Word Document, and get a full summary of your session!
🛠️ Known Limitations
Requires VSCode Shell Integration API (v1.93+) to be enabled (Rich mode) to detect exit codes.
OutSnap captures the active VSCode window region. While it crops the bottom section intelligently, complex custom UI layouts might require adjusting the Crop Percentage setting.
📝 Release Notes
1.0.0
Initial release of OutSnap!

Status bar toggles & crop adjustment UI
Screenshot captures on successful exit
Word document (.docx) exporter
Fully customizable user settings
