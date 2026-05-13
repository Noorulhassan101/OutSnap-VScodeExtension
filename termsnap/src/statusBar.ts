import * as vscode from 'vscode';
import { Settings } from './settings';

export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private cropStatusBarItem: vscode.StatusBarItem;
    private _isEnabled: boolean = false;

    constructor() {
        const alignment = Settings.statusBarPosition === 'right' 
            ? vscode.StatusBarAlignment.Right 
            : vscode.StatusBarAlignment.Left;
            
        this.statusBarItem = vscode.window.createStatusBarItem(alignment, 100);
        this.statusBarItem.command = 'outsnap.toggleCapture';
        
        this.cropStatusBarItem = vscode.window.createStatusBarItem(alignment, 99);
        this.cropStatusBarItem.command = 'outsnap.setCropPercentage';

        // Initialize state
        this.updateState(Settings.enabled);
        this.updateCropText();
    }

    get isEnabled(): boolean {
        return this._isEnabled;
    }

    public updateState(enabled: boolean) {
        this._isEnabled = enabled;
        if (enabled) {
            this.statusBarItem.text = '$(device-camera) OutSnap: ON $(pass-filled)';
            this.statusBarItem.tooltip = 'OutSnap is actively listening for successful commands.';
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = '$(device-camera) OutSnap: OFF';
            this.statusBarItem.tooltip = 'OutSnap is disabled.';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.offlineBackground');
        }
        this.statusBarItem.show();
    }

    public updateCropText() {
        if (Settings.cropToTerminal) {
            this.cropStatusBarItem.text = `$(screen-normal) Crop: ${Settings.terminalCropPercentage}%`;
            this.cropStatusBarItem.tooltip = 'Change OutSnap Crop Percentage';
            this.cropStatusBarItem.show();
        } else {
            this.cropStatusBarItem.hide();
        }
    }

    public flashStatus(command: string) {
        const originalText = this.statusBarItem.text;
        const originalBg = this.statusBarItem.backgroundColor;
        
        const time = new Date().toLocaleTimeString();
        this.statusBarItem.text = `$(check) Saved: ${command} — ${time}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        
        setTimeout(() => {
            this.statusBarItem.text = originalText;
            this.statusBarItem.backgroundColor = originalBg;
        }, 3000);
    }

    public dispose() {
        this.statusBarItem.dispose();
        this.cropStatusBarItem.dispose();
    }
}
