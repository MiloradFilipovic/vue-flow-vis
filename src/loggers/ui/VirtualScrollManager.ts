export type VirtualScrollOptions = {
    itemHeight: number;
    containerHeight: number;
    buffer: number;
    totalItems: number;
}

export type VirtualScrollResult = {
    startIndex: number;
    endIndex: number;
    offsetY: number;
    visibleHeight: number;
}

export class VirtualScrollManager {
    private itemHeight: number;
    private buffer: number;
    private totalItems: number;
    private containerHeight: number;

    constructor(options: VirtualScrollOptions) {
        this.itemHeight = options.itemHeight;
        this.buffer = options.buffer;
        this.totalItems = options.totalItems;
        this.containerHeight = options.containerHeight;
    }

    public updateOptions(options: Partial<VirtualScrollOptions>): void {
        if (options.itemHeight !== undefined) this.itemHeight = options.itemHeight;
        if (options.buffer !== undefined) this.buffer = options.buffer;
        if (options.totalItems !== undefined) this.totalItems = options.totalItems;
        if (options.containerHeight !== undefined) this.containerHeight = options.containerHeight;
    }

    public calculateVisibleRange(scrollTop: number): VirtualScrollResult {
        if (this.totalItems === 0) {
            return {
                startIndex: 0,
                endIndex: 0,
                offsetY: 0,
                visibleHeight: 0
            };
        }

        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        const visibleItemCount = Math.ceil(this.containerHeight / this.itemHeight);
        const endIndex = Math.min(this.totalItems, startIndex + visibleItemCount + this.buffer * 2);

        const offsetY = startIndex * this.itemHeight;
        const visibleHeight = this.totalItems * this.itemHeight;

        return {
            startIndex,
            endIndex,
            offsetY,
            visibleHeight
        };
    }

    public getTotalHeight(): number {
        return this.totalItems * this.itemHeight;
    }

    public getItemIndexAtPosition(scrollTop: number, offsetY: number): number {
        const relativePosition = scrollTop + offsetY;
        return Math.floor(relativePosition / this.itemHeight);
    }

    public scrollToItem(itemIndex: number): number {
        return Math.max(0, itemIndex * this.itemHeight - this.containerHeight / 2);
    }
}