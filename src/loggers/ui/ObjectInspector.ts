/**
 * Object Inspector Library
 * A zero-dependency library for rendering JavaScript objects in a collapsible tree structure
 * Copyright (c) 2025 Milorad Filipovic
 */

export interface ObjectInspectorOptions {
    /** Number of levels to auto-expand (default: 1) */
    expandDepth?: number;
    /** Show __proto__ property (default: false) */
    showPrototype?: boolean;
    /** Sort object keys alphabetically (default: false) */
    sortKeys?: boolean;
    /** Show indicators for shared references (default: true) */
    showSharedRefs?: boolean;
    /** Maximum recursion depth to prevent stack overflow (default: 100) */
    maxDepth?: number;
}

type ValueType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 
                 'function' | 'symbol' | 'array' | 'object';

// Union type for all possible values that can be inspected
type InspectableValue = 
    | string 
    | number 
    | boolean 
    | null 
    | undefined 
    | symbol 
    | ((...args: unknown[]) => unknown) 
    | object 
    | unknown[];

// Type guard functions for InspectableValue
const isObjectWithKeys = (value: InspectableValue): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const isArray = (value: InspectableValue): value is unknown[] => {
    return Array.isArray(value);
};

interface RenderContext {
    /** Current traversal path to detect circular references */
    path: Set<object>;
    /** Map to track all object references and assign IDs */
    objectRefs: Map<object, { id: number; count: number }>;
    /** Counter for object reference IDs */
    refIdCounter: number;
}

export class ObjectInspector {
    private options: Required<ObjectInspectorOptions>;

    constructor(options: ObjectInspectorOptions = {}) {
        this.options = {
            expandDepth: options.expandDepth ?? 1,
            showPrototype: options.showPrototype ?? false,
            sortKeys: options.sortKeys ?? false,
            showSharedRefs: options.showSharedRefs ?? true,
            maxDepth: options.maxDepth ?? 100
        };
    }

    /**
     * Renders an object as an interactive DOM element
     * @param obj The object to render
     * @param key Optional key name for the root object
     * @param depth Starting depth (used internally)
     * @returns HTMLElement containing the rendered object inspector
     */
    public render(obj: InspectableValue, key: string | number | null = null, depth: number = 0): HTMLElement {
        // eslint-disable-next-line no-undef
        const container = document.createElement('div');
        container.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
        container.style.fontSize = "12px";
        container.style.lineHeight = "1.4";
        container.style.color = "#333";
        container.style.backgroundColor = "#fff";
        container.style.padding = "0 8px";
        container.style.borderRadius = "4px";
        container.style.overflow = "auto";
        container.style.boxSizing = "border-box";
        
        // Initialize render context
        const context: RenderContext = {
            path: new Set(),
            objectRefs: new Map(),
            refIdCounter: 1
        };
        
        // First pass: collect all object references
        if (this.options.showSharedRefs) {
            this.collectObjectRefs(obj, context.objectRefs);
        }
        
        const node = this.renderNode(obj, key, depth, context);
        container.appendChild(node);
        
        return container;
    }

    private collectObjectRefs(value: InspectableValue, refs: Map<object, { id: number; count: number }>, visited: Set<object> = new Set()): void {
        if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
        
        // Prevent infinite loops by checking if we've already visited this object
        if (visited.has(value)) {
            // If we've seen this object before in this traversal, just increment count if it's in refs
            const existing = refs.get(value);
            if (existing) {
                existing.count++;
            }
            return;
        }
        
        // Add to visited set to prevent revisiting during this traversal
        visited.add(value);
        
        const existing = refs.get(value);
        if (existing) {
            existing.count++;
        } else {
            refs.set(value, { id: refs.size + 1, count: 1 });
        }
        
        if (Array.isArray(value)) {
            value.forEach(item => this.collectObjectRefs(item as InspectableValue, refs, visited));
        } else if (isObjectWithKeys(value) || typeof value === 'function') {
            // Handle both objects and functions (functions can have properties)
            try {
                Object.keys(value).forEach(key => {
                    try {
                        const propValue = (value as Record<string, unknown>)[key];
                        this.collectObjectRefs(propValue as InspectableValue, refs, visited);
                    } catch {
                        // Skip properties that throw errors when accessed
                    }
                });
            } catch {
                // Skip objects where Object.keys() throws
            }
            
            if (this.options.showPrototype) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const proto = Object.getPrototypeOf(value);
                    if (proto && proto !== Object.prototype && proto !== Function.prototype) {
                        this.collectObjectRefs(proto as InspectableValue, refs, visited);
                    }
                } catch {
                    // Skip prototype if getPrototypeOf throws
                }
            }
        }
    }

    private renderNode(value: InspectableValue, key: string | number | null, depth: number, context: RenderContext): HTMLElement {
        // eslint-disable-next-line no-undef
        const node = document.createElement('div');
        node.style.margin = "0";
        node.style.padding = "0";

        // Prevent stack overflow by limiting maximum depth
        if (depth > this.options.maxDepth) {
            // eslint-disable-next-line no-undef
            const row = document.createElement('div');
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.padding = "2px 0";
            row.style.position = "relative";
            row.onmouseenter = (): void => { row.style.backgroundColor = "#f0f0f0"; };
            row.onmouseleave = (): void => { row.style.backgroundColor = "transparent"; };
            
            if (key !== null) {
                // eslint-disable-next-line no-undef
                const keySpan = document.createElement('span');
                keySpan.style.color = "#881391";
                keySpan.style.marginRight = "4px";
                keySpan.textContent = this.formatKey(key);
                row.appendChild(keySpan);

                // eslint-disable-next-line no-undef
                const separator = document.createElement('span');
                separator.style.color = "#666";
                separator.style.marginRight = "4px";
                separator.textContent = ': ';
                row.appendChild(separator);
            }

            // eslint-disable-next-line no-undef
            const maxDepthSpan = document.createElement('span');
            maxDepthSpan.textContent = '[Maximum depth reached]';
            maxDepthSpan.style.color = '#999';
            maxDepthSpan.style.fontStyle = 'italic';
            row.appendChild(maxDepthSpan);
            
            node.appendChild(row);
            return node;
        }

        // eslint-disable-next-line no-undef
        const row = document.createElement('div');
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.padding = "2px 0";
        row.style.position = "relative";
        row.onmouseenter = (): void => { row.style.backgroundColor = "#f0f0f0"; };
        row.onmouseleave = (): void => { row.style.backgroundColor = "transparent"; };

        // eslint-disable-next-line no-undef
        const toggle = document.createElement('span');
        toggle.style.width = "12px";
        toggle.style.height = "12px";
        toggle.style.cursor = "pointer";
        toggle.style.flexShrink = "0";
        toggle.style.position = "relative";

        const isExpandable = this.isExpandable(value);
        const autoExpand = depth < this.options.expandDepth;

        if (isExpandable) {
            toggle.style.top = autoExpand ? "0" : "-2px";
            // eslint-disable-next-line no-undef
            const arrow = document.createElement('span');
            arrow.textContent = '▶';
            arrow.style.position = "absolute";
            arrow.style.left = "0";
            arrow.style.fontSize = "10px";
            arrow.style.color = "#666";
            arrow.style.transition = "transform 0.1s ease";
            arrow.style.transform = autoExpand ? "rotate(90deg)" : "rotate(0deg)";
            toggle.appendChild(arrow);
            toggle.addEventListener('click', () => this.toggleExpand(toggle, node));
        } else {
            toggle.style.visibility = "hidden";
        }

        row.appendChild(toggle);

        if (key !== null) {
            // eslint-disable-next-line no-undef
            const keySpan = document.createElement('span');
            keySpan.style.color = "#881391";
            keySpan.style.marginRight = "4px";
            keySpan.textContent = this.formatKey(key);
            row.appendChild(keySpan);

            // eslint-disable-next-line no-undef
            const separator = document.createElement('span');
            separator.style.color = "#666";
            separator.style.marginRight = "4px";
            separator.textContent = ': ';
            row.appendChild(separator);
        }

        const valueSpan = this.renderValue(value);
        row.appendChild(valueSpan);

        // Append row first
        node.appendChild(row);

        // Handle expandable values
        if (isExpandable) {
            const isCircular = ((value !== null && typeof value === 'object') || typeof value === 'function') ? context.path.has(value) : false;
            const refInfo = (value !== null && typeof value === 'object') ? context.objectRefs.get(value) : undefined;
            const isShared = refInfo && refInfo.count > 1;

            if (isCircular) {
                // True circular reference
                // eslint-disable-next-line no-undef
                const circular = document.createElement('span');
                circular.style.color = "#c41a16";
                circular.style.fontStyle = "italic";
                circular.textContent = ' [Circular]';
                row.appendChild(circular);
            } else {
                // Add preview for non-circular objects
                if (value !== null && typeof value === 'object') {
                    const preview = this.renderPreview(value);
                    if (preview) {
                        row.appendChild(preview);
                    }
                }

                // Show shared reference indicator
                if (this.options.showSharedRefs && isShared) {
                    // eslint-disable-next-line no-undef
                    const shared = document.createElement('span');
                    shared.style.color = "#0066cc";
                    shared.style.fontSize = "10px";
                    shared.style.opacity = "0.7";
                    shared.style.marginLeft = "4px";
                    shared.textContent = ` <ref *${refInfo.id}>`;
                    shared.title = `This object appears ${refInfo.count} times`;
                    row.appendChild(shared);
                }

                // Render children with updated path
                const newContext: RenderContext = {
                    ...context,
                    path: (value !== null && typeof value === 'object') || typeof value === 'function' ? new Set(context.path).add(value) : context.path
                };
                
                const children = this.renderChildren(value, depth + 1, newContext);
                if (autoExpand) {
                    children.style.display = 'block';
                }
                node.appendChild(children);
            }
        }

        return node;
    }

    private renderValue(value: InspectableValue): HTMLElement {
        // eslint-disable-next-line no-undef
        const span = document.createElement('span');
        span.style.color = "#1a1aa6"; // default color

        const type = this.getType(value);

        switch (type) {
            case 'string':
                span.style.color = "#c41a16";
                span.textContent = `"${this.escapeString(value as string)}"`;
                break;
            case 'number':
                span.style.color = "#1c00cf";
                span.textContent = String(value as number | boolean);
                break;
            case 'boolean':
                span.style.color = "#0d22aa";
                span.textContent = String(value as number | boolean);
                break;
            case 'null':
            case 'undefined':
                span.style.color = "#808080";
                span.textContent = type;
                break;
            case 'function':
                span.style.color = "#13a10e";
                span.style.fontStyle = "italic";
                span.textContent = this.formatFunction(value as (...args: unknown[]) => unknown);
                break;
            case 'symbol':
                span.style.color = "#c41a16";
                span.style.fontStyle = "italic";
                span.textContent = (value as symbol).toString();
                break;
            case 'array':
                span.textContent = `Array(${(value as unknown[]).length})`;
                break;
            case 'object': {
                const objValue = value as Record<string, unknown>;
                const constructor = (objValue.constructor as { name?: string })?.name;
                if (constructor && constructor !== 'Object') {
                    span.textContent = constructor;
                } else {
                    span.textContent = 'Object';
                }
                break;
            }
            default:
                if (value == null) {
                    span.textContent = '';
                } else if (typeof value === 'object') {
                    span.textContent = '[object]';
                } else {
                    span.textContent = String(value);
                }
        }

        return span;
    }

    private renderPreview(value: InspectableValue): HTMLElement | null {
        // eslint-disable-next-line no-undef
        const preview = document.createElement('span');
        preview.style.color = "#666";
        preview.style.fontStyle = "italic";
        preview.style.marginLeft = "4px";

        if (isArray(value)) {
            if (value.length === 0) {
                preview.textContent = ' []';
            } else {
                const items = value.slice(0, 3).map(v => this.formatPreviewValue(v as InspectableValue));
                if (value.length > 3) items.push('...');
                preview.textContent = ` [${items.join(', ')}]`;
            }
        } else if (isObjectWithKeys(value)) {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                preview.textContent = ' {}';
            } else {
                const items = keys.slice(0, 3).map(k => `${k}: ${this.formatPreviewValue(value[k] as InspectableValue)}`);
                if (keys.length > 3) items.push('...');
                preview.textContent = ` {${items.join(', ')}}`;
            }
        } else {
            return null;
        }

        return preview;
    }

    private renderChildren(value: InspectableValue, depth: number, context: RenderContext): HTMLElement {
        // eslint-disable-next-line no-undef
        const children = document.createElement('div');
        children.style.marginLeft = "16px";
        children.style.display = "none";

        if (isArray(value)) {
            value.forEach((item, index) => {
                const child = this.renderNode(item as InspectableValue, index, depth, context);
                children.appendChild(child);
            });
        } else if (isObjectWithKeys(value) || typeof value === 'function') {
            // Handle both objects and functions (functions can have properties)
            try {
                let keys = Object.keys(value);
                if (this.options.sortKeys) {
                    keys.sort();
                }

                keys.forEach(key => {
                    try {
                        const propValue = (value as Record<string, unknown>)[key];
                        const child = this.renderNode(propValue as InspectableValue, key, depth, context);
                        children.appendChild(child);
                    } catch {
                        // Render error placeholder for properties that throw
                        // eslint-disable-next-line no-undef
                        const errorChild = document.createElement('div');
                        errorChild.style.margin = "0";
                        errorChild.style.padding = "0";
                        
                        // eslint-disable-next-line no-undef
                        const errorRow = document.createElement('div');
                        errorRow.style.display = "flex";
                        errorRow.style.alignItems = "center";
                        errorRow.style.padding = "2px 0";
                        errorRow.style.position = "relative";
                        errorRow.onmouseenter = (): void => { errorRow.style.backgroundColor = "#f0f0f0"; };
                        errorRow.onmouseleave = (): void => { errorRow.style.backgroundColor = "transparent"; };
                        
                        // eslint-disable-next-line no-undef
                        const keySpan = document.createElement('span');
                        keySpan.style.color = "#881391";
                        keySpan.style.marginRight = "4px";
                        keySpan.textContent = this.formatKey(key);
                        errorRow.appendChild(keySpan);
                        
                        // eslint-disable-next-line no-undef
                        const separator = document.createElement('span');
                        separator.style.color = "#666";
                        separator.style.marginRight = "4px";
                        separator.textContent = ': ';
                        errorRow.appendChild(separator);
                        
                        // eslint-disable-next-line no-undef
                        const errorSpan = document.createElement('span');
                        errorSpan.style.color = "#c41a16";
                        errorSpan.style.fontStyle = "italic";
                        errorSpan.textContent = '[Error accessing property]';
                        errorRow.appendChild(errorSpan);
                        
                        errorChild.appendChild(errorRow);
                        children.appendChild(errorChild);
                    }
                });
            } catch {
                // Don't render anything if Object.keys() throws
            }

            if (this.options.showPrototype) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const proto = Object.getPrototypeOf(value);
                    if (proto && proto !== Object.prototype && proto !== Function.prototype) {
                        const protoNode = this.renderNode(proto as InspectableValue, '__proto__', depth, context);
                        protoNode.style.opacity = "0.6";
                        protoNode.style.fontStyle = "italic";
                        children.appendChild(protoNode);
                    }
                } catch {
                    // Skip prototype if getPrototypeOf throws
                }
            }
        }

        return children;
    }

    private toggleExpand(toggle: HTMLElement, node: HTMLElement): void {
        const arrow = toggle.querySelector('span');
        const children = node.querySelector('div:last-child') as HTMLElement;
        
        if (arrow && children) {
            const isExpanded = children.style.display === 'block';
            children.style.display = isExpanded ? 'none' : 'block';
            arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
        }
    }

    private isExpandable(value: InspectableValue): boolean {
        return value !== null && (typeof value === 'object' || typeof value === 'function');
    }

    private getType(value: InspectableValue): ValueType {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        const type = typeof value;
        return type as ValueType;
    }

    private formatKey(key: string | number): string {
        if (typeof key === 'string' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
            return key;
        }
        return JSON.stringify(key);
    }

    private formatFunction(fn: (...args: unknown[]) => unknown): string {
        const str = fn.toString();
        const match = str.match(/^(async\s+)?(?:function\s*)?([^(]*)\(/);
        if (match) {
            const async = match[1] || '';
            const name = match[2].trim() || 'anonymous';
            return `${async}ƒ ${name}()`;
        }
        return 'ƒ()';
    }

    private escapeString(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    private formatPreviewValue(value: InspectableValue): string {
        const type = this.getType(value);
        switch (type) {
            case 'string': {
                const escaped = this.escapeString(value as string);
                return `"${escaped.length > 10 ? escaped.substring(0, 10) + '...' : escaped}"`;
            }
            case 'number':
            case 'boolean':
                return String(value as number | boolean);
            case 'null':
                return 'null';
            case 'undefined':
                return 'undefined';
            case 'function':
                return 'ƒ';
            case 'symbol':
                return 'Symbol';
            case 'array':
                return `Array(${(value as unknown[]).length})`;
            case 'object':
                return '{…}';
            default:
                return '…';
        }
    }

}
