// src/backend/utils/logger.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

// Main logger object
const logger = {
  info: (message) => writeLog('info', message),
  error: (message) => writeLog('error', message),
  warn: (message) => writeLog('warn', message)
};

function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
  
  // Write to both console and file
  console[level](logEntry.trim());
  fs.appendFileSync(logFile, logEntry);
}

export default logger;