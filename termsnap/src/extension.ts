import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StatusBar } from './statusBar';
import { CaptureEngine } from './captureEngine';
import { Logger } from './logger';
import { WordExport } from './wordExport';
import { Settings } from './settings';
import { TaskTracker } from './taskTracker';
import { LabDetector } from './labDetector';
import { LabExporter } from './labExporter';

export async function activate(context: vscode.ExtensionContext) {
    (global as any).extensionContext = context;
    const statusBar = new StatusBar();
    const captureEngine = new CaptureEngine(statusBar, context);
    
    // Initialize Task Tracker
    TaskTracker.init(context);

    // Initial Lab Detection
    if (Settings.labMode) {
        await LabDetector.detectLabDocument(context);
    }

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('outsnap.enableCapture', async () => {
            await Settings.setEnabled(true);
            statusBar.updateState(true);
            showFirstRun(context.globalState);
            if (Settings.labMode) {
                await LabDetector.detectLabDocument(context);
            }
        }),

        vscode.commands.registerCommand('outsnap.disableCapture', async () => {
            await Settings.setEnabled(false);
            statusBar.updateState(false);
        }),

        vscode.commands.registerCommand('outsnap.toggleCapture', async () => {
            const newState = !statusBar.isEnabled;
            await Settings.setEnabled(newState);
            statusBar.updateState(newState);
            if (newState) {
                showFirstRun(context.globalState);
                if (Settings.labMode) {
                    await LabDetector.detectLabDocument(context);
                }
            }
        }),

        vscode.commands.registerCommand('outsnap.openScreenshotsFolder', () => {
            const folders = vscode.workspace.workspaceFolders;
            let openPath = Settings.fallbackPath;
            if (Settings.storageMode === 'workspace' && folders && folders.length > 0) {
                openPath = path.join(folders[0].uri.fsPath, Settings.folderName);
            } else if (Settings.storageMode === 'custom' && Settings.customPath) {
                openPath = Settings.customPath;
            }

            if (fs.existsSync(openPath)) {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(openPath));
            } else {
                vscode.window.showErrorMessage(`Storage folder does not exist yet: ${openPath}`);
            }
        }),

        vscode.commands.registerCommand('outsnap.exportToWord', async () => {
            await WordExport.export();
        }),

        vscode.commands.registerCommand('outsnap.insertScreenshots', async () => {
            await LabExporter.export(context);
        }),

        vscode.commands.registerCommand('outsnap.setLabDocument', async () => {
            await LabDetector.setLabDocument(context);
        }),

        vscode.commands.registerCommand('outsnap.setCurrentTask', async () => {
            await TaskTracker.pickTask();
        }),

        vscode.commands.registerCommand('outsnap.nextTask', () => {
            TaskTracker.nextTask();
        }),

        vscode.commands.registerCommand('outsnap.clearAllScreenshots', async () => {
            const selection = await vscode.window.showWarningMessage('Are you sure you want to delete all screenshots in the current storage folder?', 'Yes', 'No');
            if (selection === 'Yes') {
                const folders = vscode.workspace.workspaceFolders;
                let clearPath = Settings.fallbackPath;
                if (Settings.storageMode === 'workspace' && folders && folders.length > 0) {
                    clearPath = path.join(folders[0].uri.fsPath, Settings.folderName);
                } else if (Settings.storageMode === 'custom' && Settings.customPath) {
                    clearPath = Settings.customPath;
                }
                Logger.clearAllScreenshots(clearPath);
                vscode.window.showInformationMessage('Screenshots cleared.');
            }
        }),

        vscode.commands.registerCommand('outsnap.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'outsnap');
        }),

        vscode.commands.registerCommand('outsnap.showCaptureLog', () => {
            const records = Logger.getRecords();
            if (records.length === 0) {
                vscode.window.showInformationMessage('OutSnap Log is empty.');
                return;
            }
            const items = records.map(r => `${r.timestamp.toLocaleTimeString()} - ${r.command}`);
            vscode.window.showQuickPick(items, { title: 'OutSnap Capture Log' });
        }),

        vscode.commands.registerCommand('outsnap.setCropPercentage', async () => {
            const current = Settings.terminalCropPercentage;
            const result = await vscode.window.showInputBox({
                prompt: 'Enter crop percentage (10-100)',
                value: current.toString(),
                validateInput: text => {
                    const num = parseInt(text, 10);
                    if (isNaN(num) || num < 10 || num > 100) return 'Please enter a number between 10 and 100';
                    return null;
                }
            });
            if (result) {
                const num = parseInt(result, 10);
                await vscode.workspace.getConfiguration('outsnap').update('terminalCropPercentage', num, vscode.ConfigurationTarget.Global);
            }
        })
    );

    // Listen to configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('outsnap.terminalCropPercentage') || e.affectsConfiguration('outsnap.cropToTerminal')) {
                statusBar.updateCropText();
            }
            if (e.affectsConfiguration('outsnap.labMode')) {
                TaskTracker.updateVisibility();
                if (Settings.labMode) {
                    LabDetector.detectLabDocument(context);
                }
            }
        })
    );



    context.subscriptions.push(statusBar);
}

function showFirstRun(globalState: vscode.Memento) {
    const hasRun = globalState.get<boolean>('outsnap.hasRun', false);
    if (!hasRun) {
        vscode.window.showInformationMessage(
            `📷 OutSnap is now active. Screenshots will be saved based on your Storage Mode setting.`,
            'Settings', 'Got it'
        ).then(selection => {
            if (selection === 'Settings') {
                vscode.commands.executeCommand('outsnap.openSettings');
            }
        });
        globalState.update('outsnap.hasRun', true);
    }
}

export function deactivate() {
    if (Settings.autoExportDocx) {
        WordExport.export();
    }
}
