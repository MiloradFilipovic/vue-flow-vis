/**
 * Object Inspector Library
 * A zero-dependency library for rendering JavaScript objects in a collapsible tree structure
 * Copyright (c) 2025 Milorad Filipovic
 */

import { objectInspectorTheme } from './themes/objectInspector.flowvis.theme';
import { objectInspectorStrings } from './ObjectInspector.strings';

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export interface ObjectInspectorOptions {
    /** Number of levels to auto-expand (default: 1) */
    expandDepth?: number;
    /** Show __proto__ property (default: false) */
    showPrototype?: boolean;
    /** Sort object keys alphabetically (default: false) */
    sortKeys?: boolean;
    /** Show indicators for shared references (default: true) */
    showSharedRefs?: boolean;
    /** Maximum recursion depth to prevent stack overflow (1-30, default: 10) */
    maxDepth?: IntRange<1, 31>;
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

interface LazyRenderData {
    value: InspectableValue;
    context: RenderContext;
    depth: number;
}

export class ObjectInspector {
    private options: Required<ObjectInspectorOptions>;
    private lazyDataMap = new WeakMap<HTMLElement, LazyRenderData>();

    constructor(options: ObjectInspectorOptions = {}) {
        this.options = {
            expandDepth: options.expandDepth ?? 1,
            showPrototype: options.showPrototype ?? false,
            sortKeys: options.sortKeys ?? false,
            showSharedRefs: options.showSharedRefs ?? true,
            maxDepth: options.maxDepth ?? 10
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
        container.id = 'object-inspector';
        container.style.fontFamily = objectInspectorTheme.fonts.primary;
        container.style.fontSize = objectInspectorTheme.fontSizes.base;
        container.style.lineHeight = objectInspectorTheme.lineHeight;
        container.style.color = objectInspectorTheme.colors.primaryText;
        container.style.backgroundColor = objectInspectorTheme.colors.containerBackground;
        container.style.padding = `${objectInspectorTheme.spacing.none} ${objectInspectorTheme.spacing.md}`;
        container.style.borderRadius = objectInspectorTheme.borderRadius.sm;
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

    private collectObjectRefs(value: InspectableValue, refs: Map<object, { id: number; count: number }>, visited: Set<object> = new Set(), depth: number = 0): void {
        if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
        
        // Limit depth to prevent exponential complexity - only collect refs up to maxDepth + 1
        if (depth > this.options.maxDepth + 1) return;
        
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
            // Limit array traversal for performance
            const maxItems = depth > this.options.maxDepth - 2 ? Math.min(value.length, 10) : value.length;
            for (let i = 0; i < maxItems; i++) {
                this.collectObjectRefs(value[i] as InspectableValue, refs, visited, depth + 1);
            }
        } else if (isObjectWithKeys(value) || typeof value === 'function') {
            // Handle both objects and functions (functions can have properties)
            try {
                const keys = Object.keys(value);
                // Limit key traversal for performance at deeper levels
                const maxKeys = depth > this.options.maxDepth - 2 ? Math.min(keys.length, 20) : keys.length;
                
                for (let i = 0; i < maxKeys; i++) {
                    const key = keys[i];
                    try {
                        const propValue = (value as Record<string, unknown>)[key];
                        this.collectObjectRefs(propValue as InspectableValue, refs, visited, depth + 1);
                    } catch {
                        // Skip properties that throw errors when accessed
                    }
                }
            } catch {
                // Skip objects where Object.keys() throws
            }
            
            if (this.options.showPrototype && depth < this.options.maxDepth) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const proto = Object.getPrototypeOf(value);
                    if (proto && proto !== Object.prototype && proto !== Function.prototype) {
                        this.collectObjectRefs(proto as InspectableValue, refs, visited, depth + 1);
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
        node.style.margin = objectInspectorTheme.spacing.none;
        node.style.padding = objectInspectorTheme.spacing.none;

        // Prevent stack overflow by limiting maximum depth
        // FIXME: Becomes slow for depths > 10
        if (depth > this.options.maxDepth) {
            // eslint-disable-next-line no-undef
            const row = document.createElement('div');
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.padding = objectInspectorTheme.spacing.xs;
            row.style.position = "relative";
            row.onmouseenter = (): void => { row.style.backgroundColor = objectInspectorTheme.colors.rowHoverBackground; };
            row.onmouseleave = (): void => { row.style.backgroundColor = "transparent"; };
            
            if (key !== null) {
                // eslint-disable-next-line no-undef
                const keySpan = document.createElement('span');
                keySpan.style.color = objectInspectorTheme.colors.keyColor;
                keySpan.style.marginRight = objectInspectorTheme.spacing.sm;
                keySpan.textContent = this.formatKey(key);
                row.appendChild(keySpan);

                // eslint-disable-next-line no-undef
                const separator = document.createElement('span');
                separator.style.color = objectInspectorTheme.colors.separatorColor;
                separator.style.marginRight = objectInspectorTheme.spacing.sm;
                separator.textContent = objectInspectorStrings.separator;
                row.appendChild(separator);
            }

            // eslint-disable-next-line no-undef
            const maxDepthSpan = document.createElement('span');
            maxDepthSpan.textContent = objectInspectorStrings.maxDepthReached;
            maxDepthSpan.style.color = objectInspectorTheme.colors.maxDepthColor;
            maxDepthSpan.style.fontStyle = 'italic';
            row.appendChild(maxDepthSpan);
            
            node.appendChild(row);
            return node;
        }

        // eslint-disable-next-line no-undef
        const row = document.createElement('div');
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.padding = objectInspectorTheme.spacing.xs;
        row.style.position = "relative";
        row.onmouseenter = (): void => { row.style.backgroundColor = objectInspectorTheme.colors.rowHoverBackground; };
        row.onmouseleave = (): void => { row.style.backgroundColor = "transparent"; };

        // eslint-disable-next-line no-undef
        const toggle = document.createElement('span');
        toggle.style.width = objectInspectorTheme.layout.arrowSize;
        toggle.style.height = objectInspectorTheme.layout.arrowSize;
        toggle.style.cursor = "pointer";
        toggle.style.flexShrink = "0";
        toggle.style.position = "relative";

        const isExpandable = this.isExpandable(value);
        const autoExpand = depth < this.options.expandDepth;

        if (isExpandable) {
            // eslint-disable-next-line no-undef
            const arrow = document.createElement('span');
            arrow.textContent = objectInspectorStrings.expandArrow;
            arrow.style.position = "absolute";
            arrow.style.width = objectInspectorTheme.layout.arrowSize;
            arrow.style.height = objectInspectorTheme.layout.arrowSize;
            arrow.style.display = "flex";
            arrow.style.justifyContent = "center";
            arrow.style.alignItems = "center";
            arrow.style.left = "0";
            arrow.style.top = autoExpand ? "1px" : "0";
            arrow.style.lineHeight = "1";
            arrow.style.fontSize = objectInspectorTheme.fontSizes.small;
            arrow.style.color = objectInspectorTheme.colors.arrowColor;
            arrow.style.transformOrigin = "center";
            arrow.style.transition = objectInspectorTheme.transitions.fast;
            arrow.style.transform = autoExpand ? "rotate(90deg)" : "rotate(0deg)";
            arrow.style.userSelect = "none";
            toggle.appendChild(arrow);
            toggle.addEventListener('click', () => this.toggleExpand(toggle, node));
        } else {
            toggle.style.visibility = "hidden";
        }

        row.appendChild(toggle);

        if (key !== null) {
            // eslint-disable-next-line no-undef
            const keySpan = document.createElement('span');
            keySpan.style.color = objectInspectorTheme.colors.keyColor;
            keySpan.style.marginRight = objectInspectorTheme.spacing.sm;
            keySpan.textContent = this.formatKey(key);
            row.appendChild(keySpan);

            // eslint-disable-next-line no-undef
            const separator = document.createElement('span');
            separator.style.color = objectInspectorTheme.colors.separatorColor;
            separator.style.marginRight = objectInspectorTheme.spacing.sm;
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
                circular.style.color = objectInspectorTheme.colors.circularRefColor;
                circular.textContent = objectInspectorStrings.circularReference;
                circular.style.marginLeft = objectInspectorTheme.spacing.sm;
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
                    shared.style.color = objectInspectorTheme.colors.sharedRefColor;
                    shared.style.fontSize = objectInspectorTheme.fontSizes.small;
                    shared.style.opacity = objectInspectorTheme.opacity.sharedRef;
                    shared.style.marginLeft = objectInspectorTheme.spacing.sm;
                    shared.textContent = `${objectInspectorStrings.refPrefix}${refInfo.id}${objectInspectorStrings.refSuffix}`;
                    shared.title = `${objectInspectorStrings.refCountPrefix}${refInfo.count}${objectInspectorStrings.refCountSuffix}`;
                    row.appendChild(shared);
                }

                // Create placeholder for lazy rendering - don't render children until expanded
                // eslint-disable-next-line no-undef
                const childrenPlaceholder = document.createElement('div');
                childrenPlaceholder.style.marginLeft = objectInspectorTheme.layout.indentSize;
                childrenPlaceholder.style.display = autoExpand ? 'block' : 'none';
                childrenPlaceholder.dataset.lazy = 'true';
                childrenPlaceholder.dataset.depth = String(depth + 1);
                
                // Store the lazy render data properly typed
                const lazyData: LazyRenderData = {
                    value,
                    context: {
                        ...context,
                        path: (value !== null && typeof value === 'object') || typeof value === 'function' ? new Set(context.path).add(value) : context.path
                    },
                    depth: depth + 1
                };
                
                // Store the lazy data using a WeakMap for proper cleanup
                this.lazyDataMap.set(childrenPlaceholder, lazyData);
                
                // If auto-expanded, render immediately but with limits
                if (autoExpand) {
                    this.renderChildrenLazy(childrenPlaceholder, lazyData.value, lazyData.depth, lazyData.context);
                }
                
                node.appendChild(childrenPlaceholder);
            }
        }

        return node;
    }

    private renderValue(value: InspectableValue): HTMLElement {
        // eslint-disable-next-line no-undef
        const span = document.createElement('span');
        span.style.color = objectInspectorTheme.colors.defaultValueColor; // default color

        const type = this.getType(value);

        switch (type) {
            case 'string':
                span.style.color = objectInspectorTheme.colors.stringColor;
                span.textContent = `"${this.escapeString(value as string)}"`;
                break;
            case 'number':
                span.style.color = objectInspectorTheme.colors.numberColor;
                span.textContent = String(value as number | boolean);
                break;
            case 'boolean':
                span.style.color = objectInspectorTheme.colors.booleanColor;
                span.textContent = String(value as number | boolean);
                break;
            case 'null':
            case 'undefined':
                span.style.color = objectInspectorTheme.colors.nullUndefinedColor;
                span.textContent = type;
                break;
            case 'function':
                span.style.color = objectInspectorTheme.colors.functionColor;
                span.style.fontStyle = "italic";
                span.textContent = this.formatFunction(value as (...args: unknown[]) => unknown);
                break;
            case 'symbol':
                span.style.color = objectInspectorTheme.colors.symbolColor;
                span.style.fontStyle = "italic";
                span.textContent = (value as symbol).toString();
                break;
            case 'array':
                span.textContent = `${objectInspectorStrings.arrayPrefix}${(value as unknown[]).length}${objectInspectorStrings.arraySuffix}`;
                break;
            case 'object': {
                const objValue = value as Record<string, unknown>;
                const constructor = (objValue.constructor as { name?: string })?.name;
                if (constructor && constructor !== 'Object') {
                    span.textContent = constructor;
                } else {
                    span.textContent = objectInspectorStrings.objectLabel;
                }
                break;
            }
            default:
                if (value == null) {
                    span.textContent = '';
                } else if (typeof value === 'object') {
                    span.textContent = objectInspectorStrings.objectFallback;
                } else {
                    span.textContent = String(value);
                }
        }

        return span;
    }

    private renderPreview(value: InspectableValue): HTMLElement | null {
        // eslint-disable-next-line no-undef
        const preview = document.createElement('span');
        preview.style.color = objectInspectorTheme.colors.previewColor;
        preview.style.fontStyle = "italic";
        preview.style.marginLeft = objectInspectorTheme.spacing.sm;

        if (isArray(value)) {
            if (value.length === 0) {
                preview.textContent = objectInspectorStrings.emptyArray;
            } else {
                const items = value.slice(0, 3).map(v => this.formatPreviewValue(v as InspectableValue));
                if (value.length > 3) items.push(objectInspectorStrings.previewEllipsis);
                preview.textContent = ` [${items.join(', ')}]`;
            }
        } else if (isObjectWithKeys(value)) {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                preview.textContent = objectInspectorStrings.emptyObject;
            } else {
                const items = keys.slice(0, 3).map(k => `${k}: ${this.formatPreviewValue(value[k] as InspectableValue)}`);
                if (keys.length > 3) items.push(objectInspectorStrings.previewEllipsis);
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
        children.style.marginLeft = objectInspectorTheme.layout.indentSize;
        children.style.display = "none";

        if (isArray(value)) {
            // Limit array rendering at deep levels to prevent performance issues
            const maxItems = depth > this.options.maxDepth - 2 ? Math.min(value.length, 50) : value.length;
            
            for (let i = 0; i < maxItems; i++) {
                const child = this.renderNode(value[i] as InspectableValue, i, depth, context);
                children.appendChild(child);
            }
            
            // Show truncation indicator if we've limited the items
            if (maxItems < value.length) {
                // eslint-disable-next-line no-undef
                const truncated = document.createElement('div');
                truncated.style.padding = objectInspectorTheme.spacing.xs;
                truncated.style.color = objectInspectorTheme.colors.maxDepthColor;
                truncated.style.fontStyle = 'italic';
                truncated.textContent = `... ${value.length - maxItems} more items`;
                children.appendChild(truncated);
            }
        } else if (isObjectWithKeys(value) || typeof value === 'function') {
            // Handle both objects and functions (functions can have properties)
            try {
                let keys = Object.keys(value);
                if (this.options.sortKeys) {
                    keys.sort();
                }

                // Limit key rendering at deep levels to prevent performance issues
                const maxKeys = depth > this.options.maxDepth - 2 ? Math.min(keys.length, 100) : keys.length;

                for (let i = 0; i < maxKeys; i++) {
                    const key = keys[i];
                    try {
                        const propValue = (value as Record<string, unknown>)[key];
                        const child = this.renderNode(propValue as InspectableValue, key, depth, context);
                        children.appendChild(child);
                    } catch {
                        // Render error placeholder for properties that throw
                        // eslint-disable-next-line no-undef
                        const errorChild = document.createElement('div');
                        errorChild.style.margin = objectInspectorTheme.spacing.none;
                        errorChild.style.padding = objectInspectorTheme.spacing.none;
                        
                        // eslint-disable-next-line no-undef
                        const errorRow = document.createElement('div');
                        errorRow.style.display = "flex";
                        errorRow.style.alignItems = "center";
                        errorRow.style.padding = objectInspectorTheme.spacing.xs;
                        errorRow.style.position = "relative";
                        errorRow.onmouseenter = (): void => { errorRow.style.backgroundColor = objectInspectorTheme.colors.rowHoverBackground; };
                        errorRow.onmouseleave = (): void => { errorRow.style.backgroundColor = "transparent"; };
                        
                        // eslint-disable-next-line no-undef
                        const keySpan = document.createElement('span');
                        keySpan.style.color = objectInspectorTheme.colors.keyColor;
                        keySpan.style.marginRight = objectInspectorTheme.spacing.sm;
                        keySpan.textContent = this.formatKey(key);
                        errorRow.appendChild(keySpan);
                        
                        // eslint-disable-next-line no-undef
                        const separator = document.createElement('span');
                        separator.style.color = objectInspectorTheme.colors.separatorColor;
                        separator.style.marginRight = objectInspectorTheme.spacing.sm;
                        separator.textContent = objectInspectorStrings.separator;
                        errorRow.appendChild(separator);
                        
                        // eslint-disable-next-line no-undef
                        const errorSpan = document.createElement('span');
                        errorSpan.style.color = objectInspectorTheme.colors.errorColor;
                        errorSpan.style.fontStyle = "italic";
                        errorSpan.textContent = objectInspectorStrings.errorAccessingProperty;
                        errorRow.appendChild(errorSpan);
                        
                        errorChild.appendChild(errorRow);
                        children.appendChild(errorChild);
                    }
                }
                
                // Show truncation indicator if we've limited the keys
                if (maxKeys < keys.length) {
                    // eslint-disable-next-line no-undef
                    const truncated = document.createElement('div');
                    truncated.style.padding = objectInspectorTheme.spacing.xs;
                    truncated.style.color = objectInspectorTheme.colors.maxDepthColor;
                    truncated.style.fontStyle = 'italic';
                    truncated.textContent = `... ${keys.length - maxKeys} more properties`;
                    children.appendChild(truncated);
                }
            } catch {
                // Don't render anything if Object.keys() throws
            }

            if (this.options.showPrototype && depth < this.options.maxDepth - 1) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const proto = Object.getPrototypeOf(value);
                    if (proto && proto !== Object.prototype && proto !== Function.prototype) {
                        const protoNode = this.renderNode(proto as InspectableValue, '__proto__', depth, context);
                        protoNode.style.opacity = objectInspectorTheme.opacity.prototype;
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

    private renderChildrenLazy(container: HTMLElement, value: InspectableValue, depth: number, context: RenderContext): void {
        // Clear lazy flag since we're rendering now
        container.dataset.lazy = 'false';
        
        // More aggressive limits based on depth
        let maxItems: number;
        let maxKeys: number;
        
        if (depth > 10) {
            maxItems = 5;
            maxKeys = 10;
        } else if (depth > 8) {
            maxItems = 15;
            maxKeys = 25;
        } else if (depth > 5) {
            maxItems = 30;
            maxKeys = 50;
        } else {
            maxItems = 100;
            maxKeys = 200;
        }

        if (isArray(value)) {
            const itemsToRender = Math.min(value.length, maxItems);
            
            for (let i = 0; i < itemsToRender; i++) {
                const child = this.renderNode(value[i] as InspectableValue, i, depth, context);
                container.appendChild(child);
            }
            
            // Show truncation indicator if we've limited the items
            if (itemsToRender < value.length) {
                // eslint-disable-next-line no-undef
                const truncated = document.createElement('div');
                truncated.style.padding = objectInspectorTheme.spacing.xs;
                truncated.style.color = objectInspectorTheme.colors.maxDepthColor;
                truncated.style.fontStyle = 'italic';
                truncated.textContent = `... ${value.length - itemsToRender} more items (click to load more)`;
                truncated.style.cursor = 'pointer';
                truncated.onclick = (): void => this.loadMoreItems(container, value, itemsToRender, depth, context, maxItems);
                container.appendChild(truncated);
            }
        } else if (isObjectWithKeys(value) || typeof value === 'function') {
            // Handle both objects and functions (functions can have properties)
            try {
                let keys = Object.keys(value);
                if (this.options.sortKeys) {
                    keys.sort();
                }

                const keysToRender = Math.min(keys.length, maxKeys);

                for (let i = 0; i < keysToRender; i++) {
                    const key = keys[i];
                    try {
                        const propValue = (value as Record<string, unknown>)[key];
                        const child = this.renderNode(propValue as InspectableValue, key, depth, context);
                        container.appendChild(child);
                    } catch {
                        // Skip properties that throw errors when accessed
                    }
                }
                
                // Show truncation indicator if we've limited the keys
                if (keysToRender < keys.length) {
                    // eslint-disable-next-line no-undef
                    const truncated = document.createElement('div');
                    truncated.style.padding = objectInspectorTheme.spacing.xs;
                    truncated.style.color = objectInspectorTheme.colors.maxDepthColor;
                    truncated.style.fontStyle = 'italic';
                    truncated.textContent = `... ${keys.length - keysToRender} more properties (click to load more)`;
                    truncated.style.cursor = 'pointer';
                    truncated.onclick = (): void => this.loadMoreKeys(container, value as Record<string, unknown>, keys, keysToRender, depth, context, maxKeys);
                    container.appendChild(truncated);
                }
            } catch {
                // Don't render anything if Object.keys() throws
            }

            if (this.options.showPrototype && depth < this.options.maxDepth - 1) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const proto = Object.getPrototypeOf(value);
                    if (proto && proto !== Object.prototype && proto !== Function.prototype) {
                        const protoNode = this.renderNode(proto as InspectableValue, '__proto__', depth, context);
                        protoNode.style.opacity = objectInspectorTheme.opacity.prototype;
                        protoNode.style.fontStyle = "italic";
                        container.appendChild(protoNode);
                    }
                } catch {
                    // Skip prototype if getPrototypeOf throws
                }
            }
        }
    }

    private loadMoreItems(container: HTMLElement, value: unknown[], startIndex: number, depth: number, context: RenderContext, batchSize: number): void {
        const truncatedElement = container.lastElementChild!;
        const itemsToAdd = Math.min(batchSize, value.length - startIndex);
        
        for (let i = startIndex; i < startIndex + itemsToAdd; i++) {
            const child = this.renderNode(value[i] as InspectableValue, i, depth, context);
            container.insertBefore(child, truncatedElement);
        }
        
        const newStartIndex = startIndex + itemsToAdd;
        if (newStartIndex < value.length) {
            (truncatedElement as HTMLElement).textContent = `... ${value.length - newStartIndex} more items (click to load more)`;
            (truncatedElement as HTMLElement).onclick = (): void => this.loadMoreItems(container, value, newStartIndex, depth, context, batchSize);
        } else {
            container.removeChild(truncatedElement);
        }
    }

    private loadMoreKeys(container: HTMLElement, value: Record<string, unknown>, keys: string[], startIndex: number, depth: number, context: RenderContext, batchSize: number): void {
        const truncatedElement = container.lastElementChild!;
        const keysToAdd = Math.min(batchSize, keys.length - startIndex);
        
        for (let i = startIndex; i < startIndex + keysToAdd; i++) {
            const key = keys[i];
            try {
                const propValue = value[key];
                const child = this.renderNode(propValue as InspectableValue, key, depth, context);
                container.insertBefore(child, truncatedElement);
            } catch {
                // Skip properties that throw errors when accessed
            }
        }
        
        const newStartIndex = startIndex + keysToAdd;
        if (newStartIndex < keys.length) {
            (truncatedElement as HTMLElement).textContent = `... ${keys.length - newStartIndex} more properties (click to load more)`;
            (truncatedElement as HTMLElement).onclick = (): void => this.loadMoreKeys(container, value, keys, newStartIndex, depth, context, batchSize);
        } else {
            container.removeChild(truncatedElement);
        }
    }

    private toggleExpand(toggle: HTMLElement, node: HTMLElement): void {
        const arrow = toggle.querySelector('span');
        // Find the children container by looking for a div with marginLeft style (indented children)
        const children = Array.from(node.children).find(child => 
            child instanceof HTMLElement && 
            child.tagName === 'DIV' && 
            child.style.marginLeft === objectInspectorTheme.layout.indentSize
        ) as HTMLElement;
        
        if (arrow && children) {
            const isExpanded = children.style.display === 'block';
            
            if (!isExpanded) {
                // Expanding - check if we need to lazy render
                if (children.dataset.lazy === 'true' && children.children.length === 0) {
                    const lazyData = this.lazyDataMap.get(children);
                    
                    if (lazyData) {
                        this.renderChildrenLazy(children, lazyData.value, lazyData.depth, lazyData.context);
                    }
                }
                children.style.display = 'block';
                arrow.style.transform = 'rotate(90deg)';
                arrow.style.top = '2px';
            } else {
                // Collapsing
                children.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
                arrow.style.top = '0';
            }
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
            const name = match[2].trim() || objectInspectorStrings.anonymousFunction;
            return `${async}${objectInspectorStrings.functionPrefix}${name}${objectInspectorStrings.functionSuffix}`;
        }
        return objectInspectorStrings.defaultFunction;
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
                return objectInspectorStrings.nullValue;
            case 'undefined':
                return objectInspectorStrings.undefinedValue;
            case 'function':
                return objectInspectorStrings.functionSymbol;
            case 'symbol':
                return objectInspectorStrings.symbolLabel;
            case 'array':
                return `${objectInspectorStrings.arrayPrefix}${(value as unknown[]).length}${objectInspectorStrings.arraySuffix}`;
            case 'object':
                return objectInspectorStrings.objectPreview;
            default:
                return objectInspectorStrings.defaultPreview;
        }
    }

}
