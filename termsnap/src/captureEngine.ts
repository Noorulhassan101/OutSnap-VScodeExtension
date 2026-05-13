import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Settings } from './settings';
import { StatusBar } from './statusBar';
import { Logger } from './logger';
import { Monitor, Window } from 'node-screenshots';
import * as os from 'os';

export class CaptureEngine {
    private statusBar: StatusBar;
    private processedGitignores = new Set<string>();
    private fallbackWarningShown = false;

    constructor(statusBar: StatusBar) {
        this.statusBar = statusBar;
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
                await vscode.workspace.getConfiguration('outsnap').update('confirmBeforeCapture', false, vscode.ConfigurationTarget.Global);
            }
        }

        await this.captureAndSave(commandText, event);
    }

    private async resolveSavePath(event: vscode.TerminalShellExecutionEndEvent): Promise<string> {
        const mode = Settings.storageMode;
        let targetDir = '';

        if (mode === 'workspace') {
            const folders = vscode.workspace.workspaceFolders;
            if (folders && folders.length > 0) {
                let folder = folders[0];
                const cwd = event.terminal.shellIntegration?.cwd;
                if (cwd) {
                    const matchedFolder = vscode.workspace.getWorkspaceFolder(cwd);
                    if (matchedFolder) {
                        folder = matchedFolder;
                    }
                }

                targetDir = path.join(folder.uri.fsPath, Settings.folderName);
                await this.handleGitignore(folder.uri.fsPath, Settings.folderName);
            } else {
                targetDir = Settings.fallbackPath;
                if (!this.fallbackWarningShown) {
                    vscode.window.showWarningMessage("No workspace open — saving to fallback folder.");
                    this.fallbackWarningShown = true;
                }
            }
        } else if (mode === 'custom') {
            targetDir = Settings.customPath;
            if (!targetDir || !fs.existsSync(targetDir)) {
                targetDir = Settings.fallbackPath;
            }
        } else {
            // global mode
            targetDir = Settings.fallbackPath;
        }

        if (!fs.existsSync(targetDir)) {
            try {
                fs.mkdirSync(targetDir, { recursive: true });
            } catch (err) {
                console.error('Failed to create storage directory', err);
                // Fallback to home if everything fails
                targetDir = path.join(os.homedir(), 'outsnap');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            }
        }

        return targetDir;
    }

    private async handleGitignore(workspaceRoot: string, folderName: string) {
        if (!Settings.autoGitignore) return;
        if (this.processedGitignores.has(workspaceRoot)) return;

        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                const normalizedFolderName = folderName.startsWith('.') ? folderName : `./${folderName}`;
                if (!content.includes(folderName)) {
                    const lineEnd = content.endsWith('\n') ? '' : '\n';
                    fs.appendFileSync(gitignorePath, `${lineEnd}${folderName}/\n`);
                }
            } catch (err) {
                console.error('Failed to update .gitignore', err);
            }
        }
        this.processedGitignores.add(workspaceRoot);
    }

    private async captureAndSave(commandText: string, event: vscode.TerminalShellExecutionEndEvent) {
        try {
            const savePath = await this.resolveSavePath(event);
            
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
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `${timestamp}_${this.sanitizeFilename(commandText)}.${format}`;
            const fullPath = path.join(savePath, filename);

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
            vscode.window.showErrorMessage(`OutSnap capture failed: ${error.message}`);
        }
    }
}


