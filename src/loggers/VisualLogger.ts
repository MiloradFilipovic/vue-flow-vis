/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../types";

type ComponentGroup = {
    header: HTMLDivElement;
    content: HTMLDivElement;
    eventCount: number;
}

export class VisualLogger implements Logger {
    private loggerPanel: HTMLDivElement;
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
        this.loggerPanel.style.width = "95vw";
        this.loggerPanel.style.maxHeight = "250px";
        this.loggerPanel.style.minHeight = "150px";
        this.loggerPanel.style.padding = "1em";
        this.loggerPanel.style.overflow = "auto";
        this.loggerPanel.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        this.loggerPanel.style.border = "1px solid #ccc";
        this.loggerPanel.style.borderRadius = "8px";
        this.loggerPanel.style.zIndex = "9999";
        this.loggerPanel.style.fontFamily = "Arial, sans-serif";
        this.loggerPanel.style.resize = "none";
        
        this.createDragHandle();
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.marginBottom = "1em";

        const title = document.createElement("h3");
        title.textContent = "FlowVis Logger";
        title.style.margin = "0";

        const clearButton = document.createElement("button");
        clearButton.textContent = "Clear";
        clearButton.style.padding = "0.25em 0.5em";
        clearButton.style.backgroundColor = "#ff4444";
        clearButton.style.color = "white";
        clearButton.style.border = "none";
        clearButton.style.borderRadius = "4px";
        clearButton.style.cursor = "pointer";
        clearButton.onclick = (): void => this.clear();

        header.appendChild(title);
        header.appendChild(clearButton);
        this.loggerPanel.appendChild(header);
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
        if (this.componentGroups.has(componentName)) {
            return this.componentGroups.get(componentName)!;
        }

        const groupDiv = document.createElement("div");
        groupDiv.style.marginBottom = "0.5em";
        groupDiv.style.border = "1px solid #ddd";
        groupDiv.style.borderRadius = "4px";

        const header = document.createElement("div");
        header.style.backgroundColor = "#f5f5f5";
        header.style.padding = "0.5em";
        header.style.cursor = "pointer";
        header.style.fontWeight = "bold";
        header.style.borderBottom = "1px solid #ddd";

        const content = document.createElement("div");
        content.style.padding = "0.5em";
        content.style.maxHeight = "150px";
        content.style.overflow = "auto";
        content.style.display = "none";

        header.onclick = (): void => {
            content.style.display = content.style.display === "none" ? "block" : "none";
        };

        groupDiv.appendChild(header);
        groupDiv.appendChild(content);
        this.loggerPanel.appendChild(groupDiv);

        const group: ComponentGroup = {
            header,
            content,
            eventCount: 0
        };

        this.componentGroups.set(componentName, group);
        this.updateGroupHeader(componentName, componentPath);

        return group;
    }

    private updateGroupHeader(componentName: string, componentPath?: string): void {
        const group = this.componentGroups.get(componentName);
        if (!group) return;

        const pathDisplay = componentPath ? ` [${componentPath}]` : "";
        group.header.textContent = `${componentName}${pathDisplay} (${group.eventCount} events)`;
    }

    private addEventToGroup(componentName: string, eventText: string, componentPath?: string): void {
        const group = this.getOrCreateComponentGroup(componentName, componentPath);
        group.eventCount++;
        
        const timestamp = new Date().toLocaleTimeString();
        const eventDiv = document.createElement("div");
        eventDiv.style.fontSize = "0.9em";
        eventDiv.style.marginBottom = "0.25em";
        eventDiv.textContent = `[${timestamp}] ${eventText}`;
        
        group.content.appendChild(eventDiv);
        this.updateGroupHeader(componentName, componentPath);
    }

    tracked(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, "[Tracked]", data.componentPath);
    }

    triggered(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, "[Triggered]", data.componentPath);
    }

    error(error: Error, _context?: unknown): void {
        const errorDiv = document.createElement("div");
        errorDiv.style.color = "red";
        errorDiv.style.marginBottom = "0.5em";
        errorDiv.style.padding = "0.5em";
        errorDiv.style.border = "1px solid red";
        errorDiv.style.borderRadius = "4px";
        errorDiv.style.backgroundColor = "#ffeaea";
        
        const timestamp = new Date().toLocaleTimeString();
        errorDiv.textContent = `[${timestamp}] [Error] ${error.message}`;
        
        this.loggerPanel.appendChild(errorDiv);
    }

    private clear(): void {
        this.componentGroups.clear();
        const children = Array.from(this.loggerPanel.children);
        children.forEach((child, index) => {
            if (index > 0) {
                this.loggerPanel.removeChild(child);
            }
        });
    }
}