# Tailwind CSS Setup

This project now uses Tailwind CSS v3 with a proper build process to eliminate the browser build warning and improve performance.

## Setup Overview

- **Tailwind CSS v3.4.0**: Stable version with full feature support
- **PostCSS**: For processing CSS with autoprefixer
- **Custom Configuration**: Tailored for the dark theme and design system
- **Production Build**: Minified CSS for optimal performance

## File Structure

```
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── client/
│   ├── src/
│   │   └── styles/
│   │       └── tailwind.css     # Tailwind input file
│   └── dist/
│       └── styles.css           # Generated CSS output
```

## Available Scripts

### Development
```bash
# Build CSS and start server
npm run dev

# Watch CSS changes only (run in separate terminal)
npm run dev:css

# Build CSS once
npm run build:css:prod
```

### Production
```bash
# Build minified CSS
npm run build:css:prod

# Start server (CSS is built automatically via prebuild)
npm start
```

## Custom Classes

The setup includes custom component classes that match the existing design:

### Buttons
- `.btn-primary` - Green primary button
- `.btn-secondary` - Gray secondary button

### Forms
- `.form-input` - Styled input fields
- `.form-textarea` - Styled textareas
- `.form-select` - Styled select dropdowns
- `.form-label` - Form labels
- `.form-group` - Form field containers

### Layout
- `.modal-overlay` - Modal backdrop
- `.modal-content` - Modal content container
- `.toolbar-group` - Toolbar button groups
- `.toolbar-btn` - Toolbar buttons

### Nodes
- `.node-card` - Node container styling
- `.node-selected` - Selected node styling

### UI Components
- `.dropdown-content` - Dropdown menus
- `.dropdown-item` - Dropdown menu items
- `.chat-message` - Chat message containers
- `.debug-panel` - Debug information panels
- `.mini-map` - Mini-map styling

### Status Indicators
- `.status-success` - Green status indicator
- `.status-error` - Red status indicator
- `.status-warning` - Yellow status indicator
- `.status-info` - Blue status indicator

### Utilities
- `.text-shadow` - Text shadow effect
- `.glow` - Green glow effect
- `.scrollbar-thin` - Thin scrollbar styling

## Color Palette

The configuration includes a custom color palette that matches the existing dark theme:

- **Background**: `#1e1e1e` (gray-900)
- **Surface**: `#2a2a2a` (gray-800)
- **Borders**: `#444` (gray-600)
- **Accent**: `#4CAF50` (green-500)
- **Text Primary**: `#eee` (gray-100)
- **Text Secondary**: `#ccc` (gray-300)
- **Node Background**: `#333` (gray-700)
- **Connection**: `#4a90e2` (blue-500)

## Benefits

1. **No Browser Build Warning**: Eliminates the Tailwind CSS browser build warning
2. **Better Performance**: Minified CSS with only used classes
3. **Consistent Styling**: Utility-first approach with custom components
4. **Dark Theme Optimized**: Colors and components designed for dark UI
5. **Development Workflow**: Watch mode for rapid development
6. **Production Ready**: Optimized builds for deployment

## Usage Examples

### Using Custom Classes
```html
<button class="btn-primary">Save</button>
<input class="form-input" type="text" placeholder="Enter text">
<div class="node-card node-selected">Selected Node</div>
```

### Using Tailwind Utilities
```html
<div class="bg-gray-800 p-4 rounded-lg shadow-lg">
  <h2 class="text-gray-100 text-lg font-medium mb-2">Title</h2>
  <p class="text-gray-300">Description text</p>
</div>
```

### Combining Custom and Utility Classes
```html
<div class="modal-overlay">
  <div class="modal-content p-6">
    <form class="space-y-4">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" type="text">
      </div>
      <div class="flex space-x-2">
        <button class="btn-primary">Save</button>
        <button class="btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
</div>
```

## Troubleshooting

### Browser Build Warning
If you still see the "browser build of Tailwind CSS should not be used in production" warning:

1. **Check Browser Extensions**: Some browser extensions or developer tools may inject Tailwind CSS
2. **Clear Browser Cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R) to clear cached resources
3. **Use Debug Tools**: Open browser console and check `window.tailwindDebugReport` for detailed analysis
4. **Check Network Tab**: Look for any external Tailwind CSS requests in browser dev tools

### Debug Commands
```javascript
// In browser console:
window.tailwindDebug.generateReport()  // Get full debug report
window.tailwindDebugReport            // View stored report
window.tailwindDynamicElements        // Check for blocked dynamic loading
```

### CSS Not Updating
1. Make sure you've run `npm run build:css:prod` after changes
2. Check that the `client/dist/styles.css` file exists
3. Clear browser cache if styles aren't updating

### Build Errors
1. Ensure all Tailwind classes are valid
2. Check that custom colors are properly defined in `tailwind.config.js`
3. Verify that the input file path is correct

### Development Workflow
1. Run `npm run dev:css` in a separate terminal for live CSS updates
2. Use `npm run dev` for full development with CSS build
3. Always run `npm run build:css:prod` before production deployment

### Security Features
- **CSP Protection**: Content Security Policy blocks external CSS loading
- **Dynamic Loading Prevention**: JavaScript blocks attempts to load Tailwind from CDN
- **Debug Monitoring**: Real-time detection of Tailwind-related console messages
