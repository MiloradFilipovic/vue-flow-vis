/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../types";

type ComponentGroup = {
    header: HTMLDivElement;
    content: HTMLDivElement;
    eventCount: number;
}

const TRASH_ICON = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-trash2-icon lucide-trash-2\"><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M3 6h18\"/><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>";

const FLOW_ICON = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-wind-icon lucide-wind\"><path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\"/><path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\"/><path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\"/></svg>";

const COMPONENT_ICON = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-component-icon lucide-component\"><path d=\"M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z\"/><path d=\"M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z\"/><path d=\"M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z\"/><path d=\"M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z\"/></svg>"

const PLUGIN_URL = 'https://github.com/MiloradFilipovic/vue-flow-vis';

export class VisualLogger implements Logger {
    private loggerPanel: HTMLDivElement;
    private headerElement: HTMLDivElement | undefined;
    private contentContainer: HTMLDivElement | undefined;
    private componentGroups: Map<string, ComponentGroup> = new Map();
    private dragHandle!: HTMLDivElement;
    private isDragging = false;
    private startY = 0;
    private startHeight = 0;

    constructor() {
        this.loggerPanel = document.createElement("div");
        this.loggerPanel.style.position = "fixed";
        this.loggerPanel.style.bottom = "1em";
        this.loggerPanel.style.right = "1em";
        this.loggerPanel.style.width = "calc(100vw - 4em)";
        this.loggerPanel.style.maxHeight = "250px";
        this.loggerPanel.style.minHeight = "150px";
        this.loggerPanel.style.overflow = "auto";
        this.loggerPanel.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        this.loggerPanel.style.border = "1px solid #ccc";
        this.loggerPanel.style.zIndex = "9999";
        this.loggerPanel.style.fontFamily = "Arial, sans-serif";
        this.loggerPanel.style.resize = "none";
        
        this.createDragHandle();
        this.createHeader();
        this.createContentContainer();
        document.body.appendChild(this.loggerPanel);
        this.setupEventListeners();
    }

    private createDragHandle(): void {
        this.dragHandle = document.createElement("div");
        this.dragHandle.style.position = "absolute";
        this.dragHandle.style.top = "0";
        this.dragHandle.style.left = "0";
        this.dragHandle.style.right = "0";
        this.dragHandle.style.height = "8px";
        this.dragHandle.style.cursor = "ns-resize";
        this.dragHandle.style.backgroundColor = "transparent";
        this.dragHandle.style.borderTop = "2px solid transparent";
        this.dragHandle.style.transition = "border-color 0.2s ease";
        this.dragHandle.style.zIndex = "2";
        
        this.dragHandle.addEventListener("mouseenter", () => {
            this.dragHandle.style.borderTopColor = "#007acc";
        });
        
        this.dragHandle.addEventListener("mouseleave", () => {
            if (!this.isDragging) {
                this.dragHandle.style.borderTopColor = "transparent";
            }
        });
        
        this.loggerPanel.appendChild(this.dragHandle);
    }

    private createHeader(): void {
        this.headerElement = document.createElement("div");
        this.headerElement.style.display = "flex";
        this.headerElement.style.justifyContent = "space-between";
        this.headerElement.style.alignItems = "center";
        this.headerElement.style.position = "relative";
        this.headerElement.style.zIndex = "1";
        this.headerElement.style.backgroundColor = "#f5f5f5";
        this.headerElement.style.padding = "0.3em 0.5em";
        this.headerElement.style.borderBottom = "1px solid #ddd";
        this.headerElement.style.userSelect = "none";

        const titleContainer = document.createElement("div");
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.gap = "0.5em";
        titleContainer.style.alignContent = "center";

        const pluginLink = document.createElement("a");
        pluginLink.href = PLUGIN_URL;
        pluginLink.target = "_blank";
        pluginLink.style.textDecoration = "none";
        pluginLink.style.color = "black";
        titleContainer.appendChild(pluginLink);

        const icon = document.createElement("span");
        icon.innerHTML = FLOW_ICON;
        icon.style.color = "black";
        icon.style.position = "relative";
        icon.style.top = "1px";
        pluginLink.appendChild(icon);
        icon.onmouseover = (): void => {
            icon.style.color = "#00cc96ff";
        };
        icon.onmouseout = (): void => {
            icon.style.color = "black";
        };

        const title = document.createElement("span");
        title.textContent = "vue-flow-vis";
        title.style.fontFamily = "monospace";
        title.style.paddingBottom = "2px";
        titleContainer.appendChild(title);

        const clearButton = document.createElement("button");
        clearButton.innerHTML = TRASH_ICON;
        clearButton.style.color = "black";
        clearButton.style.border = "none";
        clearButton.style.cursor = "pointer";
        clearButton.style.backgroundColor = "transparent";
        clearButton.style.padding = "0";
        clearButton.title = "Clear log";
        clearButton.onclick = (): void => this.clear();

        this.headerElement.appendChild(titleContainer);
        this.headerElement.appendChild(clearButton);
        this.loggerPanel.appendChild(this.headerElement);
    }

    private createContentContainer(): void {
        this.contentContainer = document.createElement("div");
        this.contentContainer.style.overflow = "auto";
        this.contentContainer.style.flex = "1";
        this.contentContainer.style.display = "flex";
        this.contentContainer.style.flexDirection = "column";
        this.loggerPanel.appendChild(this.contentContainer);
    }

    private setupEventListeners(): void {
        this.dragHandle.addEventListener("mousedown", this.onMouseDown.bind(this));
        document.addEventListener("mousemove", this.onMouseMove.bind(this));
        document.addEventListener("mouseup", this.onMouseUp.bind(this));
    }

    private onMouseDown(event: MouseEvent): void {
        this.isDragging = true;
        this.startY = event.clientY;
        this.startHeight = parseInt(window.getComputedStyle(this.loggerPanel).height, 10);
        this.dragHandle.style.borderTopColor = "#007acc";
        event.preventDefault();
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isDragging) return;
        
        const deltaY = this.startY - event.clientY;
        const newHeight = this.startHeight + deltaY;
        const minHeight = 150;
        const maxHeight = window.innerHeight * 0.8;
        
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        this.loggerPanel.style.height = `${clampedHeight}px`;
        this.loggerPanel.style.maxHeight = `${clampedHeight}px`;
    }

    private onMouseUp(): void {
        this.isDragging = false;
        this.dragHandle.style.borderTopColor = "transparent";
    }

    private getOrCreateComponentGroup(componentName: string, componentPath?: string): ComponentGroup {
        if (!this.contentContainer) {
            return {
                header: document.createElement("div"),
                content: document.createElement("div"),
                eventCount: 0
            };
        }

        if (this.componentGroups.has(componentName)) {
            return this.componentGroups.get(componentName)!;
        }

        const groupDiv = document.createElement("div");
        groupDiv.style.borderBottom = "1px solid #ddd";
        groupDiv.style.fontFamily = "monospace";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.padding = "0.5em 0.8em";
        header.style.cursor = "pointer";
        header.style.borderBottom = "1px solid #ddd";
        header.style.userSelect = "none";

        const content = document.createElement("div");
        content.style.padding = "0.8em";
        content.style.maxHeight = "150px";
        content.style.overflow = "auto";
        content.style.display = "none";

        header.onclick = (): void => {
            content.style.display = content.style.display === "none" ? "block" : "none";
        };

        groupDiv.appendChild(header);
        groupDiv.appendChild(content);
        this.contentContainer.appendChild(groupDiv);

        const group: ComponentGroup = {
            header,
            content,
            eventCount: 0
        };

        this.componentGroups.set(componentName, group);
        this.updateGroupHeader(componentName, componentPath);

        return group;
    }

    private updateGroupHeader(componentName: string, _componentPath?: string): void {
        const group = this.componentGroups.get(componentName);
        if (!group) return;

        const icon = document.createElement("span");
        icon.style.marginRight = "0.5em";
        icon.innerHTML = COMPONENT_ICON;
        icon.style.color = "#007acc";
        icon.style.position = "relative";
        icon.style.top = "2px";

        const textContent = document.createElement("span");
        textContent.textContent = `${componentName} (${group.eventCount} events)`;

        group.header.innerHTML = ""; // Clear previous content
        group.header.appendChild(icon);
        group.header.appendChild(textContent);
        group.header.style.display = "flex";
        group.header.style.alignItems = "center";
    }

    private addEventToGroup(componentName: string, eventType: 'tracked' | 'triggered', componentPath?: string): void {
        const group = this.getOrCreateComponentGroup(componentName, componentPath);
        group.eventCount++;
        
        const timestamp = new Date().toLocaleTimeString();
        const eventDiv = document.createElement("div");
        eventDiv.style.display = "flex";
        eventDiv.style.justifyContent = "space-between";
        eventDiv.style.padding = "0.2em";
        eventDiv.style.fontSize = "0.9em";
        eventDiv.style.marginBottom = "0.25em";
        eventDiv.style.borderBottom = "1px solid #eee";

        if (eventType === 'tracked') {
            const eventSpan = document.createElement("span");
            eventSpan.textContent = 'Render tracked';
            eventSpan.style.color = "#068261ff";
            eventSpan.style.fontWeight = "bold";
            eventDiv.appendChild(eventSpan);
        } else if (eventType === 'triggered') {
            const eventSpan = document.createElement("span");
            eventSpan.textContent = 'Render triggered';
            eventSpan.style.color = "#ff9800"; 
            eventSpan.style.fontWeight = "bold";
            eventDiv.appendChild(eventSpan);
        }
        eventDiv.appendChild(document.createTextNode(`${timestamp}`));
        
        group.content.appendChild(eventDiv);
        this.updateGroupHeader(componentName, componentPath);
    }

    tracked(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, 'tracked', data.componentPath);
    }

    triggered(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, "triggered", data.componentPath);
    }

    error(error: Error, _context?: unknown): void {
        if (!this.contentContainer) {
            return;
        }

        const errorDiv = document.createElement("div");
        errorDiv.style.color = "red";
        errorDiv.style.marginBottom = "0.5em";
        errorDiv.style.padding = "0.5em";
        errorDiv.style.border = "1px solid red";
        errorDiv.style.borderRadius = "4px";
        errorDiv.style.backgroundColor = "#ffeaea";
        
        const timestamp = new Date().toLocaleTimeString();
        errorDiv.textContent = `[${timestamp}] [Error] ${error.message}`;
        
        this.contentContainer.appendChild(errorDiv);
    }

    private clear(): void {
        if (!this.contentContainer) {
            return;
        }
        this.componentGroups.clear();
        this.contentContainer.innerHTML = "";
    }
}