import { info } from 'console';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, '../../logs/app.log');

export function logger(level, message) {
    if (!['info', 'error', 'warn'].includes(level)) {
        throw new Error('Invalid log level. Use "info", "error", or "warn".');
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()} : ${message}\n`;

    fs.appendFileSync(logFile, logEntry);
    console[level](logEntry.trim());
}