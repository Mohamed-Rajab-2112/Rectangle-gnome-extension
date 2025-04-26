# Rectangle for GNOME

A GNOME Shell extension that provides window management functionality similar to the Rectangle app for macOS. This extension allows you to easily resize and position windows using keyboard shortcuts or by dragging windows to screen edges.

## Features

- Resize and position windows using keyboard shortcuts
- Snap windows to screen edges by dragging them
- Customizable snap areas with visual previews
- Menu in the top panel for quick access to window positions
- Support for halves, quarters, thirds, sixths, and more
- Customizable keyboard shortcuts
- Fully customizable snap area actions

## Keyboard Shortcuts (Default)

- **Halves**
  - Left Half: `Super + Left`
  - Right Half: `Super + Right`
  - Top Half: `Super + Up`
  - Bottom Half: `Super + Down`

- **Quarters**
  - Top Left Quarter: `Super + Shift + Left`
  - Top Right Quarter: `Super + Shift + Right`
  - Bottom Left Quarter: `Super + Shift + Down`
  - Bottom Right Quarter: `Super + Shift + Up`

- **Thirds**
  - Left Third: `Super + Alt + Left`
  - Center Third: `Super + Alt + Up`
  - Right Third: `Super + Alt + Right`
  - Left Two Thirds: `Super + Alt + Shift + Left`
  - Right Two Thirds: `Super + Alt + Shift + Right`

- **Special**
  - Maximize: `Super + M`
  - Center: `Super + C`

## Installation

### From extensions.gnome.org

1. Visit [extensions.gnome.org](https://extensions.gnome.org) and search for "Rectangle for GNOME"
2. Click the toggle switch to install and enable the extension

### Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/Mohamed-Rajab-2112/Rectangle-gnome-extension/releases)
2. Extract the zip file to `~/.local/share/gnome-shell/extensions/rectangle-gnome@mohamed.github.io`
3. Restart GNOME Shell:
   - Press `Alt+F2`, type `r`, and press Enter (on X11)
   - Or log out and log back in (on Wayland)
4. Enable the extension using the Extensions app or GNOME Tweaks

## Usage

### Keyboard Shortcuts

Use the default keyboard shortcuts listed above, or customize them in the extension preferences.

### Snap Areas

Drag a window to any screen edge or corner to trigger the corresponding snap action. The default actions are:

- Top-left corner: Top-left quarter
- Top-right corner: Top-right quarter
- Bottom-left corner: Bottom-left quarter
- Bottom-right corner: Bottom-right quarter
- Top edge: Top half
- Bottom edge: Bottom half
- Left edge: Left half
- Right edge: Right half

You can customize these actions in the extension preferences.

### Panel Menu

Click the Rectangle icon in the top panel to access a menu with all available window positions.

## Customization

Open the extension preferences to customize:

1. Keyboard shortcuts for all window positions
2. Snap area size (how close to an edge you need to drag)
3. Actions for each snap area (what happens when you drag to an edge or corner)

## Compatibility

This extension works with GNOME Shell versions 40 and above.

**Note for Pop OS users**: If you're using Pop OS, you may need to disable the built-in Pop Shell tiling feature to avoid conflicts with this extension. You can do this by disabling the Pop Shell extension or by running:

```bash
gsettings set org.gnome.mutter edge-tiling false
```

## License

This extension is licensed under the GNU General Public License v2.0.

## Credits

Inspired by the Rectangle app for macOS: https://rectangleapp.com/
