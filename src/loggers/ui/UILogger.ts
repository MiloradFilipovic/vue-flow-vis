/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../../types";
import { createComponentIcon, createTrackIcon, createTriggerIcon, createFlowIcon } from "./icons";
import { MAIN_AREA_PLACEHOLDER } from "./strings";
import { UIManager, UIManagerCallbacks } from "./UIManager";

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
        placeholder.style.color = "#666";
        placeholder.style.fontFamily = "Arial, sans-serif";
        placeholder.style.textAlign = "center";
        
        const icon = document.createElement("div");
        icon.id = "vue-flow-vis-placeholder-icon";
        icon.innerHTML = createFlowIcon(32);
        icon.style.color = "#007acc";
        icon.style.opacity = "0.35";
        icon.style.marginBottom = "0.5em";
        
        const text = document.createElement("p");
        text.id = "vue-flow-vis-placeholder-text";
        text.textContent = MAIN_AREA_PLACEHOLDER;
        text.style.fontFamily = 'monospace';
        text.style.margin = "0";
        text.style.fontSize = "0.9em";
        
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
        icon.style.color = "#007acc";
        icon.style.position = "relative";
        icon.style.top = "1px";
        icon.style.flexShrink = "0";

        const nameContainer = document.createElement("div");
        nameContainer.id = `vue-flow-vis-name-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        nameContainer.style.display = "flex";
        nameContainer.style.flex = "1";
        nameContainer.style.flexDirection = "column";
        nameContainer.style.gap = "2px";
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
        countSpan.style.fontSize = "0.8em";
        countSpan.style.color = "#666";

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
        this.selectedEvent = null; // Clear selected event when switching components
        const currentGroup = this.componentGroups.get(componentName);
        if (currentGroup) {
            currentGroup.sidebarItem.style.backgroundColor = "#e9e9e9";
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
        header.style.padding = "0.3em 0.5em";
        header.style.borderBottom = "1px solid #ddd";
        header.style.flexShrink = "0";

        const icon = document.createElement("span");
        icon.id = `vue-flow-vis-component-icon-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        icon.innerHTML = createComponentIcon(14);
        icon.style.color = "#007acc";
        icon.style.marginRight = "0.5em";
        icon.style.position = "relative";
        icon.style.top = "2px";

        const title = document.createElement("h3");
        title.id = `vue-flow-vis-component-title-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const displayText = group.componentPath || componentName;
        title.textContent = `${displayText}`;
        title.style.margin = "0";
        title.style.fontFamily = "monospace";
        title.style.fontSize = "1em";
        title.style.position = "relative";
        title.style.top = "1px";

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
        eventsListArea.style.flex = "1";
        eventsListArea.style.display = "flex";
        eventsListArea.style.flexDirection = "column";
        eventsListArea.style.minHeight = "0";

        const eventsHeader = document.createElement("div");
        eventsHeader.id = `vue-flow-vis-events-header-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        eventsHeader.style.margin = "0 0 0.5em 0";
        eventsHeader.style.display = "flex";
        eventsHeader.style.justifyContent = "end";
        eventsHeader.style.padding = "0.3em 0.5em";
        eventsHeader.style.borderBottom = "1px solid #ddd";
        eventsHeader.style.gap = "0.5em";

        const triggerButton = document.createElement("button");
        triggerButton.id = `vue-flow-vis-trigger-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        triggerButton.innerHTML = createTriggerIcon(14);
        triggerButton.style.color = this.showTriggeredEvents ? "#ff9800" : "#ccc";
        triggerButton.style.border = "none";
        triggerButton.style.cursor = "pointer";
        triggerButton.style.backgroundColor = "transparent";
        triggerButton.style.padding = "0";
        triggerButton.style.position = "relative";
        triggerButton.style.top = "2px";
        triggerButton.title = this.showTriggeredEvents ? "Hide render triggered events" : "Show render triggered events";
        triggerButton.onclick = (): void => this.toggleTriggeredEvents();

        const trackedButton = document.createElement("button");
        trackedButton.id = `vue-flow-vis-tracked-button-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        trackedButton.innerHTML = createTrackIcon(14);
        trackedButton.style.color = this.showTrackedEvents ? "#068261ff" : "#ccc";
        trackedButton.style.border = "none";
        trackedButton.style.cursor = "pointer";
        trackedButton.style.backgroundColor = "transparent";
        trackedButton.style.padding = "0";
        trackedButton.style.position = "relative";
        trackedButton.style.top = "2px";
        trackedButton.title = this.showTrackedEvents ? "Hide render tracked events" : "Show render tracked events";
        trackedButton.onclick = (): void => this.toggleTrackedEvents();

        eventsHeader.appendChild(triggerButton);
        eventsHeader.appendChild(trackedButton);

        eventsListArea.appendChild(eventsHeader);

        const scrollableContainer = document.createElement("div");
        scrollableContainer.id = `vue-flow-vis-scrollable-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        scrollableContainer.style.flex = "1";
        scrollableContainer.style.overflow = "auto";
        scrollableContainer.style.minHeight = "0";
        scrollableContainer.style.width = "100%";
        scrollableContainer.style.boxSizing = "border-box";

        // Check if there are any visible events
        const visibleEvents = group.events.filter(event => 
            (event.type === 'tracked' && this.showTrackedEvents) || 
            (event.type === 'triggered' && this.showTriggeredEvents)
        );

        if (visibleEvents.length === 0) {
            const noEvents = document.createElement("p");
            noEvents.id = `vue-flow-vis-no-events-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            noEvents.textContent = group.events.length === 0 ? "No events recorded yet" : "No events to display";
            noEvents.style.color = "#666";
            noEvents.style.fontStyle = "italic";
            noEvents.style.margin = "0";
            noEvents.style.padding = "1em";
            scrollableContainer.appendChild(noEvents);
        } else {
            const eventsContainer = document.createElement("div");
            eventsContainer.id = `vue-flow-vis-events-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            eventsContainer.style.display = "flex";
            eventsContainer.style.flexDirection = "column";
            eventsContainer.style.gap = "0.5em";
            eventsContainer.style.width = "100%";
            eventsContainer.style.boxSizing = "border-box";

            group.events.forEach((event, eventIndex) => {
                // Filter events based on visibility state
                const shouldShow = (event.type === 'tracked' && this.showTrackedEvents) || 
                                 (event.type === 'triggered' && this.showTriggeredEvents);
                
                if (!shouldShow) {
                    return;
                }

                const eventDiv = document.createElement("div");
                eventDiv.id = `vue-flow-vis-event-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
                eventDiv.style.display = "block";
                eventDiv.style.padding = "0.5em";
                eventDiv.style.border = "1px solid #ddd";
                eventDiv.style.borderRadius = "4px";
                eventDiv.style.fontFamily = "monospace";
                eventDiv.style.fontSize = "0.9em";
                eventDiv.style.cursor = "pointer";
                eventDiv.style.transition = "background-color 0.2s";
                eventDiv.style.width = "calc(100% - 1em)";
                eventDiv.style.boxSizing = "border-box";
                eventDiv.style.marginLeft = "0.5em";
                eventDiv.style.marginRight = "0.5em";

                // Check if this event is selected and set initial background
                const isSelected = this.selectedEvent && 
                    this.selectedEvent.eventIndex === eventIndex && 
                    this.selectedEvent.componentName === componentName;

                eventDiv.style.backgroundColor = isSelected ? "#e9e9e9" : "#f9f9f9";

                eventDiv.onmouseenter = (): void => {
                    eventDiv.style.backgroundColor = "#e9e9e9";
                };

                eventDiv.onmouseleave = (): void => {
                    // Recalculate selection state on mouse leave
                    const currentlySelected = this.selectedEvent && 
                        this.selectedEvent.eventIndex === eventIndex && 
                        this.selectedEvent.componentName === componentName;
                    
                    eventDiv.style.backgroundColor = currentlySelected ? "#e9e9e9" : "#f9f9f9";
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
                iconSpan.id = `vue-flow-vis-event-icon-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
                iconSpan.innerHTML = event.type === 'tracked' ? createTrackIcon(14) : createTriggerIcon(14);
                iconSpan.style.color = event.type === 'tracked' ? "#068261ff" : "#ff9800";
                iconSpan.style.marginRight = "0.5em";
                iconSpan.style.position = "relative";
                iconSpan.style.top = "2px";

                const eventSpan = document.createElement("span");
                eventSpan.id = `vue-flow-vis-event-span-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
                eventSpan.textContent = event.type === 'tracked' ? 'Render tracked' : 'Render triggered';
                eventSpan.style.color = event.type === 'tracked' ? "#068261ff" : "#ff9800";

                eventDiv.appendChild(iconSpan);
                eventDiv.appendChild(eventSpan);
                eventsContainer.appendChild(eventDiv);
            });

            scrollableContainer.appendChild(eventsContainer);
        }

        eventsListArea.appendChild(scrollableContainer);
        contentArea.appendChild(eventsListArea);

        mainArea.appendChild(contentArea);
        
        // Add event details area if an event is selected
        this.updateEventDetailsArea();
    }

    private selectEvent(event: SelectedEvent): void {
        // Clear previous selection visual state
        if (this.selectedEvent && this.selectedComponent) {
            const prevEventDiv = document.querySelector(`#vue-flow-vis-event-${this.selectedComponent.replace(/[^a-zA-Z0-9]/g, '-')}-${this.selectedEvent.eventIndex}`) as HTMLDivElement;
            if (prevEventDiv) {
                prevEventDiv.style.backgroundColor = "#f9f9f9";
            }
        }

        this.selectedEvent = event;

        // Update visual state for newly selected event
        const currentEventDiv = document.querySelector(`#vue-flow-vis-event-${event.componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${event.eventIndex}`) as HTMLDivElement;
        if (currentEventDiv) {
            currentEventDiv.style.backgroundColor = "#e9e9e9";
        }

        // Update or create the event details area
        this.updateEventDetailsArea();
    }

    private updateEventDetailsArea(): void {
        const mainArea = this.uiManager.getMainArea();
        if (!mainArea) return;

        const contentArea = mainArea.querySelector('#vue-flow-vis-content-area-' + this.selectedComponent?.replace(/[^a-zA-Z0-9]/g, '-')) as HTMLDivElement;
        if (!contentArea) return;

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
        detailsArea.style.flex = "1";
        detailsArea.style.display = "flex";
        detailsArea.style.flexDirection = "column";
        detailsArea.style.minHeight = "0";
        detailsArea.style.padding = "0.5em";
        detailsArea.style.borderLeft = "1px solid #ddd";
        detailsArea.style.paddingLeft = "1em";
        detailsArea.style.overflow = "auto";

        if (this.selectedEvent) {
            const scrollableContent = document.createElement("div");
            scrollableContent.id = "vue-flow-vis-event-details-scrollable";
            scrollableContent.style.display = "flex";
            scrollableContent.style.flexDirection = "column";
            scrollableContent.style.gap = "0.5em";
            scrollableContent.style.overflow = "auto";
            scrollableContent.style.paddingRight = "0.5em";

            // Event Type
            scrollableContent.appendChild(this.createDetailField(
                "Event Type", 
                this.selectedEvent.type === 'tracked' ? 'Render tracked' : 'Render triggered',
                this.selectedEvent.type === 'tracked' ? "#068261ff" : "#ff9800"
            ));

            // Operation Type
            const operation = this.selectedEvent.eventData.event.type;
            scrollableContent.appendChild(this.createDetailField("Operation", operation?.toUpperCase() ?? "UNKNOWN", "#007acc"));

            // Target Property
            const key = this.formatKey(this.selectedEvent.eventData.event.key);
            scrollableContent.appendChild(this.createDetailField("Property", key, "#333"));

            // Target Object
            const target = this.formatTarget(this.selectedEvent.eventData.event.target);
            scrollableContent.appendChild(this.createDetailField("Target Object", target));

            // For trigger events, show old and new values
            if (this.selectedEvent.type === 'triggered') {
                const event = this.selectedEvent.eventData.event;
                
                if (event.oldValue !== undefined) {
                    const oldValue = this.formatValue(event.oldValue);
                    scrollableContent.appendChild(this.createDetailField("Previous Value", oldValue, "#cc0000"));
                }
                
                if (event.newValue !== undefined) {
                    const newValue = this.formatValue(event.newValue);
                    scrollableContent.appendChild(this.createDetailField("New Value", newValue, "#00cc00"));
                }
            }

            // Timestamp at the bottom
            scrollableContent.appendChild(this.createDetailField("Timestamp", this.selectedEvent.timestamp));

            detailsArea.appendChild(scrollableContent);
        }

        return detailsArea;
    }

    private createDetailField(label: string, value: string, valueColor: string = "#333"): HTMLDivElement {
        const fieldDiv = document.createElement("div");
        fieldDiv.id = `vue-flow-vis-detail-field-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        fieldDiv.style.display = "flex";
        fieldDiv.style.flexDirection = "column";
        fieldDiv.style.padding = "0.5em";
        fieldDiv.style.backgroundColor = "#f9f9f9";
        fieldDiv.style.border = "1px solid #ddd";
        fieldDiv.style.borderRadius = "4px";

        const labelSpan = document.createElement("span");
        labelSpan.id = `vue-flow-vis-detail-label-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        labelSpan.textContent = label + ":";
        labelSpan.style.fontFamily = "monospace";
        labelSpan.style.fontSize = "0.8em";
        labelSpan.style.color = "#666";
        labelSpan.style.fontWeight = "bold";
        labelSpan.style.marginBottom = "0.25em";

        const valueSpan = document.createElement("span");
        valueSpan.id = `vue-flow-vis-detail-value-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        valueSpan.textContent = value;
        valueSpan.style.fontFamily = "monospace";
        valueSpan.style.fontSize = "0.9em";
        valueSpan.style.color = valueColor;
        valueSpan.style.wordBreak = "break-word";
        valueSpan.style.whiteSpace = "pre-wrap";

        fieldDiv.appendChild(labelSpan);
        fieldDiv.appendChild(valueSpan);
        
        return fieldDiv;
    }

    private formatKey(key: unknown): string {
        if (typeof key === 'symbol') {
            return key.toString();
        }
        if (typeof key === 'string') {
            return `"${key}"`;
        }
        return String(key);
    }

    private formatTarget(target: unknown): string {
        if (!target) return 'undefined';
        
        try {
            if (typeof target === 'object' && target !== null && 'constructor' in target) {
                const constructor = (target as { constructor?: { name?: string } }).constructor;
                if (constructor && typeof constructor.name === 'string') {
                    return constructor.name;
                }
            }
            return Object.prototype.toString.call(target).slice(8, -1);
        } catch {
            return 'Unknown Object';
        }
    }

    private formatValue(value: unknown): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        try {
            if (typeof value === 'string') {
                return `"${value}"`;
            }
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    return `Array(${value.length})`;
                }
                return JSON.stringify(value, null, 2);
            }
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            if (typeof value === 'function') {
                return '[Function]';
            }
            if (typeof value === 'symbol') {
                return value.toString();
            }
            return '[Object]';
        } catch {
            return '[Object]';
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
        
        this.uiManager.clearSearchInput();
        sidebarContent.innerHTML = "";
        this.showPlaceholderText();
    }

    private toggleTriggeredEvents(): void {
        this.showTriggeredEvents = !this.showTriggeredEvents;
        if (this.selectedComponent) {
            this.displayComponentEvents(this.selectedComponent);
        }
    }

    private toggleTrackedEvents(): void {
        this.showTrackedEvents = !this.showTrackedEvents;
        if (this.selectedComponent) {
            this.displayComponentEvents(this.selectedComponent);
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