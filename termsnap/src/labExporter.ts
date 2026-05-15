import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
const sizeOf = require('image-size');
import { Settings } from './settings';
import { IndexFile } from './screenshotTagger';

export class LabExporter {
    public static async export(context: vscode.ExtensionContext, silent: boolean = false) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) return;

        const saveDir = await this.resolveBaseSaveDir();
        const indexPath = path.join(saveDir, 'index.json');
        if (!fs.existsSync(indexPath)) {
            if (!silent) vscode.window.showErrorMessage('No OutSnap index.json found.');
            return;
        }

        const index: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const docPath = index.labDocument || context.workspaceState.get<string>('outsnap.labDocument');

        if (!docPath || !fs.existsSync(docPath)) {
            if (!silent) vscode.window.showErrorMessage('Lab document not found.');
            return;
        }

        try {
            const zip = await JSZip.loadAsync(fs.readFileSync(docPath));
            let docXml = await zip.file('word/document.xml')?.async('string');
            let relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

            if (!docXml || !relsXml) throw new Error('Invalid docx structure');

            let relIdCounter = 1000;
            const matches = relsXml.match(/Id="rId(\d+)"/g);
            if (matches) {
                relIdCounter = Math.max(...matches.map(m => parseInt(m.match(/\d+/)![0])), 1000) + 1;
            }

            let hasNewInsertions = false;
            let currentDocXml: string = docXml;

            for (const taskId in index.tasks) {
                const task = index.tasks[taskId];
                const newScreenshots = task.screenshots.filter(s => !s.inserted);
                if (newScreenshots.length === 0) continue;

                const parts: string[] = currentDocXml.split(/(<w:p [^>]*>.*?<\/w:p>)/);
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.startsWith('<w:p')) {
                        const plainText = part.replace(/<[^>]+>/g, '').trim();
                        
                        if ((task.label && plainText.toLowerCase().startsWith(task.label.toLowerCase())) || 
                            (task.headingText && plainText.toLowerCase().includes(task.headingText.toLowerCase()))) {
                            
                            let injectionXml = '';
                            for (const ss of newScreenshots) {
                                const ssPath = path.join(saveDir, ss.file);
                                if (!fs.existsSync(ssPath)) continue;

                                const imgData = fs.readFileSync(ssPath);
                                const dimensions = sizeOf(ssPath);
                                const width = dimensions.width || 1000;
                                const height = dimensions.height || 600;

                                const rId = `rId${relIdCounter++}`;
                                const mediaName = `outsnap_img_${relIdCounter}.png`;

                                zip.file(`word/media/${mediaName}`, imgData);

                                const newRel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
                                relsXml = relsXml.replace('</Relationships>', `${newRel}</Relationships>`);

                                injectionXml += this.createCaption(ss) + this.createImageXml(rId, width, height);
                                ss.inserted = true;
                                hasNewInsertions = true;
                            }
                            
                            parts[i] = part + injectionXml;
                            break; 
                        }
                    }
                }
                currentDocXml = parts.join('');
            }

            if (hasNewInsertions) {
                zip.file('word/document.xml', currentDocXml);
                zip.file('word/_rels/document.xml.rels', relsXml);

                const content = await zip.generateAsync({ type: 'nodebuffer' });
                fs.writeFileSync(docPath, content);
                
                // CRITICAL: Always save the index back to disk after setting inserted: true
                fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

                if (!silent) vscode.window.showInformationMessage(`Lab report updated: ${path.basename(docPath)}`);
            }

        } catch (err: any) {
            if (!silent) vscode.window.showErrorMessage(`Export failed: ${err.message}`);
        }
    }

    private static createCaption(ss: any): string {
        const style = Settings.captionStyle;
        let text = '';
        if (style === 'both') text = `OutSnap capture: ${ss.command} — ${new Date(ss.timestamp).toLocaleTimeString()}`;
        else if (style === 'command') text = `OutSnap capture: ${ss.command}`;
        else if (style === 'timestamp') text = `OutSnap capture: ${new Date(ss.timestamp).toLocaleTimeString()}`;
        if (!text) return '';

        return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:color w:val="777777"/><w:sz w:val="16"/><w:i/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;
    }

    private static createImageXml(rId: string, width: number, height: number): string {
        const widthInches = Settings.imageWidth;
        const widthEMU = Math.floor(widthInches * 914400);
        const heightEMU = Math.floor(widthEMU * (height / width));

        return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEMU}" cy="${heightEMU}"/><wp:docPr id="1" name="Picture 1"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="outsnap_img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEMU}" cy="${heightEMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    }

    private static async resolveBaseSaveDir(): Promise<string> {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            return path.join(folders[0].uri.fsPath, Settings.folderName);
        }
        return Settings.fallbackPath;
    }
}
