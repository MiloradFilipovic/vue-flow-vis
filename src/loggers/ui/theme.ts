/**
 * Design tokens and theme values for the Vue Flow Vis UI Logger
 * Centralized design system for consistent styling across components
 */

export const theme = {
  // Color Palette
  colors: {
    // Primary brand colors
    primary: "#007acc",
    primaryHover: "#00cc96ff",
    
    // Status/Event colors
    tracked: "#068261ff",
    triggered: "#ff9800",
    
    // Semantic colors
    success: "#00cc96ff",
    error: "#cc0000",
    warning: "#ff9800",
    info: "#007acc",
    
    // Neutral colors
    white: "#fff",
    black: "#000",
    text: "#333",
    textMuted: "#666",
    textDisabled: "#ccc",
    
    // Background colors
    backgroundPrimary: "#fff",
    backgroundSecondary: "#f9f9f9",
    backgroundTertiary: "#f5f5f5",
    backgroundHover: "#e9e9e9",
    backgroundError: "#ffeaea",
    
    // Border colors
    border: "#ddd",
    borderLight: "#ccc",
    borderError: "red",
    
    // Transparent variants
    transparent: "transparent"
  },

  // Typography
  fonts: {
    primary: "monospace",
  },

  // Font sizes
  fontSizes: {
    xs: "0.8em",
    sm: "0.9em",
    base: "1em",
    lg: "1.1em",
    xl: "1.2em"
  },

  // Spacing scale
  spacing: {
    xs: "0.25em",
    sm: "0.3em",
    md: "0.5em",
    lg: "0.75em",
    xl: "1em",
    "2xl": "1.5em",
    "3xl": "2em"
  },

  // Sizing
  sizes: {
    // Panel dimensions
    panelWidth: "80vw",
    panelHeight: "450px",
    panelMinHeight: "150px",
    
    // Sidebar
    sidebarWidth: "200px",
    sidebarMinWidth: "150px",
    
    // Handle sizes
    dragHandleHeight: "8px",
    resizeHandleWidth: "8px",
    sidebarResizeHandleWidth: "4px",
    
    // Input dimensions
    inputPadding: "0.4em",
    
    // Icon sizes
    iconSmall: "14px",
    iconMedium: "18px",
    iconLarge: "32px"
  },

  // Border radius
  borderRadius: {
    none: "0",
    sm: "2px",
    md: "4px",
    lg: "6px",
    xl: "8px"
  },

  // Border widths
  borderWidths: {
    thin: "1px",
    medium: "2px",
    thick: "3px"
  },

  // Positioning
  positioning: {
    panelBottom: "1em",
    panelRight: "1em",
    iconOffset: "1px",
    iconOffset2: "2px",
    sidebarResizeOffset: "-2px"
  },

  // Z-index scale
  zIndex: {
    base: 1,
    elevated: 2,
    overlay: 3,
    modal: 9999
  },

  // Transitions
  transitions: {
    fast: "0.1s ease",
    normal: "0.2s ease",
    slow: "0.3s ease"
  },

  // Opacity levels
  opacity: {
    disabled: "0.35",
    muted: "0.6",
    visible: "1"
  },

  // Layout dimensions
  layout: {
    maxWidth: "95%",
    maxHeight: "80%"
  }
} as const;

// Type-safe theme access
export type Theme = typeof theme;
export type ThemeColors = keyof Theme['colors'];
export type ThemeFonts = keyof Theme['fonts'];
export type ThemeFontSizes = keyof Theme['fontSizes'];
export type ThemeSpacing = keyof Theme['spacing'];
export type ThemeSizes = keyof Theme['sizes'];
export type ThemeBorderRadius = keyof Theme['borderRadius'];

// Helper functions for accessing theme values
export const getColor = (colorKey: ThemeColors): string => theme.colors[colorKey];
export const getFont = (fontKey: ThemeFonts): string => theme.fonts[fontKey];
export const getFontSize = (sizeKey: ThemeFontSizes): string => theme.fontSizes[sizeKey];
export const getSpacing = (spacingKey: ThemeSpacing): string => theme.spacing[spacingKey];
export const getSize = (sizeKey: ThemeSizes): string => theme.sizes[sizeKey];
export const getBorderRadius = (radiusKey: ThemeBorderRadius): string => theme.borderRadius[radiusKey];