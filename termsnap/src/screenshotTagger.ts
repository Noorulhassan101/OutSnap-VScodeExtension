import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TaskTracker } from './taskTracker';

export interface ScreenshotMetadata {
    file: string;
    command: string;
    timestamp: string;
    inserted: boolean;
}

export interface TaskInfo {
    label: string;
    headingText: string;
    screenshots: ScreenshotMetadata[];
}

export interface IndexFile {
    labDocument: string;
    tasks: { [taskId: string]: TaskInfo };
}

export class ScreenshotTagger {
    public static async tagScreenshot(saveDir: string, filename: string, command: string, context: vscode.ExtensionContext): Promise<string> {
        const task = TaskTracker.getCurrentTask();
        if (!task) return path.join(saveDir, filename);

        const taskDir = path.join(saveDir, task.id);
        if (!fs.existsSync(taskDir)) {
            fs.mkdirSync(taskDir, { recursive: true });
        }

        const newPath = path.join(taskDir, filename);
        
        // Update index.json
        await this.updateIndex(saveDir, task.id, task.label, task.headingText, path.join(task.id, filename), command, context);
        
        return newPath;
    }

    private static async updateIndex(saveDir: string, taskId: string, taskLabel: string, headingText: string, relativePath: string, command: string, context: vscode.ExtensionContext) {
        const indexPath = path.join(saveDir, 'index.json');
        let index: IndexFile = {
            labDocument: context.workspaceState.get<string>('outsnap.labDocument') || '',
            tasks: {}
        };

        if (fs.existsSync(indexPath)) {
            try {
                index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            } catch (err) {
                console.error('Failed to read index.json', err);
            }
        }

        // Always sync with the latest document path from VS Code state
        index.labDocument = context.workspaceState.get<string>('outsnap.labDocument') || '';

        if (!index.tasks[taskId]) {
            index.tasks[taskId] = {
                label: taskLabel,
                headingText: headingText,
                screenshots: []
            };
        }

        index.tasks[taskId].screenshots.push({
            file: relativePath,
            command: command,
            timestamp: new Date().toISOString(),
            inserted: false
        });

        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }
}
