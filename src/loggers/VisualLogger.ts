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