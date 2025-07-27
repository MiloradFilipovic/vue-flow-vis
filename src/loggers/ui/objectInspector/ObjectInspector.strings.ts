/**
 * Object Inspector UI Strings
 * Centralized location for all user-facing strings in the Object Inspector
 */

export const objectInspectorStrings = {
  // Expansion and navigation
  expandArrow: '▶',
  separator: ': ',
  
  // Status messages
  maxDepthReached: '[Maximum depth reached]',
  circularReference: ' [Circular]',
  errorAccessingProperty: '[Error accessing property]',
  
  // Reference indicators
  refPrefix: ' <ref *',
  refSuffix: '>',
  refCountPrefix: 'This object appears ',
  refCountSuffix: ' times',
  
  // Empty containers
  emptyArray: ' []',
  emptyObject: ' {}',
  
  // Preview ellipsis
  previewEllipsis: '...',
  
  // Array formatting
  arrayPrefix: 'Array(',
  arraySuffix: ')',
  
  // Object types
  objectLabel: 'Object',
  objectFallback: '[object]',
  symbolLabel: 'Symbol',
  functionSymbol: 'ƒ',
  objectPreview: '{…}',
  defaultPreview: '…',
  
  // Primitive values
  nullValue: 'null',
  undefinedValue: 'undefined',
  
  // Function formatting
  asyncPrefix: 'async ',
  functionPrefix: 'ƒ ',
  functionSuffix: '()',
  anonymousFunction: 'anonymous',
  defaultFunction: 'ƒ()',
} as const;

export type ObjectInspectorStrings = typeof objectInspectorStrings;