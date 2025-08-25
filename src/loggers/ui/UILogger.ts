/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../../types";
import { createComponentIcon, createTrackIcon, createTriggerIcon, createFlowIcon, createClockIcon } from "./icons";
import { EVENT_DETAILS_HEADER_DEBUGGER_EVENT, EVENT_DETAILS_HEADER_ORIGINAL, MAIN_AREA_PLACEHOLDER } from "./strings";
import { UIManager, UIManagerCallbacks } from "./UIManager";
import { theme } from "./theme";
import { VUE_DEBUGGER_EVENT_URL } from "./constants";
import { ObjectInspector } from "./objectInspector/ObjectInspector";
import { VirtualScrollManager } from "./VirtualScrollManager";

type ComponentGroup = {
    sidebarItem: HTMLDivElement;
    events: Array<{type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData}>;
    eventCount: number;
    componentPath?: string;
}

type SelectedEvent = {
    type: 'tracked' | 'triggered';
    timestamp: string;
    componentName: string;
    eventData: RenderEventData;
    eventIndex: number;
}

export class UILogger implements Logger {
    private uiManager: UIManager;
    private componentGroups: Map<string, ComponentGroup> = new Map();
    private selectedComponent: string | null = null;
    private selectedEvent: SelectedEvent | null = null;
    private showTrackedEvents = true;
    private showTriggeredEvents = true;
    private componentFilter = "";
    private objectInspector: ObjectInspector;
    
    // Virtual scrolling state
    private virtualScrollManager: VirtualScrollManager | null = null;
    private virtualScrollContainer: HTMLDivElement | null = null;
    private virtualScrollContent: HTMLDivElement | null = null;
    private virtualScrollSpacer: HTMLDivElement | null = null;
    private currentEvents: Array<{type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData, originalIndex: number}> = [];
    private currentComponentName: string | null = null;
    private readonly ITEM_HEIGHT = 30; // Height of each event item in pixels
    private readonly BUFFER_SIZE = 5; // Extra items to render outside viewport
    
    // Event details resize state
    private isEventDetailsResizing = false;
    private startEventDetailsX = 0;
    private startEventDetailsWidth = 0;

    constructor() {
        const callbacks: UIManagerCallbacks = {
            onClear: () => this.clear(),
            onMinimizeToggle: () => {},
            onComponentFilterChange: (filter: string) => {
                this.componentFilter = filter;
                this.filterComponents();
            }
        };
        
        this.uiManager = new UIManager(callbacks);
        
        // Initialize ObjectInspector
        this.objectInspector = new ObjectInspector({
            showPrototype: true,
            showNonEnumerable: true,
        });
        
        // Setup global mouse event listeners for event details resizing
        this.setupEventDetailsResizeListeners();
        
        this.showPlaceholderText();
    }

    private showPlaceholderText(): void {
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) return;
        
        mainArea.innerHTML = "";
        const placeholder = document.createElement("div");
        placeholder.id = "vue-flow-vis-placeholder";
        placeholder.style.display = "flex";
        placeholder.style.flexDirection = "column";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.height = "100%";
        placeholder.style.color = theme.colors.textMuted;
        placeholder.style.fontFamily = theme.fonts.primary;
        placeholder.style.textAlign = "center";
        
        const icon = document.createElement("div");
        icon.id = "vue-flow-vis-placeholder-icon";
        icon.innerHTML = createFlowIcon(32);
        icon.style.color = theme.colors.primary;
        icon.style.opacity = theme.opacity.disabled;
        icon.style.marginBottom = theme.spacing.md;
        
        const text = document.createElement("p");
        text.id = "vue-flow-vis-placeholder-text";
        text.textContent = MAIN_AREA_PLACEHOLDER;
        text.style.fontFamily = theme.fonts.primary;
        text.style.margin = "0";
        text.style.fontSize = theme.fontSizes.sm;
        
        placeholder.appendChild(icon);
        placeholder.appendChild(text);
        mainArea.appendChild(placeholder);
    }

    private getOrCreateComponentGroup(componentName: string, componentPath?: string): ComponentGroup {
        const sidebarContent = this.uiManager.getSidebarContent();
        if (!sidebarContent) {
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
        sidebarItem.id = `vue-flow-vis-sidebar-item-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        sidebarItem.style.display = "flex";
        sidebarItem.style.padding = theme.spacing.lg;
        sidebarItem.style.cursor = "pointer";
        sidebarItem.style.gap = theme.spacing.md;
        sidebarItem.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        sidebarItem.style.userSelect = "none";
        sidebarItem.style.fontFamily = theme.fonts.primary;
        sidebarItem.style.fontSize = theme.fontSizes.sm;
        sidebarItem.style.transition = `background-color ${theme.transitions.normal}`;

        sidebarItem.onmouseenter = (): void => {
            if (this.selectedComponent !== componentName) {
                sidebarItem.style.backgroundColor = theme.colors.backgroundHover;
            }
        };

        sidebarItem.onmouseleave = (): void => {
            if (this.selectedComponent !== componentName) {
                sidebarItem.style.backgroundColor = theme.colors.transparent;
            }
        };

        sidebarItem.onclick = (): void => {
            this.selectComponent(componentName);
        };

        sidebarContent.appendChild(sidebarItem);

        const group: ComponentGroup = {
            sidebarItem,
            events: [],
            eventCount: 0,
            componentPath
        };

        this.componentGroups.set(componentName, group);
        this.updateSidebarItem(componentName, componentPath);

        return group;
    }

    private updateSidebarItem(componentName: string, _componentPath?: string): void {
        const group = this.componentGroups.get(componentName);
        if (!group) return;

        const icon = document.createElement("span");
        icon.id = `vue-flow-vis-sidebar-icon-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        icon.innerHTML = createComponentIcon(14);
        icon.style.color = theme.colors.primary;
        icon.style.position = "relative";
        icon.style.top = theme.positioning.iconOffset;
        icon.style.flexShrink = "0";

        const nameContainer = document.createElement("div");
        nameContainer.id = `vue-flow-vis-name-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        nameContainer.style.display = "flex";
        nameContainer.style.flex = "1";
        nameContainer.style.flexDirection = "column";
        nameContainer.style.gap = theme.positioning.iconOffset2;
        nameContainer.style.overflow = "hidden";

        const nameSpan = document.createElement("div");
        nameSpan.id = `vue-flow-vis-name-span-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        nameSpan.textContent = componentName;
        nameSpan.style.fontWeight = "bold";
        nameSpan.style.whiteSpace = "nowrap";
        nameSpan.style.overflow = "hidden";
        nameSpan.style.textOverflow = "ellipsis";

        const countSpan = document.createElement("div");
        countSpan.id = `vue-flow-vis-count-span-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        countSpan.textContent = `${group.eventCount} events`;
        countSpan.style.fontSize = theme.fontSizes.xs;
        countSpan.style.color = theme.colors.textMuted;

        nameContainer.appendChild(nameSpan);
        nameContainer.appendChild(countSpan);

        group.sidebarItem.innerHTML = "";
        group.sidebarItem.appendChild(icon);
        group.sidebarItem.appendChild(nameContainer);

        // Apply current filter to the updated item
        const shouldShow = this.componentFilter === "" || 
                         componentName.toLowerCase().includes(this.componentFilter);
        group.sidebarItem.style.display = shouldShow ? "flex" : "none";
    }

    private addEventToGroup(componentName: string, eventType: 'tracked' | 'triggered', eventData: RenderEventData, componentPath?: string): void {
        const group = this.getOrCreateComponentGroup(componentName, componentPath);
        
        // Update componentPath if it's provided and not already set
        if (componentPath && !group.componentPath) {
            group.componentPath = componentPath;
        }
        
        group.eventCount++;
        
        const timestamp = new Date().toLocaleTimeString();
        group.events.push({type: eventType, timestamp, eventData});
        
        if (this.selectedComponent === componentName) {
            // Use incremental update instead of full redisplay to preserve scroll position
            const visibleEvents = group.events
                .map((event, originalIndex) => ({ ...event, originalIndex }))
                .filter(event => 
                    (event.type === 'tracked' && this.showTrackedEvents) || 
                    (event.type === 'triggered' && this.showTriggeredEvents)
                );
            this.updateVirtualScrolling(componentName, visibleEvents);
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
        this.selectedEvent = null; // Clear selected event when switching components
        const currentGroup = this.componentGroups.get(componentName);
        if (currentGroup) {
            currentGroup.sidebarItem.style.backgroundColor = theme.colors.backgroundHover;
        }

        this.displayComponentEvents(componentName);
    }

    private displayComponentEvents(componentName: string): void {
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) return;

        const group = this.componentGroups.get(componentName);
        if (!group) return;

        mainArea.innerHTML = "";

        const header = document.createElement("div");
        header.id = `vue-flow-vis-component-header-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        header.style.display = "flex";
        header.style.padding = `${theme.spacing.sm} ${theme.spacing.md}`;
        header.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        header.style.flexShrink = "0";

        const icon = document.createElement("span");
        icon.id = `vue-flow-vis-component-icon-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        icon.innerHTML = createComponentIcon(14);
        icon.style.color = theme.colors.primary;
        icon.style.marginRight = theme.spacing.md;
        icon.style.position = "relative";
        icon.style.top = theme.positioning.iconOffset2;

        const title = document.createElement("h3");
        title.id = `vue-flow-vis-component-title-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const displayText = group.componentPath || componentName;
        title.textContent = `${displayText}`;
        title.style.margin = "0";
        title.style.fontFamily = theme.fonts.primary;
        title.style.fontSize = theme.fontSizes.base;
        title.style.position = "relative";
        title.style.top = theme.positioning.iconOffset;

        header.appendChild(icon);
        header.appendChild(title);
        mainArea.appendChild(header);

        const contentArea = document.createElement("div");
        contentArea.id = `vue-flow-vis-content-area-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        contentArea.style.flex = "1";
        contentArea.style.display = "flex";
        contentArea.style.minHeight = "0";

        const eventsListArea = document.createElement("div");
        eventsListArea.id = `vue-flow-vis-events-list-area-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        // Set flex based on whether an event is selected
        eventsListArea.style.flex = this.selectedEvent ? "0 0 30%" : "1";
        eventsListArea.style.display = "flex";
        eventsListArea.style.flexDirection = "column";
        eventsListArea.style.minHeight = "0";

        const eventsHeader = document.createElement("div");
        eventsHeader.id = `vue-flow-vis-events-header-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        eventsHeader.style.margin = `0 0 ${theme.spacing.md} 0`;
        eventsHeader.style.display = "flex";
        eventsHeader.style.justifyContent = "end";
        eventsHeader.style.padding = `${theme.spacing.sm} ${theme.spacing.md}`;
        eventsHeader.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        eventsHeader.style.gap = theme.spacing.md;

        const triggerButton = document.createElement("button");
        triggerButton.id = `vue-flow-vis-trigger-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        triggerButton.innerHTML = createTriggerIcon(14);
        triggerButton.style.color = this.showTriggeredEvents ? theme.colors.triggered : theme.colors.textDisabled;
        triggerButton.style.border = "none";
        triggerButton.style.cursor = "pointer";
        triggerButton.style.backgroundColor = "transparent";
        triggerButton.style.padding = "0";
        triggerButton.style.position = "relative";
        triggerButton.style.top = theme.positioning.iconOffset2;
        triggerButton.title = this.showTriggeredEvents ? "Hide render triggered events" : "Show render triggered events";
        triggerButton.onclick = (): void => this.toggleTriggeredEvents();

        const trackedButton = document.createElement("button");
        trackedButton.id = `vue-flow-vis-tracked-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        trackedButton.innerHTML = createTrackIcon(14);
        trackedButton.style.color = this.showTrackedEvents ? theme.colors.tracked : theme.colors.textDisabled;
        trackedButton.style.border = "none";
        trackedButton.style.cursor = "pointer";
        trackedButton.style.backgroundColor = "transparent";
        trackedButton.style.padding = "0";
        trackedButton.style.position = "relative";
        trackedButton.style.top = theme.positioning.iconOffset2;
        trackedButton.title = this.showTrackedEvents ? "Hide render tracked events" : "Show render tracked events";
        trackedButton.onclick = (): void => this.toggleTrackedEvents();

        eventsHeader.appendChild(triggerButton);
        eventsHeader.appendChild(trackedButton);

        eventsListArea.appendChild(eventsHeader);

        // Create virtual scrolling container
        this.virtualScrollContainer = document.createElement("div");
        this.virtualScrollContainer.id = `vue-flow-vis-virtual-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        this.virtualScrollContainer.style.flex = "1";
        this.virtualScrollContainer.style.overflow = "auto";
        this.virtualScrollContainer.style.minHeight = "0";
        this.virtualScrollContainer.style.width = "100%";
        this.virtualScrollContainer.style.boxSizing = "border-box";

        // Get filtered events for virtual scrolling with original indices
        const visibleEvents = group.events
            .map((event, originalIndex) => ({ ...event, originalIndex }))
            .filter(event => 
                (event.type === 'tracked' && this.showTrackedEvents) || 
                (event.type === 'triggered' && this.showTriggeredEvents)
            );

        if (visibleEvents.length === 0) {
            const noEvents = document.createElement("p");
            noEvents.id = `vue-flow-vis-no-events-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            noEvents.textContent = group.events.length === 0 ? "No events recorded yet" : "No events to display";
            noEvents.style.color = theme.colors.textMuted;
            noEvents.style.fontStyle = "italic";
            noEvents.style.margin = "0";
            noEvents.style.padding = theme.spacing.xl;
            this.virtualScrollContainer.appendChild(noEvents);
        } else {
            this.setupVirtualScrolling(componentName, visibleEvents);
        }

        eventsListArea.appendChild(this.virtualScrollContainer);
        contentArea.appendChild(eventsListArea);

        mainArea.appendChild(contentArea);
        
        // Add event details area if an event is selected
        this.updateEventDetailsArea();
    }

    private setupVirtualScrolling(componentName: string, events: Array<{type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData, originalIndex: number}>): void {
        if (!this.virtualScrollContainer) return;

        // Store current events and component name
        this.currentEvents = events;
        this.currentComponentName = componentName;

        // Create spacer div for total height
        this.virtualScrollSpacer = document.createElement("div");
        this.virtualScrollSpacer.id = `vue-flow-vis-virtual-spacer-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        this.virtualScrollSpacer.style.height = `${events.length * this.ITEM_HEIGHT}px`;
        this.virtualScrollSpacer.style.pointerEvents = "none";

        // Create content container for visible items
        this.virtualScrollContent = document.createElement("div");
        this.virtualScrollContent.id = `vue-flow-vis-virtual-content-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        this.virtualScrollContent.style.position = "absolute";
        this.virtualScrollContent.style.top = "0";
        this.virtualScrollContent.style.width = "100%";
        this.virtualScrollContent.style.pointerEvents = "auto";

        // Setup virtual scroll manager
        const containerHeight = 300; // Default container height, will be updated dynamically
        this.virtualScrollManager = new VirtualScrollManager({
            itemHeight: this.ITEM_HEIGHT,
            containerHeight: containerHeight,
            buffer: this.BUFFER_SIZE,
            totalItems: events.length
        });

        // Remove existing scroll listener if any
        this.virtualScrollContainer.removeEventListener('scroll', this.handleScroll);

        // Add scroll event listener
        this.virtualScrollContainer.addEventListener('scroll', this.handleScroll);

        // Initial render
        this.handleScroll();

        // Setup container with relative positioning
        this.virtualScrollContainer.style.position = "relative";
        this.virtualScrollContainer.appendChild(this.virtualScrollSpacer);
        this.virtualScrollContainer.appendChild(this.virtualScrollContent);
    }

    private handleScroll = (): void => {
        if (this.currentComponentName && this.currentEvents.length > 0) {
            this.handleVirtualScroll(this.currentComponentName, this.currentEvents);
        }
    };

    private handleVirtualScroll(componentName: string, events: Array<{type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData, originalIndex: number}>): void {
        if (!this.virtualScrollManager || !this.virtualScrollContainer || !this.virtualScrollContent) return;

        const scrollTop = this.virtualScrollContainer.scrollTop;
        const containerHeight = this.virtualScrollContainer.clientHeight;

        // Update container height in virtual scroll manager
        this.virtualScrollManager.updateOptions({ containerHeight });

        const { startIndex, endIndex, offsetY } = this.virtualScrollManager.calculateVisibleRange(scrollTop);

        // Clear existing content
        this.virtualScrollContent.innerHTML = "";
        this.virtualScrollContent.style.transform = `translateY(${offsetY}px)`;

        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
            const event = events[i];
            if (!event) continue;

            const eventDiv = this.createEventElement(componentName, event, event.originalIndex);
            this.virtualScrollContent.appendChild(eventDiv);
        }
    }

    private createEventElement(componentName: string, event: {type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData}, eventIndex: number): HTMLDivElement {
        const eventDiv = document.createElement("div");
        eventDiv.id = `vue-flow-vis-event-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
        eventDiv.style.display = "flex";
        eventDiv.style.alignItems = "center";
        eventDiv.style.height = `${this.ITEM_HEIGHT}px`;
        eventDiv.style.minHeight = `${this.ITEM_HEIGHT}px`;
        eventDiv.style.padding = theme.spacing.md;
        eventDiv.style.border = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        eventDiv.style.borderRadius = theme.borderRadius.md;
        eventDiv.style.fontFamily = theme.fonts.primary;
        eventDiv.style.fontSize = theme.fontSizes.sm;
        eventDiv.style.cursor = "pointer";
        eventDiv.style.transition = `background-color ${theme.transitions.normal}`;
        eventDiv.style.width = `calc(100% - ${theme.spacing.xl})`;
        eventDiv.style.boxSizing = "border-box";
        eventDiv.style.marginLeft = theme.spacing.md;
        eventDiv.style.marginRight = theme.spacing.md;
        eventDiv.style.marginBottom = theme.spacing.md;

        // Check if this event is selected and set initial background
        const isSelected = this.selectedEvent && 
            this.selectedEvent.eventIndex === eventIndex && 
            this.selectedEvent.componentName === componentName;

        eventDiv.style.backgroundColor = isSelected ? theme.colors.backgroundHover : theme.colors.backgroundSecondary;

        // Event delegation - store event index as data attribute
        eventDiv.dataset.eventIndex = eventIndex.toString();
        eventDiv.dataset.componentName = componentName;

        eventDiv.onmouseenter = (): void => {
            eventDiv.style.backgroundColor = theme.colors.backgroundHover;
        };

        eventDiv.onmouseleave = (): void => {
            const currentlySelected = this.selectedEvent && 
                this.selectedEvent.eventIndex === eventIndex && 
                this.selectedEvent.componentName === componentName;
            
            eventDiv.style.backgroundColor = currentlySelected ? theme.colors.backgroundHover : theme.colors.backgroundSecondary;
        };

        eventDiv.onclick = (): void => {
            this.selectEvent({
                type: event.type,
                timestamp: event.timestamp,
                componentName: componentName,
                eventData: event.eventData,
                eventIndex: eventIndex
            });
        };

        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = event.type === 'tracked' ? createTrackIcon(14) : createTriggerIcon(14);
        iconSpan.style.color = event.type === 'tracked' ? theme.colors.tracked : theme.colors.triggered;
        iconSpan.style.marginRight = theme.spacing.md;
        iconSpan.style.position = "relative";
        iconSpan.style.top = theme.positioning.iconOffset2;
        iconSpan.style.flexShrink = "0";

        const eventSpan = document.createElement("span");
        eventSpan.textContent = event.type === 'tracked' ? 'Render tracked' : 'Render triggered';
        eventSpan.style.color = event.type === 'tracked' ? theme.colors.tracked : theme.colors.triggered;
        eventSpan.style.flex = "1";

        const timestampContainer = document.createElement("span");
        timestampContainer.style.display = "flex";
        timestampContainer.style.alignItems = "center";
        timestampContainer.style.flexShrink = "0";
        timestampContainer.style.gap = theme.spacing.xs;

        const clockIcon = document.createElement("span");
        clockIcon.innerHTML = createClockIcon(12);
        clockIcon.style.color = theme.colors.textMuted;
        clockIcon.style.flexShrink = "0";
        clockIcon.style.position = "relative";
        clockIcon.style.top = theme.positioning.iconOffset;

        const timestampSpan = document.createElement("span");
        timestampSpan.textContent = event.timestamp;
        timestampSpan.style.color = theme.colors.textMuted;
        timestampSpan.style.fontSize = theme.fontSizes.xs;
        timestampSpan.style.fontFamily = theme.fonts.primary;

        timestampContainer.appendChild(clockIcon);
        timestampContainer.appendChild(timestampSpan);

        eventDiv.appendChild(iconSpan);
        eventDiv.appendChild(eventSpan);
        eventDiv.appendChild(timestampContainer);

        return eventDiv;
    }

    private updateVirtualScrolling(componentName: string, events: Array<{type: 'tracked' | 'triggered', timestamp: string, eventData: RenderEventData, originalIndex: number}>): void {
        if (!this.virtualScrollManager || !this.virtualScrollContainer || !this.virtualScrollSpacer) return;

        // Update stored events
        this.currentEvents = events;
        this.currentComponentName = componentName;

        // Check if user was scrolled near the bottom (within 100px)
        const scrollTop = this.virtualScrollContainer.scrollTop;
        const scrollHeight = this.virtualScrollContainer.scrollHeight;
        const clientHeight = this.virtualScrollContainer.clientHeight;
        const wasNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

        // Update the total height for the new number of events
        const newTotalHeight = events.length * this.ITEM_HEIGHT;
        this.virtualScrollSpacer.style.height = `${newTotalHeight}px`;

        // Update virtual scroll manager with new total items count
        this.virtualScrollManager.updateOptions({ totalItems: events.length });

        // Re-render visible items
        this.handleVirtualScroll(componentName, events);

        // If user was near the bottom, scroll to new bottom, otherwise preserve position
        if (wasNearBottom) {
            this.virtualScrollContainer.scrollTop = newTotalHeight - clientHeight;
        } else {
            this.virtualScrollContainer.scrollTop = scrollTop;
        }
    }

    private selectEvent(event: SelectedEvent): void {
        // Clear previous selection visual state
        if (this.selectedEvent && this.selectedComponent) {
            const prevEventDiv = document.querySelector(`#vue-flow-vis-event-${this.selectedComponent.replace(/[^a-zA-Z0-9]/g, '-')}-${this.selectedEvent.eventIndex}`) as HTMLDivElement;
            if (prevEventDiv) {
                prevEventDiv.style.backgroundColor = theme.colors.backgroundSecondary;
            }
        }

        this.selectedEvent = event;

        // Update visual state for newly selected event
        const currentEventDiv = document.querySelector(`#vue-flow-vis-event-${event.componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${event.eventIndex}`) as HTMLDivElement;
        if (currentEventDiv) {
            currentEventDiv.style.backgroundColor = theme.colors.backgroundHover;
        }

        // Update or create the event details area
        this.updateEventDetailsArea();
    }

    private updateEventDetailsArea(): void {
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) return;

        const contentArea = mainArea.querySelector('#vue-flow-vis-content-area-' + this.selectedComponent?.replace(/[^a-zA-Z0-9]/g, '-')) as HTMLDivElement;
        if (!contentArea) return;

        // Update event list area flex based on selection state
        const eventsListArea = contentArea.querySelector('#vue-flow-vis-events-list-area-' + this.selectedComponent?.replace(/[^a-zA-Z0-9]/g, '-')) as HTMLDivElement;
        if (eventsListArea) {
            eventsListArea.style.flex = this.selectedEvent ? "0 0 30%" : "1";
        }

        // Remove existing details area if it exists
        const existingDetailsArea = contentArea.querySelector('#vue-flow-vis-event-details-area');
        if (existingDetailsArea) {
            existingDetailsArea.remove();
        }

        // Add new details area if an event is selected
        if (this.selectedEvent) {
            const detailsArea = this.createEventDetailsArea();
            contentArea.appendChild(detailsArea);
        }
    }

    private createEventDetailsArea(): HTMLDivElement {
        const detailsArea = document.createElement("div");
        detailsArea.id = "vue-flow-vis-event-details-area";
        detailsArea.style.flex = "0 0 70%";
        detailsArea.style.display = "flex";
        detailsArea.style.flexDirection = "column";
        detailsArea.style.minHeight = "0";
        detailsArea.style.borderLeft = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        detailsArea.style.overflow = "auto";
        detailsArea.style.position = "relative";
        
        // Create resize handle for the left border
        const resizeHandle = document.createElement("div");
        resizeHandle.id = "vue-flow-vis-event-details-resize-handle";
        resizeHandle.style.position = "absolute";
        resizeHandle.style.top = "0";
        resizeHandle.style.left = "-2px";
        resizeHandle.style.bottom = "0";
        resizeHandle.style.width = "4px";
        resizeHandle.style.cursor = "ew-resize";
        resizeHandle.style.backgroundColor = "transparent";
        resizeHandle.style.borderLeft = "2px solid transparent";
        resizeHandle.style.transition = "border-color 0.2s ease";
        resizeHandle.style.zIndex = "3";
        
        resizeHandle.addEventListener("mouseenter", () => {
            resizeHandle.style.borderLeftColor = theme.colors.primary;
        });
        
        resizeHandle.addEventListener("mouseleave", () => {
            if (!this.isEventDetailsResizing) {
                resizeHandle.style.borderLeftColor = "transparent";
            }
        });
        
        resizeHandle.addEventListener("mousedown", this.onEventDetailsMouseDown.bind(this));
        
        detailsArea.appendChild(resizeHandle);

        // Create header
        const detailsHeader = document.createElement("div");
        detailsHeader.id = "vue-flow-vis-event-details-header";
        detailsHeader.style.margin = `0 0 ${theme.spacing.md} 0`;
        detailsHeader.style.display = "flex";
        detailsHeader.style.justifyContent = "start";
        detailsHeader.style.padding = `${theme.spacing.sm} ${theme.spacing.md}`;
        detailsHeader.style.borderBottom = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        detailsHeader.style.gap = theme.spacing.md;
        detailsHeader.style.lineHeight = "1.3";

        const headerContainer = document.createElement("span");
        headerContainer.id = "vue-flow-vis-event-details-title";
        headerContainer.style.fontFamily = theme.fonts.primary;
        headerContainer.style.color = theme.colors.text;
        headerContainer.style.fontWeight = "bold";

        const originalText = document.createElement("span");
        originalText.textContent = `${EVENT_DETAILS_HEADER_ORIGINAL} `;
        
        const debuggerEventLink = document.createElement("a");
        debuggerEventLink.id = "vue-flow-vis-debugger-event-link";
        debuggerEventLink.textContent = EVENT_DETAILS_HEADER_DEBUGGER_EVENT;
        debuggerEventLink.href = VUE_DEBUGGER_EVENT_URL;
        debuggerEventLink.target = "_blank";
        debuggerEventLink.rel = "noopener noreferrer";
        debuggerEventLink.style.color = theme.colors.black;
        debuggerEventLink.style.textDecoration = "underline";
        debuggerEventLink.style.fontFamily = theme.fonts.primary;
        debuggerEventLink.style.fontWeight = "bold";
        debuggerEventLink.style.cursor = "pointer";

        headerContainer.appendChild(originalText);
        headerContainer.appendChild(debuggerEventLink);
        detailsHeader.appendChild(headerContainer);
        detailsArea.appendChild(detailsHeader);

        // Add content area for the object inspector
        if (this.selectedEvent) {
            const contentContainer = document.createElement("div");
            contentContainer.id = "vue-flow-vis-event-details-content";
            contentContainer.style.flex = "1";
            contentContainer.style.padding = `${theme.spacing.md}`;
            contentContainer.style.overflow = "auto";

            // Use the pre-configured ObjectInspector instance
            const inspectorElement = this.objectInspector.render(this.selectedEvent.eventData.event, 'event');
            contentContainer.appendChild(inspectorElement);

            detailsArea.appendChild(contentContainer);
        }

        return detailsArea;
    }
    
    private setupEventDetailsResizeListeners(): void {
        document.addEventListener("mousemove", this.onEventDetailsMouseMove.bind(this));
        document.addEventListener("mouseup", this.onEventDetailsMouseUp.bind(this));
    }
    
    private onEventDetailsMouseDown(event: MouseEvent): void {
        this.isEventDetailsResizing = true;
        this.startEventDetailsX = event.clientX;
        
        const detailsArea = document.querySelector('#vue-flow-vis-event-details-area') as HTMLDivElement;
        if (detailsArea) {
            this.startEventDetailsWidth = detailsArea.offsetWidth;
        }
        
        const resizeHandle = document.querySelector('#vue-flow-vis-event-details-resize-handle') as HTMLDivElement;
        if (resizeHandle) {
            resizeHandle.style.borderLeftColor = theme.colors.primary;
        }
        
        event.preventDefault();
        event.stopPropagation();
    }
    
    private onEventDetailsMouseMove(event: MouseEvent): void {
        if (!this.isEventDetailsResizing) return;
        
        const deltaX = this.startEventDetailsX - event.clientX;
        const newWidth = this.startEventDetailsWidth + deltaX;
        
        // Get the main area to calculate max width
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) return;
        
        const minWidth = 200; // Minimum width for event details
        const maxWidth = mainArea.offsetWidth * 0.8; // Max 80% of main area
        
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Calculate the remaining width for events list
        const totalWidth = mainArea.offsetWidth;
        const eventListWidth = totalWidth - clampedWidth;
        const eventListMinWidth = 150;
        
        // Ensure event list has minimum width
        if (eventListWidth < eventListMinWidth) {
            return;
        }
        
        // Update the flex basis for both areas
        const detailsArea = document.querySelector('#vue-flow-vis-event-details-area') as HTMLDivElement;
        const eventsListArea = document.querySelector(`#vue-flow-vis-events-list-area-${this.selectedComponent?.replace(/[^a-zA-Z0-9]/g, '-')}`) as HTMLDivElement;
        
        if (detailsArea && eventsListArea) {
            const detailsPercentage = (clampedWidth / totalWidth) * 100;
            const eventsPercentage = ((totalWidth - clampedWidth) / totalWidth) * 100;
            
            detailsArea.style.flex = `0 0 ${detailsPercentage}%`;
            eventsListArea.style.flex = `0 0 ${eventsPercentage}%`;
        }
    }
    
    private onEventDetailsMouseUp(): void {
        this.isEventDetailsResizing = false;
        
        const resizeHandle = document.querySelector('#vue-flow-vis-event-details-resize-handle') as HTMLDivElement;
        if (resizeHandle) {
            resizeHandle.style.borderLeftColor = "transparent";
        }
    }

    tracked(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, 'tracked', data, data.componentPath);
    }

    triggered(data: RenderEventData): void {
        this.addEventToGroup(data.componentName, "triggered", data, data.componentPath);
    }

    error(error: Error, _context?: unknown): void {
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) {
            return;
        }

        const errorDiv = document.createElement("div");
        errorDiv.id = `vue-flow-vis-error-${Date.now()}`;
        errorDiv.style.color = "red";
        errorDiv.style.marginBottom = theme.spacing.md;
        errorDiv.style.padding = theme.spacing.md;
        errorDiv.style.border = `${theme.borderWidths.thin} solid ${theme.colors.borderError}`;
        errorDiv.style.borderRadius = theme.borderRadius.md;
        errorDiv.style.backgroundColor = theme.colors.backgroundError;
        errorDiv.style.fontFamily = theme.fonts.primary;
        errorDiv.style.fontSize = theme.fontSizes.sm;
        
        const timestamp = new Date().toLocaleTimeString();
        errorDiv.textContent = `[${timestamp}] [Error] ${error.message}`;
        
        if (this.selectedComponent) {
            mainArea.appendChild(errorDiv);
        } else {
            mainArea.innerHTML = "";
            mainArea.appendChild(errorDiv);
        }
    }


    private clear(): void {
        const sidebarContent = this.uiManager.getSidebarContent();
        if (!sidebarContent) {
            return;
        }
        
        this.componentGroups.clear();
        this.selectedComponent = null;
        this.selectedEvent = null;
        this.componentFilter = "";
        
        // Clean up virtual scrolling state
        if (this.virtualScrollContainer) {
            this.virtualScrollContainer.removeEventListener('scroll', this.handleScroll);
        }
        this.virtualScrollManager = null;
        this.virtualScrollContainer = null;
        this.virtualScrollContent = null;
        this.virtualScrollSpacer = null;
        this.currentEvents = [];
        this.currentComponentName = null;
        
        this.uiManager.clearSearchInput();
        sidebarContent.innerHTML = "";
        this.showPlaceholderText();
    }

    private toggleTriggeredEvents(): void {
        this.showTriggeredEvents = !this.showTriggeredEvents;
        if (this.selectedComponent) {
            this.refreshEventsList(this.selectedComponent);
        }
    }

    private toggleTrackedEvents(): void {
        this.showTrackedEvents = !this.showTrackedEvents;
        if (this.selectedComponent) {
            this.refreshEventsList(this.selectedComponent);
        }
    }

    private refreshEventsList(componentName: string): void {
        const group = this.componentGroups.get(componentName);
        if (!group) return;

        // Update filter button colors
        const triggerButton = document.querySelector(`#vue-flow-vis-trigger-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`) as HTMLButtonElement;
        if (triggerButton) {
            triggerButton.style.color = this.showTriggeredEvents ? theme.colors.triggered : theme.colors.textDisabled;
            triggerButton.title = this.showTriggeredEvents ? "Hide render triggered events" : "Show render triggered events";
        }

        const trackedButton = document.querySelector(`#vue-flow-vis-tracked-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`) as HTMLButtonElement;
        if (trackedButton) {
            trackedButton.style.color = this.showTrackedEvents ? theme.colors.tracked : theme.colors.textDisabled;
            trackedButton.title = this.showTrackedEvents ? "Hide render tracked events" : "Show render tracked events";
        }

        // Find the virtual scroll container
        const virtualContainer = document.querySelector(`#vue-flow-vis-virtual-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`) as HTMLDivElement;
        if (!virtualContainer) return;

        // Get filtered events for virtual scrolling with original indices
        const visibleEvents = group.events
            .map((event, originalIndex) => ({ ...event, originalIndex }))
            .filter(event => 
                (event.type === 'tracked' && this.showTrackedEvents) || 
                (event.type === 'triggered' && this.showTriggeredEvents)
            );

        if (visibleEvents.length === 0) {
            // Clear the container and show no events message
            virtualContainer.innerHTML = "";
            const noEvents = document.createElement("p");
            noEvents.id = `vue-flow-vis-no-events-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            noEvents.textContent = group.events.length === 0 ? "No events recorded yet" : "No events to display";
            noEvents.style.color = theme.colors.textMuted;
            noEvents.style.fontStyle = "italic";
            noEvents.style.margin = "0";
            noEvents.style.padding = theme.spacing.xl;
            virtualContainer.appendChild(noEvents);
            
            // Clear virtual scrolling state
            if (this.virtualScrollContainer) {
                this.virtualScrollContainer.removeEventListener('scroll', this.handleScroll);
            }
            this.virtualScrollManager = null;
            this.virtualScrollContainer = null;
            this.virtualScrollContent = null;
            this.virtualScrollSpacer = null;
            this.currentEvents = [];
            this.currentComponentName = null;
        } else {
            // If virtual scrolling is already set up, just update it
            if (this.virtualScrollManager && this.virtualScrollContainer === virtualContainer && 
                this.virtualScrollSpacer && this.virtualScrollContent) {
                this.updateVirtualScrolling(componentName, visibleEvents);
            } else {
                // First time setup or container changed - clear and setup fresh
                virtualContainer.innerHTML = "";
                this.virtualScrollContainer = virtualContainer;
                this.setupVirtualScrolling(componentName, visibleEvents);
            }
        }
    }

    private filterComponents(): void {
        this.componentGroups.forEach((group, componentName) => {
            const shouldShow = this.componentFilter === "" || 
                             componentName.toLowerCase().includes(this.componentFilter);
            
            group.sidebarItem.style.display = shouldShow ? "flex" : "none";
        });
    }
}