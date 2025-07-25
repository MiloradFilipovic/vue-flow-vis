/* eslint-disable no-undef */
import { createFlowIcon, createMinimizeIcon, createExpandIcon, createTrashIcon } from "./icons";
import { PLUGIN_URL } from "./constants";
import { APP_NAME, FILTER_COMPONENTS_PLACEHOLDER } from "./strings";
import { theme } from "./theme";

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
        panel.style.bottom = theme.positioning.panelBottom;
        panel.style.right = theme.positioning.panelRight;
        panel.style.width = theme.sizes.panelWidth;
        panel.style.height = theme.sizes.panelHeight;
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.backgroundColor = theme.colors.backgroundPrimary;
        panel.style.border = `${theme.borderWidths.thin} solid ${theme.colors.borderLight}`;
        panel.style.zIndex = theme.zIndex.modal.toString();
        panel.style.fontFamily = theme.fonts.primary;
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
        handle.style.height = theme.sizes.dragHandleHeight;
        handle.style.cursor = "ns-resize";
        handle.style.backgroundColor = theme.colors.transparent;
        handle.style.borderTop = `${theme.borderWidths.medium} solid ${theme.colors.transparent}`;
        handle.style.transition = `border-color ${theme.transitions.normal}`;
        handle.style.zIndex = theme.zIndex.elevated.toString();
        
        handle.addEventListener("mouseenter", () => {
            handle.style.borderTopColor = theme.colors.primary;
        });
        
        handle.addEventListener("mouseleave", () => {
            if (!this.isDragging) {
                handle.style.borderTopColor = theme.colors.transparent;
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
        handle.style.width = theme.sizes.resizeHandleWidth;
        handle.style.cursor = "ew-resize";
        handle.style.backgroundColor = theme.colors.transparent;
        handle.style.borderLeft = `${theme.borderWidths.medium} solid ${theme.colors.transparent}`;
        handle.style.transition = `border-color ${theme.transitions.normal}`;
        handle.style.zIndex = theme.zIndex.elevated.toString();
        
        handle.addEventListener("mouseenter", () => {
            handle.style.borderLeftColor = theme.colors.primary;
        });
        
        handle.addEventListener("mouseleave", () => {
            if (!this.isLeftResizing) {
                handle.style.borderLeftColor = theme.colors.transparent;
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
        this.headerElement.style.zIndex = theme.zIndex.base.toString();
        this.headerElement.style.backgroundColor = theme.colors.backgroundTertiary;
        this.headerElement.style.padding = `${theme.spacing.sm} ${theme.spacing.md}`;
        this.headerElement.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        this.headerElement.style.userSelect = "none";

        const titleContainer = document.createElement("div");
        titleContainer.id = "vue-flow-vis-title-container";
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.gap = theme.spacing.md;
        titleContainer.style.alignContent = "center";

        const pluginLink = document.createElement("a");
        pluginLink.id = "vue-flow-vis-plugin-link";
        pluginLink.href = PLUGIN_URL;
        pluginLink.target = "_blank";
        pluginLink.style.textDecoration = "none";
        pluginLink.style.color = theme.colors.black;
        titleContainer.appendChild(pluginLink);

        const icon = document.createElement("span");
        icon.id = "vue-flow-vis-header-icon";
        icon.innerHTML = createFlowIcon(18);
        icon.style.color = theme.colors.black;
        icon.style.position = "relative";
        icon.style.top = theme.positioning.iconOffset;
        pluginLink.appendChild(icon);
        
        icon.onmouseover = (): void => {
            icon.style.color = theme.colors.primaryHover;
        };
        icon.onmouseout = (): void => {
            icon.style.color = theme.colors.black;
        };

        const title = document.createElement("span");
        title.id = "vue-flow-vis-title";
        title.textContent = APP_NAME;
        title.style.fontFamily = theme.fonts.primary;
        title.style.paddingBottom = theme.positioning.iconOffset2;
        titleContainer.appendChild(title);

        const buttonContainer = document.createElement("div");
        buttonContainer.id = "vue-flow-vis-button-container";
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = theme.spacing.md;
        buttonContainer.style.alignItems = "center";

        const minimizeButton = document.createElement("button");
        minimizeButton.id = "vue-flow-vis-minimize-button";
        minimizeButton.innerHTML = createMinimizeIcon(14);
        minimizeButton.style.color = theme.colors.black;
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
        clearButton.style.color = theme.colors.black;
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
        this.sidebar.style.width = theme.sizes.sidebarWidth;
        this.sidebar.style.minWidth = theme.sizes.sidebarMinWidth;
        this.sidebar.style.borderRight = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        this.sidebar.style.backgroundColor = theme.colors.backgroundSecondary;
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
        sidebarHeader.style.padding = theme.spacing.md;
        sidebarHeader.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        sidebarHeader.style.backgroundColor = theme.colors.backgroundTertiary;
        sidebarHeader.style.flexShrink = "0";

        const searchInput = document.createElement("input");
        searchInput.id = "vue-flow-vis-component-search";
        searchInput.type = "text";
        searchInput.placeholder = FILTER_COMPONENTS_PLACEHOLDER;
        searchInput.style.width = "100%";
        searchInput.style.padding = theme.sizes.inputPadding;
        searchInput.style.border = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        searchInput.style.borderRadius = theme.borderRadius.md;
        searchInput.style.fontSize = theme.fontSizes.sm;
        searchInput.style.fontFamily = theme.fonts.primary;
        searchInput.style.boxSizing = "border-box";
        searchInput.style.outline = "none";

        searchInput.addEventListener("focus", () => {
            searchInput.style.borderColor = theme.colors.primary;
        });

        searchInput.addEventListener("blur", () => {
            searchInput.style.borderColor = theme.colors.border;
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