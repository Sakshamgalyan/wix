const { info } = require('console');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../logs/app.log');

function log(level, message) {
    if (!['info', 'error', 'warn'].includes(level)) {
        throw new Error('Invalid log level. Use "info", "error", or "warn".');
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()} : ${message}\n`;

    fs.appendFileSync(logFile, logEntry);
    console[level](logEntry.trim());
}

module.exports = {
    info: (message) => log('info', message),
    error: (message) => log('error', message),
    warn: (message) => log('warn', message),
}