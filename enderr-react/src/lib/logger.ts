/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from "console-log-colors";

/**
 * Creates a colored logger function
 * @remarks
 * - Only logs in development environment
 * - Uses console-log-colors for colored output
 * - Properly formats objects and arrays
 *
 * @param colorFn - Color function from console-log-colors
 * @returns Logger function that applies color to messages
 */
function createLogger(colorFn: any) {
  return (...messages: any[]) => {
    if (import.meta.env.DEV) {
      // Format each message properly
      const formattedMessages = messages.map((msg) =>
        typeof msg === "object" ? JSON.stringify(msg, null, 2) : String(msg)
      );

      // Join messages with space and apply color
      if (formattedMessages.length > 0) {
        const coloredMessage = colorFn(formattedMessages.join(" "));
        if (coloredMessage) {
          // eslint-disable-next-line no-console
          console.log(coloredMessage);
        }
      }
    }
  };
}

const logger = {
  success: createLogger(log.greenBright),
  warn: createLogger(log.yellowBright),
  error: createLogger(log.redBright),
  info: createLogger(log.blueBright), // typically info is blue
  log: createLogger(log.white), // normal log messages with no color
  debug: createLogger(log.gray),
};

export default logger;
