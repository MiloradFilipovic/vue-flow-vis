/* eslint-disable no-undef */
import { createFlowIcon, createMinimizeIcon, createExpandIcon, createTrashIcon } from "./icons";
import { PLUGIN_URL } from "./constants";
import { FILTER_COMPONENTS_PLACEHOLDER } from "./strings";

export interface UIManagerCallbacks {
    onClear: () => void;
    onMinimizeToggle: () => void;
    onComponentFilterChange: (filter: string) => void;
}

export class UIManager {
    private loggerPanel: HTMLDivElement;
    private headerElement: HTMLDivElement | undefined;
    private contentContainer: HTMLDivElement | undefined;
    private sidebar: HTMLDivElement | undefined;
    private mainArea: HTMLDivElement | undefined;
    private dragHandle: HTMLDivElement;
    private sidebarResizeHandle: HTMLDivElement;
    private leftResizeHandle: HTMLDivElement;
    
    private isDragging = false;
    private startY = 0;
    private startHeight = 0;
    
    private isSidebarResizing = false;
    private startX = 0;
    private startSidebarWidth = 0;
    
    private isLeftResizing = false;
    private startLeftX = 0;
    private startPanelWidth = 0;
    
    private isMinimized = false;
    private savedHeight = 250;
    
    private searchDebounceTimer: number | null = null;
    private callbacks: UIManagerCallbacks;

    constructor(callbacks: UIManagerCallbacks) {
        this.callbacks = callbacks;
        this.loggerPanel = this.createMainPanel();
        this.dragHandle = this.createDragHandle();
        this.leftResizeHandle = this.createLeftResizeHandle();
        this.createHeader();
        this.createContentContainer();
        this.sidebarResizeHandle = this.createSidebarResizeHandle();
        
        document.body.appendChild(this.loggerPanel);
        this.setupEventListeners();
    }

    private createMainPanel(): HTMLDivElement {
        const panel = document.createElement("div");
        panel.id = "vue-flow-vis-logger-panel";
        panel.style.position = "fixed";
        panel.style.bottom = "1em";
        panel.style.right = "1em";
        panel.style.width = "50vw";
        panel.style.height = "450px";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.backgroundColor = "#fff";
        panel.style.border = "1px solid #ccc";
        panel.style.zIndex = "9999";
        panel.style.fontFamily = "Arial, sans-serif";
        panel.style.resize = "none";
        
        return panel;
    }

    private createDragHandle(): HTMLDivElement {
        const handle = document.createElement("div");
        handle.id = "vue-flow-vis-drag-handle";
        handle.style.position = "absolute";
        handle.style.top = "0";
        handle.style.left = "0";
        handle.style.right = "0";
        handle.style.height = "8px";
        handle.style.cursor = "ns-resize";
        handle.style.backgroundColor = "transparent";
        handle.style.borderTop = "2px solid transparent";
        handle.style.transition = "border-color 0.2s ease";
        handle.style.zIndex = "2";
        
        handle.addEventListener("mouseenter", () => {
            handle.style.borderTopColor = "#007acc";
        });
        
        handle.addEventListener("mouseleave", () => {
            if (!this.isDragging) {
                handle.style.borderTopColor = "transparent";
            }
        });
        
        this.loggerPanel.appendChild(handle);
        return handle;
    }

    private createLeftResizeHandle(): HTMLDivElement {
        const handle = document.createElement("div");
        handle.id = "vue-flow-vis-left-resize-handle";
        handle.style.position = "absolute";
        handle.style.top = "0";
        handle.style.left = "0";
        handle.style.bottom = "0";
        handle.style.width = "8px";
        handle.style.cursor = "ew-resize";
        handle.style.backgroundColor = "transparent";
        handle.style.borderLeft = "2px solid transparent";
        handle.style.transition = "border-color 0.2s ease";
        handle.style.zIndex = "2";
        
        handle.addEventListener("mouseenter", () => {
            handle.style.borderLeftColor = "#007acc";
        });
        
        handle.addEventListener("mouseleave", () => {
            if (!this.isLeftResizing) {
                handle.style.borderLeftColor = "transparent";
            }
        });
        
        this.loggerPanel.appendChild(handle);
        return handle;
    }

    private createHeader(): void {
        this.headerElement = document.createElement("div");
        this.headerElement.id = "vue-flow-vis-header";
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
        titleContainer.id = "vue-flow-vis-title-container";
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.gap = "0.5em";
        titleContainer.style.alignContent = "center";

        const pluginLink = document.createElement("a");
        pluginLink.id = "vue-flow-vis-plugin-link";
        pluginLink.href = PLUGIN_URL;
        pluginLink.target = "_blank";
        pluginLink.style.textDecoration = "none";
        pluginLink.style.color = "black";
        titleContainer.appendChild(pluginLink);

        const icon = document.createElement("span");
        icon.id = "vue-flow-vis-header-icon";
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
        title.id = "vue-flow-vis-title";
        title.textContent = "vue-flow-vis";
        title.style.fontFamily = "monospace";
        title.style.paddingBottom = "2px";
        titleContainer.appendChild(title);

        const buttonContainer = document.createElement("div");
        buttonContainer.id = "vue-flow-vis-button-container";
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "0.5em";
        buttonContainer.style.alignItems = "center";

        const minimizeButton = document.createElement("button");
        minimizeButton.id = "vue-flow-vis-minimize-button";
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
        clearButton.id = "vue-flow-vis-clear-button";
        clearButton.innerHTML = createTrashIcon(14);
        clearButton.style.color = "#000";
        clearButton.style.border = "none";
        clearButton.style.cursor = "pointer";
        clearButton.style.backgroundColor = "transparent";
        clearButton.style.padding = "0";
        clearButton.title = "Clear log";
        clearButton.onclick = (): void => this.callbacks.onClear();

        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(minimizeButton);

        this.headerElement.appendChild(titleContainer);
        this.headerElement.appendChild(buttonContainer);
        this.loggerPanel.appendChild(this.headerElement);
    }

    private createContentContainer(): void {
        this.contentContainer = document.createElement("div");
        this.contentContainer.id = "vue-flow-vis-content-container";
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
        this.sidebar.id = "vue-flow-vis-sidebar";
        this.sidebar.style.width = "200px";
        this.sidebar.style.minWidth = "150px";
        this.sidebar.style.borderRight = "1px solid #ddd";
        this.sidebar.style.backgroundColor = "#f9f9f9";
        this.sidebar.style.position = "relative";
        this.sidebar.style.display = "flex";
        this.sidebar.style.flexDirection = "column";

        const sidebarHeader = this.createSidebarHeader();
        this.sidebar.appendChild(sidebarHeader);

        const sidebarContent = document.createElement("div");
        sidebarContent.id = "vue-flow-vis-sidebar-content";
        sidebarContent.style.flex = "1";
        sidebarContent.style.overflowY = "auto";
        sidebarContent.style.overflowX = "hidden";
        this.sidebar.appendChild(sidebarContent);

        this.contentContainer!.appendChild(this.sidebar);
    }

    private createSidebarHeader(): HTMLDivElement {
        const sidebarHeader = document.createElement("div");
        sidebarHeader.id = "vue-flow-vis-sidebar-header";
        sidebarHeader.style.padding = "0.5em";
        sidebarHeader.style.borderBottom = "1px solid #ddd";
        sidebarHeader.style.backgroundColor = "#f5f5f5";
        sidebarHeader.style.flexShrink = "0";

        const searchInput = document.createElement("input");
        searchInput.id = "vue-flow-vis-component-search";
        searchInput.type = "text";
        searchInput.placeholder = FILTER_COMPONENTS_PLACEHOLDER;
        searchInput.style.width = "100%";
        searchInput.style.padding = "0.4em";
        searchInput.style.fontFamily = 'monospace';
        searchInput.style.border = "1px solid #ddd";
        searchInput.style.borderRadius = "4px";
        searchInput.style.fontSize = "0.9em";
        searchInput.style.fontFamily = "Arial, sans-serif";
        searchInput.style.boxSizing = "border-box";
        searchInput.style.outline = "none";

        searchInput.addEventListener("focus", () => {
            searchInput.style.borderColor = "#007acc";
        });

        searchInput.addEventListener("blur", () => {
            searchInput.style.borderColor = "#ddd";
        });

        searchInput.addEventListener("input", () => {
            if (this.searchDebounceTimer !== null) {
                clearTimeout(this.searchDebounceTimer);
            }
            
            this.searchDebounceTimer = window.setTimeout(() => {
                const filter = searchInput.value.toLowerCase().trim();
                this.callbacks.onComponentFilterChange(filter);
                this.searchDebounceTimer = null;
            }, 300);
        });

        sidebarHeader.appendChild(searchInput);
        return sidebarHeader;
    }

    private createMainArea(): void {
        this.mainArea = document.createElement("div");
        this.mainArea.id = "vue-flow-vis-main-area";
        this.mainArea.style.flex = "1";
        this.mainArea.style.overflow = "hidden";
        this.mainArea.style.display = "flex";
        this.mainArea.style.flexDirection = "column";
        
        this.contentContainer!.appendChild(this.mainArea);
    }

    private createSidebarResizeHandle(): HTMLDivElement {
        const handle = document.createElement("div");
        handle.id = "vue-flow-vis-sidebar-resize-handle";
        handle.style.position = "absolute";
        handle.style.top = "0";
        handle.style.right = "-2px";
        handle.style.bottom = "0";
        handle.style.width = "4px";
        handle.style.cursor = "ew-resize";
        handle.style.backgroundColor = "transparent";
        handle.style.borderRight = "2px solid transparent";
        handle.style.transition = "border-color 0.2s ease";
        handle.style.zIndex = "3";
        
        handle.addEventListener("mouseenter", () => {
            handle.style.borderRightColor = "#007acc";
        });
        
        handle.addEventListener("mouseleave", () => {
            if (!this.isSidebarResizing) {
                handle.style.borderRightColor = "transparent";
            }
        });
        
        this.sidebar!.appendChild(handle);
        return handle;
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

    private toggleMinimize(): void {
        if (this.isMinimized) {
            this.loggerPanel.style.height = `${this.savedHeight}px`;
            this.loggerPanel.style.maxHeight = `${this.savedHeight}px`;
            this.loggerPanel.style.minHeight = "150px";
            this.contentContainer!.style.display = "flex";
            this.dragHandle.style.display = "block";
            this.leftResizeHandle.style.display = "block";
            
            const minimizeButton = this.headerElement!.querySelector(".minimize-button") as HTMLButtonElement;
            minimizeButton.innerHTML = createMinimizeIcon(14);
            minimizeButton.title = "Minimize panel";
            
            this.isMinimized = false;
        } else {
            this.savedHeight = parseInt(window.getComputedStyle(this.loggerPanel).height, 10);
            this.contentContainer!.style.display = "none";
            this.dragHandle.style.display = "none";
            this.leftResizeHandle.style.display = "none";
            
            const headerHeight = this.headerElement!.offsetHeight;
            this.loggerPanel.style.height = `${headerHeight}px`;
            this.loggerPanel.style.maxHeight = `${headerHeight}px`;
            this.loggerPanel.style.minHeight = `${headerHeight}px`;
            
            const minimizeButton = this.headerElement!.querySelector(".minimize-button") as HTMLButtonElement;
            minimizeButton.innerHTML = createExpandIcon(14);
            minimizeButton.title = "Restore panel";
            
            this.isMinimized = true;
        }
        
        this.callbacks.onMinimizeToggle();
    }

    // Public API methods for UILogger to use
    public getMainArea(): HTMLDivElement | undefined {
        return this.mainArea;
    }

    public getSidebar(): HTMLDivElement | undefined {
        return this.sidebar;
    }

    public getSidebarContent(): HTMLDivElement | null {
        return this.sidebar ? this.sidebar.querySelector("#vue-flow-vis-sidebar-content") as HTMLDivElement : null;
    }

    public clearSearchInput(): void {
        const searchInput = this.sidebar?.querySelector("#vue-flow-vis-component-search") as HTMLInputElement;
        if (searchInput) {
            searchInput.value = "";
        }
    }

    public destroy(): void {
        if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        document.removeEventListener("mousemove", this.onMouseMove.bind(this));
        document.removeEventListener("mouseup", this.onMouseUp.bind(this));
        
        if (this.loggerPanel.parentNode) {
            this.loggerPanel.parentNode.removeChild(this.loggerPanel);
        }
    }
}