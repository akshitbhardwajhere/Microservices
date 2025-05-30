// Import the winston library which helps us create and manage logs
const winston = require("winston");

// Create a new logger instance with specific configuration
const logger = winston.createLogger({
  // Set the logging level based on environment
  // In production, only show 'info' level and above
  // In development, show 'debug' level and above (more detailed)
  level: process.env.NODE_ENV === "production" ? "info" : "debug",

  // Configure how the log messages should be formatted
  format: winston.format.combine(
    // Add timestamp to each log entry
    winston.format.timestamp(),
    // Include full error stack traces when errors occur
    winston.format.errors({ stack: true }),
    // Enable string interpolation for log messages
    winston.format.splat(),
    // Convert log entries to JSON format
    winston.format.json()
  ),

  // Add default metadata to all log entries
  defaultMeta: { service: "api-gateway" },

  // Define where the logs should be sent (transports)
  transports: [
    // Send logs to console with colors for better readability
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Save error-level logs to error.log file
    new winston.transports.File({ filename: "error.log", level: "error" }),
    // Save all logs to combined.log file
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Export the logger so it can be used in other files
module.exports = logger;
