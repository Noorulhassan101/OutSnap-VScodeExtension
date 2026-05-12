import * as vscode from 'vscode';
import * as path from 'path';
import { StatusBar } from './statusBar';
import { CaptureEngine } from './captureEngine';
import { Logger } from './logger';
import { WordExport } from './wordExport';
import { Settings } from './settings';

export function activate(context: vscode.ExtensionContext) {
    const statusBar = new StatusBar();
    const captureEngine = new CaptureEngine(statusBar);
    
    // Check first run notification
    const globalState = context.globalState;
    const hasRun = globalState.get<boolean>('termsnap.hasRun', false);

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('termsnap.enableCapture', async () => {
            await Settings.setEnabled(true);
            statusBar.updateState(true);
            showFirstRun(globalState);
        }),

        vscode.commands.registerCommand('termsnap.disableCapture', async () => {
            await Settings.setEnabled(false);
            statusBar.updateState(false);
        }),

        vscode.commands.registerCommand('termsnap.toggleCapture', async () => {
            const newState = !statusBar.isEnabled;
            await Settings.setEnabled(newState);
            statusBar.updateState(newState);
            if (newState) {
                showFirstRun(globalState);
            }
        }),

        vscode.commands.registerCommand('termsnap.openScreenshotsFolder', () => {
            const outPath = Settings.outputPath;
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(path.join(outPath, 'fakefile.txt'))); 
            // fakefile to open folder
        }),

        vscode.commands.registerCommand('termsnap.exportToWord', async () => {
            await WordExport.export();
        }),

        vscode.commands.registerCommand('termsnap.clearAllScreenshots', async () => {
            const selection = await vscode.window.showWarningMessage('Are you sure you want to delete all screenshots in the TermSnap folder?', 'Yes', 'No');
            if (selection === 'Yes') {
                Logger.clearAllScreenshots(Settings.outputPath);
                vscode.window.showInformationMessage('All TermSnap screenshots deleted.');
            }
        }),

        vscode.commands.registerCommand('termsnap.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'termsnap');
        }),

        vscode.commands.registerCommand('termsnap.showCaptureLog', () => {
            const records = Logger.getRecords();
            if (records.length === 0) {
                vscode.window.showInformationMessage('TermSnap Log is empty.');
                return;
            }
            const items = records.map(r => `${r.timestamp.toLocaleTimeString()} - ${r.command}`);
            vscode.window.showQuickPick(items, { title: 'TermSnap Capture Log' });
        }),

        vscode.commands.registerCommand('termsnap.setCropPercentage', async () => {
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
                await vscode.workspace.getConfiguration('termsnap').update('terminalCropPercentage', num, vscode.ConfigurationTarget.Global);
            }
        })
    );

    // Listen to configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('termsnap.terminalCropPercentage') || e.affectsConfiguration('termsnap.cropToTerminal')) {
                statusBar.updateCropText();
            }
        })
    );

    // Listen to shell integration
    context.subscriptions.push(
        vscode.window.onDidEndTerminalShellExecution(async (e) => {
            await captureEngine.handleCommandEnd(e);
        })
    );

    context.subscriptions.push(statusBar);
}

function showFirstRun(globalState: vscode.Memento) {
    const hasRun = globalState.get<boolean>('termsnap.hasRun', false);
    if (!hasRun) {
        vscode.window.showInformationMessage(
            `📷 OutSnap is now active. Screenshots will be saved to: ${Settings.outputPath}`,
            'Open Folder', 'Settings', 'Got it'
        ).then(selection => {
            if (selection === 'Open Folder') {
                vscode.commands.executeCommand('termsnap.openScreenshotsFolder');
            } else if (selection === 'Settings') {
                vscode.commands.executeCommand('termsnap.openSettings');
            }
        });
        globalState.update('termsnap.hasRun', true);
    }
}

export function deactivate() {
    if (Settings.autoExportDocx) {
        WordExport.export();
    }
}
