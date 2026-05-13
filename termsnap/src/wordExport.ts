import * as fs from 'fs';
import * as path from 'path';
import { Document, Paragraph, TextRun, ImageRun, Packer, HeadingLevel, TableOfContents } from 'docx';
import { Logger } from './logger';
import { Settings } from './settings';
import * as vscode from 'vscode';

export class WordExport {
    public static async export() {
        const records = Logger.getRecords();
        if (records.length === 0) {
            vscode.window.showInformationMessage('No OutSnap records to export.');
            return;
        }

        const now = new Date();
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: "OutSnap Session Report",
                        heading: HeadingLevel.TITLE,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, bold: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Total Commands: ${records.length}`, bold: true }),
                        ],
                    }),
                    new Paragraph({
                        text: "Table of Contents",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new TableOfContents("Summary", {
                        hyperlink: true,
                        headingStyleRange: "1-1",
                    }),
                    new Paragraph({ text: "" }), // spacing
                    ...records.flatMap((record, index) => {
                        const children: any[] = [
                            new Paragraph({
                                text: `Command ${index + 1}: ${record.command}`,
                                heading: HeadingLevel.HEADING_1,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun(`Timestamp: ${record.timestamp.toLocaleTimeString()}`),
                                ]
                            })
                        ];

                        if (fs.existsSync(record.imagePath)) {
                            const imageBuffer = fs.readFileSync(record.imagePath);
                            children.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: imageBuffer,
                                            transformation: {
                                                width: 600, // scaled width for word
                                                height: 350,
                                            },
                                        })
                                    ]
                                })
                            );
                        } else {
                            children.push(new Paragraph({
                                text: "[Image not found]"
                            }));
                        }
                        
                        return children;
                    })
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const folders = vscode.workspace.workspaceFolders;
        let savePath = Settings.fallbackPath;
        if (Settings.storageMode === 'workspace' && folders && folders.length > 0) {
            savePath = path.join(folders[0].uri.fsPath, Settings.folderName);
        } else if (Settings.storageMode === 'custom' && Settings.customPath) {
            savePath = Settings.customPath;
        }

        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `OutSnap_Report_${timestamp}.docx`;
        const outputPath = path.join(savePath, fileName);

        fs.writeFileSync(outputPath, buffer);
        vscode.window.showInformationMessage(`OutSnap Report saved to ${outputPath}`, 'Open').then(res => {
            if (res === 'Open') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
            }
        });
    }
}
