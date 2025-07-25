/* eslint-disable no-undef */
import { Logger, RenderEventData } from "../../types";
import { createComponentIcon, createTrackIcon, createTriggerIcon, createFlowIcon } from "./icons";
import { MAIN_AREA_PLACEHOLDER } from "./strings";
import { UIManager, UIManagerCallbacks } from "./UIManager";
import { EventFormatter } from "./EventFormatter";
import { theme } from "./theme";

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
        eventsListArea.style.flex = "1";
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
            noEvents.style.color = theme.colors.textMuted;
            noEvents.style.fontStyle = "italic";
            noEvents.style.margin = "0";
            noEvents.style.padding = theme.spacing.xl;
            scrollableContainer.appendChild(noEvents);
        } else {
            const eventsContainer = document.createElement("div");
            eventsContainer.id = `vue-flow-vis-events-container-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            eventsContainer.style.display = "flex";
            eventsContainer.style.flexDirection = "column";
            eventsContainer.style.gap = theme.spacing.md;
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

                // Check if this event is selected and set initial background
                const isSelected = this.selectedEvent && 
                    this.selectedEvent.eventIndex === eventIndex && 
                    this.selectedEvent.componentName === componentName;

                eventDiv.style.backgroundColor = isSelected ? theme.colors.backgroundHover : theme.colors.backgroundSecondary;

                eventDiv.onmouseenter = (): void => {
                    eventDiv.style.backgroundColor = theme.colors.backgroundHover;
                };

                eventDiv.onmouseleave = (): void => {
                    // Recalculate selection state on mouse leave
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
                iconSpan.id = `vue-flow-vis-event-icon-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
                iconSpan.innerHTML = event.type === 'tracked' ? createTrackIcon(14) : createTriggerIcon(14);
                iconSpan.style.color = event.type === 'tracked' ? theme.colors.tracked : theme.colors.triggered;
                iconSpan.style.marginRight = theme.spacing.md;
                iconSpan.style.position = "relative";
                iconSpan.style.top = theme.positioning.iconOffset2;

                const eventSpan = document.createElement("span");
                eventSpan.id = `vue-flow-vis-event-span-${componentName.replace(/[^a-zA-Z0-9]/g, '-')}-${eventIndex}`;
                eventSpan.textContent = event.type === 'tracked' ? 'Render tracked' : 'Render triggered';
                eventSpan.style.color = event.type === 'tracked' ? theme.colors.tracked : theme.colors.triggered;

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
        detailsArea.style.padding = theme.spacing.md;
        detailsArea.style.borderLeft = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        detailsArea.style.paddingLeft = theme.spacing.xl;
        detailsArea.style.overflow = "auto";

        if (this.selectedEvent) {
            const scrollableContent = document.createElement("div");
            scrollableContent.id = "vue-flow-vis-event-details-scrollable";
            scrollableContent.style.display = "flex";
            scrollableContent.style.flexDirection = "column";
            scrollableContent.style.gap = theme.spacing.md;
            scrollableContent.style.overflow = "auto";
            scrollableContent.style.paddingRight = theme.spacing.md;

            // Event Type
            scrollableContent.appendChild(this.createDetailField(
                "Event Type", 
                this.selectedEvent.type === 'tracked' ? 'Render tracked' : 'Render triggered',
                this.selectedEvent.type === 'tracked' ? theme.colors.tracked : theme.colors.triggered
            ));

            // Operation Type
            const operation = this.selectedEvent.eventData.event.type;
            scrollableContent.appendChild(this.createDetailField("Operation", operation?.toUpperCase() ?? "UNKNOWN", theme.colors.primary));

            // Target Property
            const key = EventFormatter.formatKey(this.selectedEvent.eventData.event.key);
            scrollableContent.appendChild(this.createDetailField("Property", key, theme.colors.text));

            // Target Object
            const target = EventFormatter.formatTarget(this.selectedEvent.eventData.event.target);
            scrollableContent.appendChild(this.createDetailField("Target Object", target));

            // For trigger events, show old and new values
            if (this.selectedEvent.type === 'triggered') {
                const event = this.selectedEvent.eventData.event;
                
                if (event.oldValue !== undefined) {
                    const oldValue = EventFormatter.formatValue(event.oldValue);
                    scrollableContent.appendChild(this.createDetailField("Previous Value", oldValue, theme.colors.error));
                }
                
                if (event.newValue !== undefined) {
                    const newValue = EventFormatter.formatValue(event.newValue);
                    scrollableContent.appendChild(this.createDetailField("New Value", newValue, theme.colors.success));
                }
            }

            // Timestamp at the bottom
            scrollableContent.appendChild(this.createDetailField("Timestamp", this.selectedEvent.timestamp));

            detailsArea.appendChild(scrollableContent);
        }

        return detailsArea;
    }

    private createDetailField(label: string, value: string, valueColor: string = theme.colors.text): HTMLDivElement {
        const fieldDiv = document.createElement("div");
        fieldDiv.id = `vue-flow-vis-detail-field-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        fieldDiv.style.display = "flex";
        fieldDiv.style.flexDirection = "column";
        fieldDiv.style.padding = theme.spacing.md;
        fieldDiv.style.backgroundColor = theme.colors.backgroundSecondary;
        fieldDiv.style.border = `${theme.borderWidths.thin} solid ${theme.colors.border}`;
        fieldDiv.style.borderRadius = theme.borderRadius.md;

        const labelSpan = document.createElement("span");
        labelSpan.id = `vue-flow-vis-detail-label-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        labelSpan.textContent = label + ":";
        labelSpan.style.fontFamily = theme.fonts.primary;
        labelSpan.style.fontSize = theme.fontSizes.xs;
        labelSpan.style.color = theme.colors.textMuted;
        labelSpan.style.fontWeight = "bold";
        labelSpan.style.marginBottom = theme.spacing.xs;

        const valueSpan = document.createElement("span");
        valueSpan.id = `vue-flow-vis-detail-value-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        valueSpan.textContent = value;
        valueSpan.style.fontFamily = theme.fonts.primary;
        valueSpan.style.fontSize = theme.fontSizes.sm;
        valueSpan.style.color = valueColor;
        valueSpan.style.wordBreak = "break-word";
        valueSpan.style.whiteSpace = "pre-wrap";

        fieldDiv.appendChild(labelSpan);
        fieldDiv.appendChild(valueSpan);
        
        return fieldDiv;
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