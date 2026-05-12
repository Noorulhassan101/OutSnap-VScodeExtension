import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export class Settings {
    private static get configuration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('termsnap');
    }

    static get enabled(): boolean {
        return this.configuration.get<boolean>('enabled', false);
    }

    static async setEnabled(value: boolean): Promise<void> {
        // Only save globally if it's not sessionOnly.
        const sessionOnly = this.sessionOnly;
        if (!sessionOnly) {
            await this.configuration.update('enabled', value, vscode.ConfigurationTarget.Global);
        }
        // In session mode, we might just track state in memory, but for UI binding, we use a global context var or temporary settings update.
        await vscode.commands.executeCommand('setContext', 'termsnap:enabled', value);
    }

    static get sessionOnly(): boolean {
        return this.configuration.get<boolean>('sessionOnly', true);
    }

    static get outputPath(): string {
        const configuredPath = this.configuration.get<string>('outputPath', '~/Desktop/OutSnap/');
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
}
