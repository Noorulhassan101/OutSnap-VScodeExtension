import * as fs from 'fs';
import * as path from 'path';

export interface CaptureRecord {
    timestamp: Date;
    command: string;
    exitCode: number;
    imagePath: string;
}

export class Logger {
    private static records: CaptureRecord[] = [];

    public static addRecord(record: CaptureRecord) {
        this.records.push(record);
    }

    public static getRecords(): CaptureRecord[] {
        return this.records;
    }

    public static clearRecords() {
        this.records = [];
    }

    public static removeRecordByPath(imagePath: string) {
        this.records = this.records.filter(r => r.imagePath !== imagePath);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (err) {
                console.error('Failed to delete image: ', err);
            }
        }
    }

    public static clearAllScreenshots(outputDir: string) {
        this.records = [];
        if (fs.existsSync(outputDir)) {
            const files = fs.readdirSync(outputDir);
            for (const file of files) {
                if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.docx')) {
                    fs.unlinkSync(path.join(outputDir, file));
                }
            }
        }
    }
}
