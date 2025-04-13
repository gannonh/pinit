# Pinit - VS Code Extension

A simple extension that allows you to pin files and folders in VS Code for quick access.

## Features

- Pin files and folders to a dedicated view in the Explorer
- Access pinned items quickly from the Pins panel
- Pin items using context menu or keyboard shortcuts
- Delete pins individually or all at once

## Usage

### Pinning Items

You can pin items in three ways:

1. **Context Menu**: Right-click on a file or folder in the Explorer and select "Pin Item"
2. **Keyboard Shortcut**: 
   - Windows/Linux: `Ctrl+P Ctrl+I`
   - Mac: `Shift+Cmd+I`

The pinned item will appear in the Pins panel in the Explorer view.

### Managing Pins

- To delete a pin, right-click on the pinned item and select "Delete Pin"
- To delete all pins, click the trash icon in the Pins panel header
- Clicking on a pinned file will open it
- Clicking on a pinned folder will reveal it in the Explorer

## Custom Keybindings

You can customize the keyboard shortcut by adding your own keybinding in VS Code's `keybindings.json`:

```json
{
  "key": "your-preferred-shortcut",
  "command": "pinit.pinItem",
  "when": "explorerViewletFocus || editorFocus"
}
```

## Requirements

VS Code 1.82.0 or higher.

## Extension Settings

This extension doesn't add any settings to VS Code.

## License

MIT
