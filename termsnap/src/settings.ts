import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export class Settings {
    private static get configuration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('outsnap');
    }

    static get enabled(): boolean {
        return this.configuration.get<boolean>('enabled', false);
    }

    static async setEnabled(value: boolean): Promise<void> {
        const sessionOnly = this.sessionOnly;
        if (!sessionOnly) {
            await this.configuration.update('enabled', value, vscode.ConfigurationTarget.Global);
        }
        await vscode.commands.executeCommand('setContext', 'outsnap:enabled', value);
    }

    static get sessionOnly(): boolean {
        return this.configuration.get<boolean>('sessionOnly', true);
    }

    static get storageMode(): 'workspace' | 'global' | 'custom' {
        return this.configuration.get<'workspace' | 'global' | 'custom'>('storageMode', 'workspace');
    }

    static get folderName(): string {
        return this.configuration.get<string>('folderName', '.outsnap');
    }

    static get autoGitignore(): boolean {
        return this.configuration.get<boolean>('autoGitignore', true);
    }

    static get fallbackPath(): string {
        const configuredPath = this.configuration.get<string>('fallbackPath', '~/outsnap/');
        return this.resolvePath(configuredPath);
    }

    static get customPath(): string {
        const configuredPath = this.configuration.get<string>('customPath', '');
        return this.resolvePath(configuredPath);
    }

    private static resolvePath(configuredPath: string): string {
        if (!configuredPath) return '';
        if (configuredPath.startsWith('~/')) {
            return path.join(os.homedir(), configuredPath.slice(2));
        }
        return configuredPath;
    }

    static get renderDelay(): number {
        return this.configuration.get<number>('renderDelay', 350);
    }

    static get confirmBeforeCapture(): boolean {
        return this.configuration.get<boolean>('confirmBeforeCapture', false);
    }

    static get excludeCommands(): string[] {
        return this.configuration.get<string[]>('excludeCommands', []);
    }

    static get captureOnlySuccessful(): boolean {
        return this.configuration.get<boolean>('captureOnlySuccessful', true);
    }

    static get imageFormat(): 'png' | 'jpg' {
        return this.configuration.get<'png' | 'jpg'>('imageFormat', 'png');
    }

    static get autoExportDocx(): boolean {
        return this.configuration.get<boolean>('autoExportDocx', false);
    }

    static get statusBarPosition(): 'left' | 'right' {
        return this.configuration.get<'left' | 'right'>('statusBarPosition', 'left');
    }

    static get showCaptureToast(): boolean {
        return this.configuration.get<boolean>('showCaptureToast', true);
    }

    static get cropToTerminal(): boolean {
        return this.configuration.get<boolean>('cropToTerminal', true);
    }

    static get terminalCropPercentage(): number {
        return this.configuration.get<number>('terminalCropPercentage', 45);
    }

    static get labMode(): boolean {
        return this.configuration.get<boolean>('labMode', false);
    }

    static get labDocument(): string {
        return this.configuration.get<string>('labDocument', '');
    }

    static get captionStyle(): 'timestamp' | 'command' | 'both' | 'none' {
        return this.configuration.get<'timestamp' | 'command' | 'both' | 'none'>('captionStyle', 'both');
    }

    static get imageWidth(): number {
        return this.configuration.get<number>('imageWidth', 6);
    }
}
