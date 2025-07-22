/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../../types";
import { PLUGIN_URL } from "./constants";
import { createComponentIcon, createExpandIcon, createFlowIcon, createMinimizeIcon, createTrashIcon } from "./icons";
import { MAIN_AREA_PLACEHOLDER } from "./strings";

type ComponentGroup = {
    sidebarItem: HTMLDivElement;
    events: Array<{type: 'tracked' | 'triggered', timestamp: string}>;
    eventCount: number;
}

export class UILogger implements Logger {
    private loggerPanel: HTMLDivElement;
    private headerElement: HTMLDivElement | undefined;
    private contentContainer: HTMLDivElement | undefined;
    private sidebar: HTMLDivElement | undefined;
    private mainArea: HTMLDivElement | undefined;
    private componentGroups: Map<string, ComponentGroup> = new Map();
    private selectedComponent: string | null = null;
    private dragHandle!: HTMLDivElement;
    private isDragging = false;
    private startY = 0;
    private startHeight = 0;
    private sidebarResizeHandle!: HTMLDivElement;
    private isSidebarResizing = false;
    private startX = 0;
    private startSidebarWidth = 0;
    private leftResizeHandle!: HTMLDivElement;
    private isLeftResizing = false;
    private startLeftX = 0;
    private startPanelWidth = 0;
    private isMinimized = false;
    private savedHeight = 250;

    constructor() {
        this.loggerPanel = document.createElement("div");
        this.loggerPanel.style.position = "fixed";
        this.loggerPanel.style.bottom = "1em";
        this.loggerPanel.style.right = "1em";
        this.loggerPanel.style.width = "95vw";
        this.loggerPanel.style.maxWidth = "95vw";
        this.loggerPanel.style.maxHeight = "250px";
        this.loggerPanel.style.minHeight = "250px";
        this.loggerPanel.style.display = "flex";
        this.loggerPanel.style.flexDirection = "column";
        this.loggerPanel.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        this.loggerPanel.style.border = "1px solid #ccc";
        this.loggerPanel.style.zIndex = "9999";
        this.loggerPanel.style.fontFamily = "Arial, sans-serif";
        this.loggerPanel.style.resize = "none";
        
        this.createDragHandle();
        this.createLeftResizeHandle();
        this.createHeader();
        this.createContentContainer();
        this.createSidebarResizeHandle();
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

    private createLeftResizeHandle(): void {
        this.leftResizeHandle = document.createElement("div");
        this.leftResizeHandle.style.position = "absolute";
        this.leftResizeHandle.style.top = "0";
        this.leftResizeHandle.style.left = "0";
        this.leftResizeHandle.style.bottom = "0";
        this.leftResizeHandle.style.width = "8px";
        this.leftResizeHandle.style.cursor = "ew-resize";
        this.leftResizeHandle.style.backgroundColor = "transparent";
        this.leftResizeHandle.style.borderLeft = "2px solid transparent";
        this.leftResizeHandle.style.transition = "border-color 0.2s ease";
        this.leftResizeHandle.style.zIndex = "2";
        
        this.leftResizeHandle.addEventListener("mouseenter", () => {
            this.leftResizeHandle.style.borderLeftColor = "#007acc";
        });
        
        this.leftResizeHandle.addEventListener("mouseleave", () => {
            if (!this.isLeftResizing) {
                this.leftResizeHandle.style.borderLeftColor = "transparent";
            }
        });
        
        this.loggerPanel.appendChild(this.leftResizeHandle);
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
        icon.innerHTML = createFlowIcon(18);
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

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "0.5em";
        buttonContainer.style.alignItems = "center";

        const minimizeButton = document.createElement("button");
        minimizeButton.innerHTML = createMinimizeIcon(14);
        minimizeButton.style.color = "black";
        minimizeButton.style.border = "none";
        minimizeButton.style.cursor = "pointer";
        minimizeButton.style.backgroundColor = "transparent";
        minimizeButton.style.padding = "0";
        minimizeButton.title = "Minimize panel";
        minimizeButton.classList.add("minimize-button");
        minimizeButton.onclick = (): void => this.toggleMinimize();

        const clearButton = document.createElement("button");
        clearButton.innerHTML = createTrashIcon(14);
        clearButton.style.color = "#000";
        clearButton.style.border = "none";
        clearButton.style.cursor = "pointer";
        clearButton.style.backgroundColor = "transparent";
        clearButton.style.padding = "0";
        clearButton.title = "Clear log";
        clearButton.onclick = (): void => this.clear();

        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(minimizeButton);

        this.headerElement.appendChild(titleContainer);
        this.headerElement.appendChild(buttonContainer);
        this.loggerPanel.appendChild(this.headerElement);
    }

    private createContentContainer(): void {
        this.contentContainer = document.createElement("div");
        this.contentContainer.style.flex = "1";
        this.contentContainer.style.display = "flex";
        this.contentContainer.style.flexDirection = "row";
        this.contentContainer.style.overflow = "hidden";
        
        this.createSidebar();
        this.createMainArea();
        
        this.loggerPanel.appendChild(this.contentContainer);
    }

    private createSidebar(): void {
        this.sidebar = document.createElement("div");
        this.sidebar.style.width = "200px";
        this.sidebar.style.minWidth = "150px";
        this.sidebar.style.borderRight = "1px solid #ddd";
        this.sidebar.style.overflowY = "auto";
        this.sidebar.style.overflowX = "hidden";
        this.sidebar.style.backgroundColor = "#f9f9f9";
        this.sidebar.style.position = "relative";
        this.contentContainer!.appendChild(this.sidebar);
    }

    private createMainArea(): void {
        this.mainArea = document.createElement("div");
        this.mainArea.style.flex = "1";
        this.mainArea.style.overflow = "hidden";
        this.mainArea.style.padding = "1em";
        this.mainArea.style.display = "flex";
        this.mainArea.style.flexDirection = "column";
        
        this.showPlaceholderText();
        
        this.contentContainer!.appendChild(this.mainArea);
    }

    private showPlaceholderText(): void {
        if (!this.mainArea) return;
        
        this.mainArea.innerHTML = "";
        const placeholder = document.createElement("div");
        placeholder.style.display = "flex";
        placeholder.style.flexDirection = "column";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.height = "100%";
        placeholder.style.color = "#666";
        placeholder.style.fontFamily = "Arial, sans-serif";
        placeholder.style.textAlign = "center";
        
        const icon = document.createElement("div");
        icon.innerHTML = createFlowIcon(32);
        icon.style.color = "#007acc";
        icon.style.opacity = "0.35";
        icon.style.marginBottom = "0.5em";
        
        const text = document.createElement("p");
        text.textContent = MAIN_AREA_PLACEHOLDER;
        text.style.margin = "0";
        text.style.fontSize = "0.9em";
        
        placeholder.appendChild(icon);
        placeholder.appendChild(text);
        this.mainArea.appendChild(placeholder);
    }

    private createSidebarResizeHandle(): void {
        this.sidebarResizeHandle = document.createElement("div");
        this.sidebarResizeHandle.style.position = "absolute";
        this.sidebarResizeHandle.style.top = "0";
        this.sidebarResizeHandle.style.right = "-2px";
        this.sidebarResizeHandle.style.bottom = "0";
        this.sidebarResizeHandle.style.width = "4px";
        this.sidebarResizeHandle.style.cursor = "ew-resize";
        this.sidebarResizeHandle.style.backgroundColor = "transparent";
        this.sidebarResizeHandle.style.borderRight = "2px solid transparent";
        this.sidebarResizeHandle.style.transition = "border-color 0.2s ease";
        this.sidebarResizeHandle.style.zIndex = "3";
        
        this.sidebarResizeHandle.addEventListener("mouseenter", () => {
            this.sidebarResizeHandle.style.borderRightColor = "#007acc";
        });
        
        this.sidebarResizeHandle.addEventListener("mouseleave", () => {
            if (!this.isSidebarResizing) {
                this.sidebarResizeHandle.style.borderRightColor = "transparent";
            }
        });
        
        this.sidebar!.appendChild(this.sidebarResizeHandle);
    }

    private setupEventListeners(): void {
        this.dragHandle.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.leftResizeHandle.addEventListener("mousedown", this.onLeftMouseDown.bind(this));
        this.sidebarResizeHandle.addEventListener("mousedown", this.onSidebarMouseDown.bind(this));
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

    private onLeftMouseDown(event: MouseEvent): void {
        this.isLeftResizing = true;
        this.startLeftX = event.clientX;
        this.startPanelWidth = this.loggerPanel.offsetWidth;
        this.leftResizeHandle.style.borderLeftColor = "#007acc";
        event.preventDefault();
        event.stopPropagation();
    }

    private onSidebarMouseDown(event: MouseEvent): void {
        this.isSidebarResizing = true;
        this.startX = event.clientX;
        this.startSidebarWidth = this.sidebar!.offsetWidth;
        this.sidebarResizeHandle.style.borderRightColor = "#007acc";
        event.preventDefault();
        event.stopPropagation();
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.isDragging) {
            const deltaY = this.startY - event.clientY;
            const newHeight = this.startHeight + deltaY;
            const minHeight = 150;
            const maxHeight = window.innerHeight * 0.8;
            
            const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            this.loggerPanel.style.height = `${clampedHeight}px`;
            this.loggerPanel.style.maxHeight = `${clampedHeight}px`;
        }
        
        if (this.isLeftResizing) {
            const deltaX = this.startLeftX - event.clientX;
            const newWidth = this.startPanelWidth + deltaX;
            const minWidth = 400;
            const maxWidth = window.innerWidth * 0.95;
            
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            this.loggerPanel.style.width = `${clampedWidth}px`;
        }
        
        if (this.isSidebarResizing) {
            const deltaX = event.clientX - this.startX;
            const newWidth = this.startSidebarWidth + deltaX;
            const minWidth = 150;
            const maxWidth = this.loggerPanel.offsetWidth * 0.2;
            
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            this.sidebar!.style.width = `${clampedWidth}px`;
        }
    }

    private onMouseUp(): void {
        this.isDragging = false;
        this.dragHandle.style.borderTopColor = "transparent";
        
        this.isLeftResizing = false;
        this.leftResizeHandle.style.borderLeftColor = "transparent";
        
        this.isSidebarResizing = false;
        this.sidebarResizeHandle.style.borderRightColor = "transparent";
    }

    private getOrCreateComponentGroup(componentName: string, componentPath?: string): ComponentGroup {
        if (!this.sidebar) {
            return {
                sidebarItem: document.createElement("div"),
                events: [],
                eventCount: 0
            };
        }

        if (this.componentGroups.has(componentName)) {
            return this.componentGroups.get(componentName)!;
        }

        const sidebarItem = document.createElement("div");
        sidebarItem.style.display = "flex";
        sidebarItem.style.padding = "0.75em";
        sidebarItem.style.cursor = "pointer";
        sidebarItem.style.gap = "0.5em";
        sidebarItem.style.borderBottom = "1px solid #ddd";
        sidebarItem.style.userSelect = "none";
        sidebarItem.style.fontFamily = "monospace";
        sidebarItem.style.fontSize = "0.9em";
        sidebarItem.style.transition = "background-color 0.2s";

        sidebarItem.onmouseenter = (): void => {
            if (this.selectedComponent !== componentName) {
                sidebarItem.style.backgroundColor = "#e9e9e9";
            }
        };

        sidebarItem.onmouseleave = (): void => {
            if (this.selectedComponent !== componentName) {
                sidebarItem.style.backgroundColor = "transparent";
            }
        };

        sidebarItem.onclick = (): void => {
            this.selectComponent(componentName);
        };

        this.sidebar.appendChild(sidebarItem);

        const group: ComponentGroup = {
            sidebarItem,
            events: [],
            eventCount: 0
        };

        this.componentGroups.set(componentName, group);
        this.updateSidebarItem(componentName, componentPath);

        return group;
    }

    private updateSidebarItem(componentName: string, _componentPath?: string): void {
        const group = this.componentGroups.get(componentName);
        if (!group) return;

        const icon = document.createElement("span");
        icon.innerHTML = createComponentIcon(14);
        icon.style.color = "#007acc";
        icon.style.position = "relative";
        icon.style.top = "1px";
        icon.style.flexShrink = "0";

        const nameContainer = document.createElement("div");
        nameContainer.style.flex = "1";
        nameContainer.style.overflow = "hidden";

        const nameSpan = document.createElement("div");
        nameSpan.textContent = componentName;
        nameSpan.style.fontWeight = "bold";
        nameSpan.style.whiteSpace = "nowrap";
        nameSpan.style.overflow = "hidden";
        nameSpan.style.textOverflow = "ellipsis";

        const countSpan = document.createElement("div");
        countSpan.textContent = `${group.eventCount} events`;
        countSpan.style.fontSize = "0.8em";
        countSpan.style.color = "#666";

        nameContainer.appendChild(nameSpan);
        nameContainer.appendChild(countSpan);

        group.sidebarItem.innerHTML = "";
        group.sidebarItem.appendChild(icon);
        group.sidebarItem.appendChild(nameContainer);
    }

    private addEventToGroup(componentName: string, eventType: 'tracked' | 'triggered', componentPath?: string): void {
        const group = this.getOrCreateComponentGroup(componentName, componentPath);
        group.eventCount++;
        
        const timestamp = new Date().toLocaleTimeString();
        group.events.push({type: eventType, timestamp});
        
        if (this.selectedComponent === componentName) {
            this.displayComponentEvents(componentName);
        }
        
        this.updateSidebarItem(componentName, componentPath);
    }

    private selectComponent(componentName: string): void {
        if (this.selectedComponent) {
            const prevGroup = this.componentGroups.get(this.selectedComponent);
            if (prevGroup) {
                prevGroup.sidebarItem.style.backgroundColor = "transparent";
                prevGroup.sidebarItem.style.fontWeight = "normal";
            }
        }

        this.selectedComponent = componentName;
        const currentGroup = this.componentGroups.get(componentName);
        if (currentGroup) {
            currentGroup.sidebarItem.style.backgroundColor = "#e9e9e9";
        }

        this.displayComponentEvents(componentName);
    }

    private displayComponentEvents(componentName: string): void {
        if (!this.mainArea) return;

        const group = this.componentGroups.get(componentName);
        if (!group) return;

        this.mainArea.innerHTML = "";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.marginBottom = "1em";
        header.style.paddingBottom = "0.5em";
        header.style.borderBottom = "2px solid #007acc";
        header.style.flexShrink = "0";

        const icon = document.createElement("span");
        icon.innerHTML = createComponentIcon(14);
        icon.style.color = "#007acc";
        icon.style.marginRight = "0.5em";

        const title = document.createElement("h3");
        title.textContent = `${componentName} Events`;
        title.style.margin = "0";
        title.style.fontFamily = "monospace";
        title.style.fontSize = "1.1em";
        title.style.position = "relative";
        title.style.top = "-1px";

        header.appendChild(icon);
        header.appendChild(title);
        this.mainArea.appendChild(header);

        const scrollableContainer = document.createElement("div");
        scrollableContainer.style.flex = "1";
        scrollableContainer.style.overflow = "auto";
        scrollableContainer.style.minHeight = "0";

        if (group.events.length === 0) {
            const noEvents = document.createElement("p");
            noEvents.textContent = "No events recorded yet";
            noEvents.style.color = "#666";
            noEvents.style.fontStyle = "italic";
            noEvents.style.margin = "0";
            scrollableContainer.appendChild(noEvents);
        } else {
            const eventsContainer = document.createElement("div");
            eventsContainer.style.display = "flex";
            eventsContainer.style.flexDirection = "column";
            eventsContainer.style.gap = "0.5em";

            group.events.forEach((event) => {
                const eventDiv = document.createElement("div");
                eventDiv.style.display = "flex";
                eventDiv.style.justifyContent = "space-between";
                eventDiv.style.alignItems = "center";
                eventDiv.style.padding = "0.5em";
                eventDiv.style.backgroundColor = "#f9f9f9";
                eventDiv.style.border = "1px solid #ddd";
                eventDiv.style.borderRadius = "4px";
                eventDiv.style.fontFamily = "monospace";
                eventDiv.style.fontSize = "0.9em";

                const eventSpan = document.createElement("span");
                eventSpan.textContent = event.type === 'tracked' ? 'Render tracked' : 'Render triggered';
                eventSpan.style.color = event.type === 'tracked' ? "#068261ff" : "#ff9800";
                eventSpan.style.fontWeight = "bold";

                const timestampSpan = document.createElement("span");
                timestampSpan.textContent = event.timestamp;
                timestampSpan.style.color = "#666";

                eventDiv.appendChild(eventSpan);
                eventDiv.appendChild(timestampSpan);
                eventsContainer.appendChild(eventDiv);
            });

            scrollableContainer.appendChild(eventsContainer);
        }

        this.mainArea.appendChild(scrollableContainer);
    }

    tracked(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, 'tracked', data.componentPath);
    }

    triggered(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, "triggered", data.componentPath);
    }

    error(error: Error, _context?: unknown): void {
        if (!this.mainArea) {
            return;
        }

        const errorDiv = document.createElement("div");
        errorDiv.style.color = "red";
        errorDiv.style.marginBottom = "0.5em";
        errorDiv.style.padding = "0.5em";
        errorDiv.style.border = "1px solid red";
        errorDiv.style.borderRadius = "4px";
        errorDiv.style.backgroundColor = "#ffeaea";
        errorDiv.style.fontFamily = "monospace";
        errorDiv.style.fontSize = "0.9em";
        
        const timestamp = new Date().toLocaleTimeString();
        errorDiv.textContent = `[${timestamp}] [Error] ${error.message}`;
        
        if (this.selectedComponent) {
            this.mainArea.appendChild(errorDiv);
        } else {
            this.mainArea.innerHTML = "";
            this.mainArea.appendChild(errorDiv);
        }
    }

    private toggleMinimize(): void {
        if (this.isMinimized) {
            // Restore panel
            this.loggerPanel.style.height = `${this.savedHeight}px`;
            this.loggerPanel.style.maxHeight = `${this.savedHeight}px`;
            this.loggerPanel.style.minHeight = `${this.savedHeight}px`;
            this.contentContainer!.style.display = "flex";
            this.dragHandle.style.display = "block";
            this.leftResizeHandle.style.display = "block";
            
            const minimizeButton = this.headerElement!.querySelector(".minimize-button") as HTMLButtonElement;
            minimizeButton.innerHTML = createMinimizeIcon(14);
            minimizeButton.title = "Minimize panel";
            
            this.isMinimized = false;
        } else {
            // Minimize panel
            this.savedHeight = parseInt(window.getComputedStyle(this.loggerPanel).height, 10);
            this.contentContainer!.style.display = "none";
            this.dragHandle.style.display = "none";
            this.leftResizeHandle.style.display = "none";
            
            // Calculate header height after hiding content
            const headerHeight = this.headerElement!.offsetHeight;
            this.loggerPanel.style.height = `${headerHeight}px`;
            this.loggerPanel.style.maxHeight = `${headerHeight}px`;
            this.loggerPanel.style.minHeight = `${headerHeight}px`;
            
            const minimizeButton = this.headerElement!.querySelector(".minimize-button") as HTMLButtonElement;
            minimizeButton.innerHTML = createExpandIcon(14);
            minimizeButton.title = "Restore panel";
            
            this.isMinimized = true;
        }
    }

    private clear(): void {
        if (!this.sidebar || !this.mainArea) {
            return;
        }
        this.componentGroups.clear();
        this.selectedComponent = null;
        this.sidebar.innerHTML = "";
        this.showPlaceholderText();
    }
}