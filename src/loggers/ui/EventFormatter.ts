/**
 * Utility class for formatting event details in the UI logger
 */
export class EventFormatter {
    /**
     * Formats a key for display in the event details
     * @param key - The key to format (can be symbol, string, or other types)
     * @returns Formatted string representation of the key
     */
    static formatKey(key: unknown): string {
        if (typeof key === 'symbol') {
            return key.toString();
        }
        if (typeof key === 'string') {
            return `"${key}"`;
        }
        return String(key);
    }

    /**
     * Formats a target object for display in the event details
     * @param target - The target object to format
     * @returns Formatted string representation of the target
     */
    static formatTarget(target: unknown): string {
        if (!target) return 'undefined';
        
        try {
            if (typeof target === 'object' && target !== null && 'constructor' in target) {
                const constructor = (target as { constructor?: { name?: string } }).constructor;
                if (constructor && typeof constructor.name === 'string') {
                    return constructor.name;
                }
            }
            return Object.prototype.toString.call(target).slice(8, -1);
        } catch {
            return 'Unknown Object';
        }
    }

    /**
     * Formats a value for display in the event details
     * @param value - The value to format (can be any type)
     * @returns Formatted string representation of the value
     */
    static formatValue(value: unknown): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        try {
            if (typeof value === 'string') {
                return `"${value}"`;
            }
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    return `Array(${value.length})`;
                }
                return JSON.stringify(value, null, 2);
            }
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            if (typeof value === 'function') {
                return '[Function]';
            }
            if (typeof value === 'symbol') {
                return value.toString();
            }
            return '[Object]';
        } catch {
            return '[Object]';
        }
    }
}