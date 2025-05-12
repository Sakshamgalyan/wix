// src/backend/utils/logger.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure log directory
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

// Enhanced logger with request context support
const createLogger = (reqContext = {}) => {
  return {
    info: (message, data) => writeLog('info', message, data, reqContext),
    error: (message, data) => writeLog('error', message, data, reqContext),
    warn: (message, data) => writeLog('warn', message, data, reqContext),
    debug: (message, data) => writeLog('debug', message, data, reqContext),
    // Change from withContext to child for compatibility
    child: (newContext) => createLogger({ ...reqContext, ...newContext })
  };
};

function writeLog(level, message, data = {}, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
    ...data
  };

  // Stringify for file output
  const logString = JSON.stringify(logEntry) + '\n';
  
  // Write to console (pretty-printed)
  console[level](JSON.stringify(logEntry, null, 2));
  
  // Append to file
  fs.appendFileSync(logFile, logString);
}

// Default logger instance
const logger = createLogger();

export default logger;