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
            showSharedRefs: options.showSharedRefs ?? true
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
        container.className = 'object-inspector';
        
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

    private collectObjectRefs(value: InspectableValue, refs: Map<object, { id: number; count: number }>): void {
        if (value === null || typeof value !== 'object') return;
        
        const existing = refs.get(value);
        if (existing) {
            existing.count++;
            return;
        }
        
        refs.set(value, { id: refs.size + 1, count: 1 });
        
        if (Array.isArray(value)) {
            value.forEach(item => this.collectObjectRefs(item as InspectableValue, refs));
        } else if (isObjectWithKeys(value)) {
            Object.keys(value).forEach(key => {
                this.collectObjectRefs(value[key] as InspectableValue, refs);
            });
            
            if (this.options.showPrototype) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const proto = Object.getPrototypeOf(value);
                if (proto && proto !== Object.prototype) {
                    this.collectObjectRefs(proto as InspectableValue, refs);
                }
            }
        }
    }

    private renderNode(value: InspectableValue, key: string | number | null, depth: number, context: RenderContext): HTMLElement {
        // eslint-disable-next-line no-undef
        const node = document.createElement('div');
        node.className = 'inspector-node';

        // eslint-disable-next-line no-undef
        const row = document.createElement('div');
        row.className = 'inspector-row';

        // eslint-disable-next-line no-undef
        const toggle = document.createElement('span');
        toggle.className = 'inspector-toggle';

        const isExpandable = this.isExpandable(value);
        const autoExpand = depth < this.options.expandDepth;

        if (isExpandable) {
            if (autoExpand) {
                toggle.classList.add('expanded');
            }
            toggle.addEventListener('click', () => this.toggleExpand(toggle, node));
        } else {
            toggle.classList.add('empty');
        }

        row.appendChild(toggle);

        if (key !== null) {
            // eslint-disable-next-line no-undef
            const keySpan = document.createElement('span');
            keySpan.className = 'inspector-key';
            keySpan.textContent = this.formatKey(key);
            row.appendChild(keySpan);

            // eslint-disable-next-line no-undef
            const separator = document.createElement('span');
            separator.className = 'inspector-separator';
            separator.textContent = ': ';
            row.appendChild(separator);
        }

        const valueSpan = this.renderValue(value);
        row.appendChild(valueSpan);

        // Append row first
        node.appendChild(row);

        // Handle expandable values
        if (isExpandable) {
            const isCircular = (value !== null && typeof value === 'object') ? context.path.has(value) : false;
            const refInfo = (value !== null && typeof value === 'object') ? context.objectRefs.get(value) : undefined;
            const isShared = refInfo && refInfo.count > 1;

            if (isCircular) {
                // True circular reference
                // eslint-disable-next-line no-undef
                const circular = document.createElement('span');
                circular.className = 'inspector-circular';
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
                    shared.className = 'inspector-shared';
                    shared.textContent = ` <ref *${refInfo.id}>`;
                    shared.title = `This object appears ${refInfo.count} times`;
                    row.appendChild(shared);
                }

                // Render children with updated path
                const newContext: RenderContext = {
                    ...context,
                    path: value !== null && typeof value === 'object' ? new Set(context.path).add(value) : context.path
                };
                
                const children = this.renderChildren(value, depth + 1, newContext);
                if (autoExpand) {
                    children.classList.add('expanded');
                }
                node.appendChild(children);
            }
        }

        return node;
    }

    private renderValue(value: InspectableValue): HTMLElement {
        // eslint-disable-next-line no-undef
        const span = document.createElement('span');
        span.className = 'inspector-value';

        const type = this.getType(value);
        span.classList.add(type);

        switch (type) {
            case 'string':
                span.textContent = `"${this.escapeString(value as string)}"`;
                break;
            case 'number':
            case 'boolean':
                span.textContent = String(value as number | boolean);
                break;
            case 'null':
                span.textContent = 'null';
                break;
            case 'undefined':
                span.textContent = 'undefined';
                break;
            case 'function':
                span.textContent = this.formatFunction(value as (...args: unknown[]) => unknown);
                break;
            case 'symbol':
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
        preview.className = 'inspector-preview';

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
        children.className = 'inspector-children';

        if (isArray(value)) {
            value.forEach((item, index) => {
                const child = this.renderNode(item as InspectableValue, index, depth, context);
                children.appendChild(child);
            });
        } else if (isObjectWithKeys(value)) {
            let keys = Object.keys(value);
            if (this.options.sortKeys) {
                keys.sort();
            }

            keys.forEach(key => {
                const child = this.renderNode(value[key] as InspectableValue, key, depth, context);
                children.appendChild(child);
            });

            if (this.options.showPrototype) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const proto = Object.getPrototypeOf(value);
                if (proto && proto !== Object.prototype) {
                    const protoNode = this.renderNode(proto as InspectableValue, '__proto__', depth, context);
                    protoNode.classList.add('inspector-prototype');
                    children.appendChild(protoNode);
                }
            }
        }

        return children;
    }

    private toggleExpand(toggle: HTMLElement, node: HTMLElement): void {
        toggle.classList.toggle('expanded');
        const children = node.querySelector('.inspector-children');
        if (children) {
            children.classList.toggle('expanded');
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

    /**
     * Returns the CSS styles needed for the object inspector
     * Can be injected into the document or included in your stylesheet
     */
    public static getStyles(): string {
        return `
            .object-inspector {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background-color: #fff;
                padding: 0 8px;
                border-radius: 4px;
                overflow: auto;
            }

            .object-inspector * {
                box-sizing: border-box;
            }

            .inspector-node {
                margin: 0;
                padding: 0;
            }

            .inspector-row {
                display: flex;
                align-items: center;
                padding: 2px 0;
                position: relative;
            }

            .inspector-row:hover {
                background-color: #f0f0f0;
            }

            .inspector-toggle {
                width: 12px;
                height: 12px;
                margin-right: 4px;
                cursor: pointer;
                flex-shrink: 0;
                position: relative;
            }

            .inspector-toggle::before {
                content: '▶';
                position: absolute;
                top: -2px;
                left: 0;
                font-size: 10px;
                color: #666;
                transition: transform 0.1s ease;
            }

            .inspector-toggle.expanded::before {
                transform: rotate(90deg);
            }

            .inspector-toggle.empty {
                visibility: hidden;
            }

            .inspector-key {
                color: #881391;
                margin-right: 4px;
            }

            .inspector-separator {
                color: #666;
                margin-right: 4px;
            }

            .inspector-value {
                color: #1a1aa6;
            }

            .inspector-value.string {
                color: #c41a16;
            }

            .inspector-value.number {
                color: #1c00cf;
            }

            .inspector-value.boolean {
                color: #0d22aa;
            }

            .inspector-value.null,
            .inspector-value.undefined {
                color: #808080;
            }

            .inspector-value.function {
                color: #13a10e;
                font-style: italic;
            }

            .inspector-value.symbol {
                color: #c41a16;
                font-style: italic;
            }

            .inspector-preview {
                color: #666;
                font-style: italic;
                margin-left: 4px;
            }

            .inspector-children {
                margin-left: 16px;
                display: none;
            }

            .inspector-children.expanded {
                display: block;
            }

            .inspector-prototype {
                opacity: 0.6;
                font-style: italic;
            }

            .inspector-circular {
                color: #c41a16;
                font-style: italic;
            }

            .inspector-shared {
                color: #0066cc;
                font-size: 10px;
                font-style: italic;
                opacity: 0.7;
            }
        `;
    }

    /**
     * Utility method to inject styles into the document
     */
    public static injectStyles(): void {
        const styleId = 'object-inspector-styles';
        
        // eslint-disable-next-line no-undef
        if (!document.getElementById(styleId)) {
            // eslint-disable-next-line no-undef
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = ObjectInspector.getStyles();
            // eslint-disable-next-line no-undef
            document.head.appendChild(styleElement);
        }
    }
}
