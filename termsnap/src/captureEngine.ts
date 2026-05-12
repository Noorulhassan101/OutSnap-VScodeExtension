import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Settings } from './settings';
import { StatusBar } from './statusBar';
import { Logger } from './logger';
import { Monitor, Window } from 'node-screenshots';

export class CaptureEngine {
    private statusBar: StatusBar;

    constructor(statusBar: StatusBar) {
        this.statusBar = statusBar;
        this.ensureOutputPath();
    }

    private ensureOutputPath() {
        const outPath = Settings.outputPath;
        if (!fs.existsSync(outPath)) {
            fs.mkdirSync(outPath, { recursive: true });
        }
    }

    private sanitizeFilename(cmd: string): string {
        return cmd.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
    }

    public async handleCommandEnd(event: vscode.TerminalShellExecutionEndEvent) {
        if (!this.statusBar.isEnabled) {
            return; // Not listening
        }

        const exitCode = event.exitCode;
        if (exitCode !== 0) {
            return; // Only capture on success
        }

        const commandText = event.execution.commandLine.value.trim();
        if (!commandText) {
            return;
        }

        // Check excludes
        const cmdBase = commandText.split(' ')[0];
        if (Settings.excludeCommands.includes(cmdBase)) {
            return;
        }

        // Wait for render delay
        await new Promise(resolve => setTimeout(resolve, Settings.renderDelay));

        // Optional confirm before capture
        if (Settings.confirmBeforeCapture) {
            const action = await vscode.window.showInformationMessage(
                `✅ Command succeeded — save screenshot?`,
                'Save', 'Skip', 'Turn off confirmations'
            );
            if (action === 'Skip' || !action) return;
            if (action === 'Turn off confirmations') {
                await vscode.workspace.getConfiguration('termsnap').update('confirmBeforeCapture', false, vscode.ConfigurationTarget.Global);
            }
        }

        await this.captureAndSave(commandText);
    }

    private async captureAndSave(commandText: string) {
        try {
            this.ensureOutputPath();
            
            // Try to find VSCode window, or default to primary monitor
            const windows = Window.all();
            let vsCodeWindow = windows.find(w => w.appName().toLowerCase().includes('code'));
            
            let imageBuffer: Buffer;
            if (vsCodeWindow) {
                let image = vsCodeWindow.captureImageSync();
                if (Settings.cropToTerminal) {
                    const percentage = Settings.terminalCropPercentage / 100;
                    const cropHeight = Math.floor(image.height * percentage);
                    const cropY = image.height - cropHeight;
                    image = image.cropSync(0, cropY, image.width, cropHeight);
                }
                imageBuffer = image.toPngSync();
            } else {
                const monitor = Monitor.fromPoint(0, 0);
                if (monitor) {
                    let image = monitor.captureImageSync();
                    if (Settings.cropToTerminal) {
                        const percentage = Settings.terminalCropPercentage / 100;
                        const cropHeight = Math.floor(image.height * percentage);
                        const cropY = image.height - cropHeight;
                        image = image.cropSync(0, cropY, image.width, cropHeight);
                    }
                    imageBuffer = image.toPngSync();
                } else {
                    throw new Error("No monitor or window available to capture.");
                }
            }

            const format = Settings.imageFormat;
            const now = new Date();
            // YYYY-MM-DD_HH-MM-SS_<sanitised-command>.png
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `${timestamp}_${this.sanitizeFilename(commandText)}.${format}`;
            const fullPath = path.join(Settings.outputPath, filename);

            fs.writeFileSync(fullPath, imageBuffer);

            // Log
            Logger.addRecord({
                timestamp: now,
                command: commandText,
                exitCode: 0,
                imagePath: fullPath
            });

            // UI Feedback
            if (Settings.showCaptureToast) {
                vscode.window.showInformationMessage(`📸 Saved: ${commandText}`, 'View', 'Undo').then(selection => {
                    if (selection === 'View') {
                        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fullPath));
                    } else if (selection === 'Undo') {
                        Logger.removeRecordByPath(fullPath);
                        vscode.window.showInformationMessage(`Screenshot deleted.`);
                    }
                });
            }
            this.statusBar.flashStatus(commandText);

        } catch (error: any) {
            vscode.window.showErrorMessage(`TermSnap capture failed: ${error.message}`);
        }
    }
}
