import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Settings } from './settings';
import { StatusBar } from './statusBar';
import { Logger } from './logger';
import { ScreenshotTagger } from './screenshotTagger';
import { Monitor, Window } from 'node-screenshots';

export class CaptureEngine {
    private statusBar: StatusBar;
    private context: vscode.ExtensionContext;
    private processedGitignores = new Set<string>();
    private fallbackWarningShown = false;
    private activeOutputs = new Map<vscode.TerminalShellExecution, string[]>();

    constructor(statusBar: StatusBar, context: vscode.ExtensionContext) {
        this.statusBar = statusBar;
        this.context = context;
        
        // Start buffering output immediately when a command begins
        context.subscriptions.push(
            vscode.window.onDidStartTerminalShellExecution(async (event) => {
                const output: string[] = [];
                this.activeOutputs.set(event.execution, output);
                
                try {
                    const reader = event.execution.read();
                    for await (const chunk of reader) {
                        output.push(chunk);
                    }
                } catch (err) {
                    console.error('OutSnap live reader error:', err);
                }
            })
        );

        // Handle execution end using the live buffer
        context.subscriptions.push(
            vscode.window.onDidEndTerminalShellExecution(async (event) => {
                await this.handleExecutionEnd(event.execution, event.terminal, event.exitCode);
            })
        );
    }

    private sanitizeFilename(cmd: string): string {
        return cmd.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
    }

    private async handleExecutionEnd(execution: vscode.TerminalShellExecution, terminal: vscode.Terminal, exitCode: number | undefined) {
        if (!this.statusBar.isEnabled) return;

        const commandText = execution.commandLine.value.trim();
        if (!commandText) return;

        const cmdBase = commandText.split(' ')[0];
        if (Settings.excludeCommands.includes(cmdBase)) return;

        await new Promise(resolve => setTimeout(resolve, Settings.renderDelay));

        const finalExitCode = exitCode ?? 0;

        if (Settings.captureOnlySuccessful && finalExitCode !== 0) {
            return;
        }

        // Always use single page capture now to keep things simple
        await this.captureAndSave(commandText, execution, terminal, finalExitCode);
    }



    private async captureCurrentRegion(outputPath: string) {
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
        fs.writeFileSync(outputPath, imageBuffer);
    }

    private getTimestamp(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    }

    private getThemeColor(id: string, fallback: string): string {
        // VS Code doesn't easily expose theme colors to extensions in hex. 
        // A common trick is to use a dummy webview or just stick to standard guesses for now.
        // For production, we'd use a more robust color theme extractor.
        return fallback; 
    }

    private async resolveSavePath(execution: vscode.TerminalShellExecution, terminal: vscode.Terminal): Promise<string> {
        const mode = Settings.storageMode;
        let targetDir = '';

        if (mode === 'workspace') {
            const folders = vscode.workspace.workspaceFolders;
            if (folders && folders.length > 0) {
                let folder = folders[0];
                const cwd = terminal.shellIntegration?.cwd;
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
            targetDir = Settings.fallbackPath;
        }

        if (!fs.existsSync(targetDir)) {
            try {
                fs.mkdirSync(targetDir, { recursive: true });
            } catch (err) {
                console.error('Failed to create storage directory', err);
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

    private async captureAndSave(commandText: string, execution: vscode.TerminalShellExecution, terminal: vscode.Terminal, exitCode: number) {
        try {
            const savePath = await this.resolveSavePath(execution, terminal);
            
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
            const timestamp = this.getTimestamp();
            const filename = `${timestamp}_${this.sanitizeFilename(commandText)}.${format}`;
            
            // Tag with task if lab mode is on
            const fullPath = await ScreenshotTagger.tagScreenshot(savePath, filename, commandText, this.context);

            fs.writeFileSync(fullPath, imageBuffer);

            // Log
            Logger.addRecord({
                timestamp: now,
                command: commandText,
                exitCode: exitCode,
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

            // Auto-insert into Lab Document if in Lab Mode
            if (Settings.labMode) {
                const { LabExporter } = require('./labExporter');
                await LabExporter.export(this.context, true);
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`OutSnap capture failed: ${error.message}`);
        }
    }
}
