import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import { TaskTracker, Task } from './taskTracker';
import { Settings } from './settings';

export class LabDetector {
    public static async detectLabDocument(context: vscode.ExtensionContext) {
        if (!Settings.labMode) return;

        const savedDoc = context.workspaceState.get<string>('outsnap.labDocument');
        if (savedDoc && fs.existsSync(savedDoc)) {
            await this.parseTasks(savedDoc);
            return;
        }

        const folders = vscode.workspace.workspaceFolders;
        if (!folders) return;

        const workspaceRoot = folders[0].uri.fsPath;
        const files = fs.readdirSync(workspaceRoot);

        const patterns = [/\.docx$/i, /\.doc$/i, /lab/i, /assignment/i, /report/i, /task/i, /worksheet/i];
        const matches = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            if (ext !== '.docx' && ext !== '.doc') return false;
            return patterns.some(p => p.test(f));
        });

        let selectedDoc: string | undefined;

        if (matches.length === 1) {
            selectedDoc = path.join(workspaceRoot, matches[0]);
        } else if (matches.length > 1) {
            const items = matches.map(m => ({ label: m, description: 'Lab Document' }));
            items.push({ label: 'None — just save to folder', description: '' });
            
            const selected = await vscode.window.showQuickPick(items, { title: 'OutSnap found multiple documents. Which is your lab report?' });
            if (selected && selected.label !== 'None — just save to folder') {
                selectedDoc = path.join(workspaceRoot, selected.label);
            }
        }

        if (selectedDoc) {
            context.workspaceState.update('outsnap.labDocument', selectedDoc);
            await this.parseTasks(selectedDoc);
        }
    }

    public static async setLabDocument(context: vscode.ExtensionContext) {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'Word Documents': ['docx'] }
        });

        if (uris && uris.length > 0) {
            const docPath = uris[0].fsPath;
            context.workspaceState.update('outsnap.labDocument', docPath);
            TaskTracker.setTasks([]); // Clear old tasks
            await this.parseTasks(docPath);
            vscode.window.showInformationMessage(`Lab document set: ${path.basename(docPath)}`);
        }
    }

    public static async parseTasks(docPath: string) {
        if (!fs.existsSync(docPath)) return;

        try {
            const result = await mammoth.extractRawText({ path: docPath });
            const text = result.value;
            const lines = text.split('\n');

            const taskPatterns = [
                /^(Task|Part|Question|Exercise|Step|Q|Phase|Deliverable|Section)[-\s]?(\d+)/i,
                /^(Task|Part|Question|Exercise|Step|Q|Phase|Deliverable|Section)\s*([A-Z\d]+)/i
            ];

            const tasks: Task[] = [];
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.length > 100) return; // Ignore very long lines that aren't likely headings

                for (const pattern of taskPatterns) {
                    const match = trimmed.match(pattern);
                    if (match) {
                        const label = `${match[1]} ${match[2]}`;
                        tasks.push({
                            id: label.toLowerCase().replace(/\s+/g, '-'),
                            label: label,
                            headingText: trimmed
                        });
                        break;
                    }
                }
            });

            const uniqueTasks = tasks.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            TaskTracker.setTasks(uniqueTasks);
            
            if (uniqueTasks.length === 0) {
                vscode.window.showWarningMessage('Document loaded, but no Task/Phase headings were detected. Check your document formatting.');
            }
        } catch (err) {
            console.error('Failed to parse lab document', err);
        }
    }
}
