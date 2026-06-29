// Logger utility — uses console for compatibility without winston dependency.
export const logger = {
    info: (message: string, ...args: unknown[]) => console.log(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => console.error(`[ERROR] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => console.debug(`[DEBUG] ${message}`, ...args),
};

export default logger;
