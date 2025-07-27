/**
 * Design tokens and theme values for the Object Inspector component
 * Centralized design system for consistent styling across object inspector UI
 */

export const objectInspectorTheme = {
  // Color Palette
  colors: {
    // Background colors
    containerBackground: "#fff",
    rowHoverBackground: "#e9e9e9",
    
    // Text colors
    primaryText: "#333",
    keyColor: "#00538aff",
    separatorColor: "#666",
    stringColor: "#cc0000",
    numberColor: "#068261ff",
    booleanColor: "#007acc",
    nullUndefinedColor: "#666",
    functionColor: "#00cc96ff",
    symbolColor: "#ff9800",
    defaultValueColor: "#007acc",
    
    // UI element colors
    arrowColor: "#666",
    circularRefColor: "#cc0000",
    sharedRefColor: "#007acc",
    maxDepthColor: "#ccc",
    previewColor: "#666",
    prototypeOpacity: "0.6",
    errorColor: "#cc0000"
  },

  // Typography
  fonts: {
    primary: "'Consolas', 'Monaco', 'Courier New', monospace"
  },

  // Font sizes
  fontSizes: {
    base: "12px",
    small: "10px"
  },

  // Spacing scale
  spacing: {
    none: "0",
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "16px"
  },

  // Line height
  lineHeight: "1.4",

  // Border radius
  borderRadius: {
    sm: "4px"
  },

  // Transitions
  transitions: {
    fast: "transform 0.1s ease"
  },

  // Layout values
  layout: {
    arrowSize: "12px",
    indentSize: "16px",
    paddingHorizontal: "8px"
  },

  // Opacity levels
  opacity: {
    sharedRef: "0.7",
    prototype: "0.6"
  }
} as const;

// Type-safe theme access
export type ObjectInspectorTheme = typeof objectInspectorTheme;
export type ObjectInspectorColors = keyof ObjectInspectorTheme['colors'];
export type ObjectInspectorFonts = keyof ObjectInspectorTheme['fonts'];
export type ObjectInspectorFontSizes = keyof ObjectInspectorTheme['fontSizes'];
export type ObjectInspectorSpacing = keyof ObjectInspectorTheme['spacing'];

// Helper functions for accessing theme values
export const getObjectInspectorColor = (colorKey: ObjectInspectorColors): string => 
  objectInspectorTheme.colors[colorKey];

export const getObjectInspectorFont = (fontKey: ObjectInspectorFonts): string => 
  objectInspectorTheme.fonts[fontKey];

export const getObjectInspectorFontSize = (sizeKey: ObjectInspectorFontSizes): string => 
  objectInspectorTheme.fontSizes[sizeKey];

export const getObjectInspectorSpacing = (spacingKey: ObjectInspectorSpacing): string => 
  objectInspectorTheme.spacing[spacingKey];