import * as vscode from 'vscode';
import * as path from 'path';
import { Settings } from './settings';

export interface Task {
    id: string;
    label: string;
    headingText: string;
}

export class TaskTracker {
    private static statusBarItem: vscode.StatusBarItem;
    private static tasks: Task[] = [];
    private static currentTaskIndex: number = -1;

    public static init(context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(Settings.statusBarPosition === 'right' 
            ? vscode.StatusBarAlignment.Right 
            : vscode.StatusBarAlignment.Left, 98);
        this.statusBarItem.command = 'outsnap.setCurrentTask';
        context.subscriptions.push(this.statusBarItem);

        // Load state
        const savedTaskId = context.workspaceState.get<string>('outsnap.currentTask');
        if (savedTaskId) {
            this.setTaskById(savedTaskId);
        }

        this.updateVisibility();
    }

    public static setTasks(newTasks: Task[]) {
        this.tasks = newTasks;
        if (this.tasks.length > 0) {
            this.currentTaskIndex = 0;
        } else {
            this.currentTaskIndex = -1;
        }
        this.updateStatusBar();
        this.updateVisibility();
    }

    public static getCurrentTask(): Task | undefined {
        if (this.currentTaskIndex >= 0 && this.currentTaskIndex < this.tasks.length) {
            return this.tasks[this.currentTaskIndex];
        }
        return undefined;
    }

    public static setTaskById(id: string) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.currentTaskIndex = index;
            this.updateStatusBar();
        }
    }

    public static async pickTask() {
        const items = this.tasks.map(t => ({
            label: t.label,
            description: t.headingText,
            id: t.id
        }));

        // Add option to change document
        items.unshift({
            label: '$(file-text) Change Lab Document...',
            description: 'Select a different .docx file',
            id: 'change-doc'
        });

        const selected = await vscode.window.showQuickPick(items, { title: 'Select Current Task' });
        if (selected) {
            if (selected.id === 'change-doc') {
                const context = (global as any).extensionContext as vscode.ExtensionContext;
                if (context) {
                    const { LabDetector } = require('./labDetector');
                    await LabDetector.setLabDocument(context);
                }
                return;
            }
            this.setTaskById(selected.id);
            const context = (global as any).extensionContext as vscode.ExtensionContext;
            if (context) {
                context.workspaceState.update('outsnap.currentTask', selected.id);
            }
        }
    }

    public static nextTask() {
        if (this.tasks.length > 0) {
            this.currentTaskIndex = (this.currentTaskIndex + 1) % this.tasks.length;
            this.updateStatusBar();
            const context = (global as any).extensionContext as vscode.ExtensionContext;
            if (context) {
                context.workspaceState.update('outsnap.currentTask', this.tasks[this.currentTaskIndex].id);
            }
        }
    }

    public static updateVisibility() {
        if (Settings.labMode) {
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    private static updateStatusBar() {
        const task = this.getCurrentTask();
        const context = (global as any).extensionContext as vscode.ExtensionContext;
        const docPath = context?.workspaceState.get<string>('outsnap.labDocument');

        if (task) {
            this.statusBarItem.text = `$(list-unordered) Task: ${task.label}`;
            this.statusBarItem.tooltip = `Current Lab Task: ${task.headingText}`;
        } else if (docPath) {
            const filename = path.basename(docPath);
            this.statusBarItem.text = `$(list-unordered) No tasks in: ${filename}`;
            this.statusBarItem.tooltip = `Found document "${filename}", but no headings like "Task 1" or "Phase 1" were detected inside. Click to pick another document.`;
        } else {
            this.statusBarItem.text = `$(list-unordered) Task: No document detected`;
            this.statusBarItem.tooltip = 'Click to manually select your lab document (.docx)';
        }
    }
}
