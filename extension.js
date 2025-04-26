/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { GObject, St, Clutter, GLib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

// Window positions
const POSITIONS = {
    // Halves
    LEFT_HALF: 'left-half',
    RIGHT_HALF: 'right-half',
    TOP_HALF: 'top-half',
    BOTTOM_HALF: 'bottom-half',
    
    // Quarters
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    
    // Thirds
    LEFT_THIRD: 'left-third',
    CENTER_THIRD: 'center-third',
    RIGHT_THIRD: 'right-third',
    
    // Two-thirds
    LEFT_TWO_THIRDS: 'left-two-thirds',
    RIGHT_TWO_THIRDS: 'right-two-thirds',
    
    // Sixths (top row)
    TOP_LEFT_SIXTH: 'top-left-sixth',
    TOP_CENTER_SIXTH: 'top-center-sixth',
    TOP_RIGHT_SIXTH: 'top-right-sixth',
    
    // Sixths (bottom row)
    BOTTOM_LEFT_SIXTH: 'bottom-left-sixth',
    BOTTOM_CENTER_SIXTH: 'bottom-center-sixth',
    BOTTOM_RIGHT_SIXTH: 'bottom-right-sixth',
    
    // Special positions
    MAXIMIZE: 'maximize',
    CENTER: 'center',
};

// Keyboard shortcuts
const KEYBINDINGS = {
    'rectangle-left-half': POSITIONS.LEFT_HALF,
    'rectangle-right-half': POSITIONS.RIGHT_HALF,
    'rectangle-top-half': POSITIONS.TOP_HALF,
    'rectangle-bottom-half': POSITIONS.BOTTOM_HALF,
    'rectangle-top-left': POSITIONS.TOP_LEFT,
    'rectangle-top-right': POSITIONS.TOP_RIGHT,
    'rectangle-bottom-left': POSITIONS.BOTTOM_LEFT,
    'rectangle-bottom-right': POSITIONS.BOTTOM_RIGHT,
    'rectangle-left-third': POSITIONS.LEFT_THIRD,
    'rectangle-center-third': POSITIONS.CENTER_THIRD,
    'rectangle-right-third': POSITIONS.RIGHT_THIRD,
    'rectangle-left-two-thirds': POSITIONS.LEFT_TWO_THIRDS,
    'rectangle-right-two-thirds': POSITIONS.RIGHT_TWO_THIRDS,
    'rectangle-maximize': POSITIONS.MAXIMIZE,
    'rectangle-center': POSITIONS.CENTER,
};

class RectangleIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super(0.0, 'Rectangle for GNOME');

        // Add icon to panel
        this.add_child(new St.Icon({
            icon_name: 'view-grid-symbolic',
            style_class: 'system-status-icon',
        }));

        // Create menu sections
        let halvesSectionMenu = new PopupMenu.PopupSubMenuMenuItem('Halves');
        this.menu.addMenuItem(halvesSectionMenu);
        halvesSectionMenu.menu.addMenuItem(this._createMenuItem('Left Half', POSITIONS.LEFT_HALF));
        halvesSectionMenu.menu.addMenuItem(this._createMenuItem('Right Half', POSITIONS.RIGHT_HALF));
        halvesSectionMenu.menu.addMenuItem(this._createMenuItem('Top Half', POSITIONS.TOP_HALF));
        halvesSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Half', POSITIONS.BOTTOM_HALF));
        
        let thirdsSectionMenu = new PopupMenu.PopupSubMenuMenuItem('Thirds');
        this.menu.addMenuItem(thirdsSectionMenu);
        thirdsSectionMenu.menu.addMenuItem(this._createMenuItem('Left Third', POSITIONS.LEFT_THIRD));
        thirdsSectionMenu.menu.addMenuItem(this._createMenuItem('Center Third', POSITIONS.CENTER_THIRD));
        thirdsSectionMenu.menu.addMenuItem(this._createMenuItem('Right Third', POSITIONS.RIGHT_THIRD));
        thirdsSectionMenu.menu.addMenuItem(this._createMenuItem('Left Two Thirds', POSITIONS.LEFT_TWO_THIRDS));
        thirdsSectionMenu.menu.addMenuItem(this._createMenuItem('Right Two Thirds', POSITIONS.RIGHT_TWO_THIRDS));
        
        let quartersSectionMenu = new PopupMenu.PopupSubMenuMenuItem('Quarters');
        this.menu.addMenuItem(quartersSectionMenu);
        quartersSectionMenu.menu.addMenuItem(this._createMenuItem('Top Left', POSITIONS.TOP_LEFT));
        quartersSectionMenu.menu.addMenuItem(this._createMenuItem('Top Right', POSITIONS.TOP_RIGHT));
        quartersSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Left', POSITIONS.BOTTOM_LEFT));
        quartersSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Right', POSITIONS.BOTTOM_RIGHT));
        
        let sixthsSectionMenu = new PopupMenu.PopupSubMenuMenuItem('Sixths');
        this.menu.addMenuItem(sixthsSectionMenu);
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Top Left Sixth', POSITIONS.TOP_LEFT_SIXTH));
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Top Center Sixth', POSITIONS.TOP_CENTER_SIXTH));
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Top Right Sixth', POSITIONS.TOP_RIGHT_SIXTH));
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Left Sixth', POSITIONS.BOTTOM_LEFT_SIXTH));
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Center Sixth', POSITIONS.BOTTOM_CENTER_SIXTH));
        sixthsSectionMenu.menu.addMenuItem(this._createMenuItem('Bottom Right Sixth', POSITIONS.BOTTOM_RIGHT_SIXTH));
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Special positions
        this.menu.addMenuItem(this._createMenuItem('Maximize', POSITIONS.MAXIMIZE));
        this.menu.addMenuItem(this._createMenuItem('Center', POSITIONS.CENTER));
    }

    _createMenuItem(text, position) {
        let item = new PopupMenu.PopupMenuItem(text);
        item.connect('activate', () => {
            log(`Menu item activated: ${text} (${position})`);
            this._moveActiveWindow(position);
        });
        return item;
    }

    _moveActiveWindow(position) {
        let window = global.display.focus_window;
        if (!window) {
            log('No active window found');
            return;
        }

        log(`Moving window to position: ${position}`);
        
        // Get the work area (screen area without panels)
        let monitor = window.get_monitor();
        let workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);
        
        let windowRect = new Meta.Rectangle();

        switch (position) {
            // Halves
            case POSITIONS.LEFT_HALF:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_HALF:
                windowRect.x = workArea.x + Math.floor(workArea.width / 2);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = workArea.height;
                break;
            case POSITIONS.TOP_HALF:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = workArea.width;
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_HALF:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = workArea.width;
                windowRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Quarters
            case POSITIONS.TOP_LEFT:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_RIGHT:
                windowRect.x = workArea.x + Math.floor(workArea.width / 2);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_LEFT:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_RIGHT:
                windowRect.x = workArea.x + Math.floor(workArea.width / 2);
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = Math.floor(workArea.width / 2);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Thirds
            case POSITIONS.LEFT_THIRD:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = workArea.height;
                break;
            case POSITIONS.CENTER_THIRD:
                windowRect.x = workArea.x + Math.floor(workArea.width / 3);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_THIRD:
                windowRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = workArea.height;
                break;
                
            // Two-thirds
            case POSITIONS.LEFT_TWO_THIRDS:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width * 2 / 3);
                windowRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_TWO_THIRDS:
                windowRect.x = workArea.x + Math.floor(workArea.width / 3);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width * 2 / 3);
                windowRect.height = workArea.height;
                break;
                
            // Sixths (top row)
            case POSITIONS.TOP_LEFT_SIXTH:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_CENTER_SIXTH:
                windowRect.x = workArea.x + Math.floor(workArea.width / 3);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_RIGHT_SIXTH:
                windowRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                windowRect.y = workArea.y;
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Sixths (bottom row)
            case POSITIONS.BOTTOM_LEFT_SIXTH:
                windowRect.x = workArea.x;
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_CENTER_SIXTH:
                windowRect.x = workArea.x + Math.floor(workArea.width / 3);
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_RIGHT_SIXTH:
                windowRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                windowRect.y = workArea.y + Math.floor(workArea.height / 2);
                windowRect.width = Math.floor(workArea.width / 3);
                windowRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Special positions
            case POSITIONS.MAXIMIZE:
                window.maximize(Meta.MaximizeFlags.BOTH);
                return;
            case POSITIONS.CENTER:
                // Center the window at 2/3 of the screen size
                const centerWidth = Math.floor(workArea.width * 2/3);
                const centerHeight = Math.floor(workArea.height * 2/3);
                windowRect.x = workArea.x + (workArea.width - centerWidth) / 2;
                windowRect.y = workArea.y + (workArea.height - centerHeight) / 2;
                windowRect.width = centerWidth;
                windowRect.height = centerHeight;
                break;
        }

        window.unmaximize(Meta.MaximizeFlags.BOTH);
        window.move_resize_frame(true, windowRect.x, windowRect.y, windowRect.width, windowRect.height);
    }
}

class Extension {
    constructor() {
        this._indicator = null;
        this._keyBindings = {};
        this._draggedWindow = null;
        this._dragMonitor = null;
        this._dragCheckTimeout = 0;
        this._previewRect = null;
        this._currentSnapArea = null;
        this._currentSnapAction = null;
        this._dragEventId = 0;
        this._dragEndEventId = 0;
        this._settings = null;
    }

    enable() {
        // Create settings
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.rectangle-gnome');
        
        // Set default snap area size if not already set
        if (this._settings.get_int('snap-area-size') <= 0) {
            this._settings.set_int('snap-area-size', 30); // Larger default size
        }
        
        // Add indicator to panel
        this._indicator = new RectangleIndicator();
        Main.panel.addToStatusArea('rectangle-indicator', this._indicator);
        
        // Add keyboard shortcuts
        this._addKeybindings();
        
        // Setup snap areas
        this._setupSnapAreas();
        
        log('Rectangle for GNOME extension enabled');
    }

    disable() {
        // Remove keyboard shortcuts
        this._removeKeybindings();
        
        // Remove snap areas
        this._removeSnapAreas();
        
        // Remove the indicator
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        // Clean up
        if (this._dragCheckTimeout) {
            GLib.source_remove(this._dragCheckTimeout);
            this._dragCheckTimeout = 0;
        }
        
        if (this._previewRect) {
            this._previewRect.destroy();
            this._previewRect = null;
        }
        
        this._settings = null;
    }

    _addKeybindings() {
        // Define default keybindings with their corresponding positions
        const keyBindings = {
            'rectangle-left-half': { shortcut: '<Super>Left', position: POSITIONS.LEFT_HALF },
            'rectangle-right-half': { shortcut: '<Super>Right', position: POSITIONS.RIGHT_HALF },
            'rectangle-top-half': { shortcut: '<Super>Up', position: POSITIONS.TOP_HALF },
            'rectangle-bottom-half': { shortcut: '<Super>Down', position: POSITIONS.BOTTOM_HALF },
            'rectangle-top-left': { shortcut: '<Super><Shift>Left', position: POSITIONS.TOP_LEFT },
            'rectangle-top-right': { shortcut: '<Super><Shift>Right', position: POSITIONS.TOP_RIGHT },
            'rectangle-bottom-left': { shortcut: '<Super><Shift>Down', position: POSITIONS.BOTTOM_LEFT },
            'rectangle-bottom-right': { shortcut: '<Super><Shift>Up', position: POSITIONS.BOTTOM_RIGHT },
            'rectangle-left-third': { shortcut: '<Super><Alt>Left', position: POSITIONS.LEFT_THIRD },
            'rectangle-center-third': { shortcut: '<Super><Alt>Up', position: POSITIONS.CENTER_THIRD },
            'rectangle-right-third': { shortcut: '<Super><Alt>Right', position: POSITIONS.RIGHT_THIRD },
            'rectangle-left-two-thirds': { shortcut: '<Super><Alt><Shift>Left', position: POSITIONS.LEFT_TWO_THIRDS },
            'rectangle-right-two-thirds': { shortcut: '<Super><Alt><Shift>Right', position: POSITIONS.RIGHT_TWO_THIRDS },
            'rectangle-maximize': { shortcut: '<Super>m', position: POSITIONS.MAXIMIZE },
            'rectangle-center': { shortcut: '<Super>c', position: POSITIONS.CENTER },
        };

        // Add all keybindings
        for (let name in keyBindings) {
            try {
                log(`Adding keybinding for ${name}`);
                Main.wm.addKeybinding(
                    name,
                    this._settings,
                    Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                    Shell.ActionMode.NORMAL,
                    () => {
                        log(`Keybinding activated: ${name}`);
                        this._onActivateKeybinding(keyBindings[name].position);
                    }
                );
            } catch (e) {
                log(`Error adding keybinding for ${name}: ${e}`);
            }
        }
    }

    _removeKeybindings() {
        // Remove all keybindings
        for (let name in KEYBINDINGS) {
            Main.wm.removeKeybinding(name);
        }
    }

    _onActivateKeybinding(position) {
        let window = global.display.focus_window;
        if (!window) return;

        let indicator = Main.panel.statusArea['rectangle-indicator'];
        if (indicator) {
            indicator._moveActiveWindow(position);
        }
    }
    
    _setupSnapAreas() {
        log('Setting up snap areas');
        
        // In GNOME, we need to connect to 'grab-op-begin' to detect window dragging
        this._dragEventId = global.display.connect('grab-op-begin', 
            (display, window, op) => {
                log(`Grab operation begin: ${op}`);
                if (window && (op === Meta.GrabOp.MOVING)) {
                    log('Window moving detected');
                    this._handleWindowDrag(window);
                }
            });
        
        this._dragEndEventId = global.display.connect('grab-op-end',
            (display, window, op) => {
                log(`Grab operation end: ${op}`);
                if (window && (op === Meta.GrabOp.MOVING)) {
                    log('Window moving ended');
                    this._handleWindowDragEnd(window);
                }
            });
            
        log('Snap areas setup complete');
    }
    
    _removeSnapAreas() {
        // Disconnect from window-drag events
        if (this._dragEventId) {
            global.display.disconnect(this._dragEventId);
            this._dragEventId = 0;
        }
        
        if (this._dragEndEventId) {
            global.display.disconnect(this._dragEndEventId);
            this._dragEndEventId = 0;
        }
    }

    _handleWindowDrag(window) {
        // Start tracking the window position
        this._draggedWindow = window;
        this._dragMonitor = window.get_monitor();
        
        log(`Window drag started: ${window.get_title()}`);
        
        // Start a timeout to check window position periodically
        this._dragCheckTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!this._draggedWindow) {
                log('Drag check: No dragged window');
                return GLib.SOURCE_REMOVE;
            }
            
            log('Checking snap areas...');
            this._checkSnapAreas();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _handleWindowDragEnd(window) {
        log(`Window drag ended: ${window ? window.get_title() : 'unknown'}`);
        
        // If we have a current snap area, apply the action
        if (this._currentSnapArea && this._currentSnapAction) {
            log(`Applying snap action: ${this._currentSnapAction} for area ${this._currentSnapArea}`);
            let indicator = Main.panel.statusArea['rectangle-indicator'];
            if (indicator) {
                indicator._moveActiveWindow(this._currentSnapAction);
            }
        } else {
            log('No snap area detected at drag end');
        }
        
        // Clean up
        this._hidePreview();
        this._draggedWindow = null;
        this._currentSnapArea = null;
        this._currentSnapAction = null;
        
        if (this._dragCheckTimeout) {
            GLib.source_remove(this._dragCheckTimeout);
            this._dragCheckTimeout = 0;
        }
    }

    _checkSnapAreas() {
        if (!this._draggedWindow) return;
        
        // Get window position
        let rect = this._draggedWindow.get_frame_rect();
        let monitor = this._draggedWindow.get_monitor();
        let workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);
        
        // Get cursor position
        let [x, y] = global.get_pointer();
        
        // Get settings
        let snapAreaSize = this._settings.get_int('snap-area-size');
        
        // Check each snap area
        this._checkSnapArea(x, y, workArea, 'top-left-corner');
        this._checkSnapArea(x, y, workArea, 'top-right-corner');
        this._checkSnapArea(x, y, workArea, 'bottom-left-corner');
        this._checkSnapArea(x, y, workArea, 'bottom-right-corner');
        this._checkSnapArea(x, y, workArea, 'top-edge');
        this._checkSnapArea(x, y, workArea, 'bottom-edge');
        this._checkSnapArea(x, y, workArea, 'left-edge');
        this._checkSnapArea(x, y, workArea, 'right-edge');
    }

    _checkSnapArea(x, y, workArea, areaName) {
        let snapAreaSize = this._settings.get_int('snap-area-size');
        let inSnapArea = false;
        
        // Check if cursor is in this snap area
        switch (areaName) {
            case 'top-left-corner':
                inSnapArea = (x <= workArea.x + snapAreaSize && 
                              y <= workArea.y + snapAreaSize);
                break;
            case 'top-right-corner':
                inSnapArea = (x >= workArea.x + workArea.width - snapAreaSize && 
                              y <= workArea.y + snapAreaSize);
                break;
            case 'bottom-left-corner':
                inSnapArea = (x <= workArea.x + snapAreaSize && 
                              y >= workArea.y + workArea.height - snapAreaSize);
                break;
            case 'bottom-right-corner':
                inSnapArea = (x >= workArea.x + workArea.width - snapAreaSize && 
                              y >= workArea.y + workArea.height - snapAreaSize);
                break;
            case 'top-edge':
                inSnapArea = (y <= workArea.y + snapAreaSize && 
                              x > workArea.x + snapAreaSize && 
                              x < workArea.x + workArea.width - snapAreaSize);
                break;
            case 'bottom-edge':
                inSnapArea = (y >= workArea.y + workArea.height - snapAreaSize && 
                              x > workArea.x + snapAreaSize && 
                              x < workArea.x + workArea.width - snapAreaSize);
                break;
            case 'left-edge':
                inSnapArea = (x <= workArea.x + snapAreaSize && 
                              y > workArea.y + snapAreaSize && 
                              y < workArea.y + workArea.height - snapAreaSize);
                break;
            case 'right-edge':
                inSnapArea = (x >= workArea.x + workArea.width - snapAreaSize && 
                              y > workArea.y + snapAreaSize && 
                              y < workArea.y + workArea.height - snapAreaSize);
                break;
        }
        
        // If in snap area, show preview
        if (inSnapArea) {
            log(`Cursor in snap area: ${areaName}`);
            // Get the position action for this area from settings
            let positionAction = this._settings.get_string(`snap-${areaName}-action`);
            log(`Action for ${areaName}: ${positionAction}`);
            this._showPreview(positionAction);
            this._currentSnapArea = areaName;
            this._currentSnapAction = positionAction;
        } else if (this._currentSnapArea === areaName) {
            // If we left this snap area, hide preview
            log(`Cursor left snap area: ${areaName}`);
            this._hidePreview();
            this._currentSnapArea = null;
            this._currentSnapAction = null;
        }
    }

    _showPreview(position) {
        // Create or update preview rectangle
        if (!this._previewRect) {
            this._previewRect = new St.Widget({
                style_class: 'rectangle-preview',
                style: 'background-color: rgba(52, 152, 219, 0.3); border: 1px solid rgba(52, 152, 219, 0.8);'
            });
            Main.uiGroup.add_actor(this._previewRect);
        }
        
        // Calculate preview rectangle based on position
        let monitor = this._dragMonitor;
        let workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);
        let previewRect = new Meta.Rectangle();
        
        // Reuse the same position calculation logic as in RectangleIndicator._moveActiveWindow
        switch (position) {
            // Halves
            case POSITIONS.LEFT_HALF:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_HALF:
                previewRect.x = workArea.x + Math.floor(workArea.width / 2);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = workArea.height;
                break;
            case POSITIONS.TOP_HALF:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = workArea.width;
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_HALF:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = workArea.width;
                previewRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Quarters
            case POSITIONS.TOP_LEFT:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_RIGHT:
                previewRect.x = workArea.x + Math.floor(workArea.width / 2);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_LEFT:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_RIGHT:
                previewRect.x = workArea.x + Math.floor(workArea.width / 2);
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = Math.floor(workArea.width / 2);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Thirds
            case POSITIONS.LEFT_THIRD:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = workArea.height;
                break;
            case POSITIONS.CENTER_THIRD:
                previewRect.x = workArea.x + Math.floor(workArea.width / 3);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_THIRD:
                previewRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = workArea.height;
                break;
                
            // Two-thirds
            case POSITIONS.LEFT_TWO_THIRDS:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width * 2 / 3);
                previewRect.height = workArea.height;
                break;
            case POSITIONS.RIGHT_TWO_THIRDS:
                previewRect.x = workArea.x + Math.floor(workArea.width / 3);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width * 2 / 3);
                previewRect.height = workArea.height;
                break;
                
            // Sixths (top row)
            case POSITIONS.TOP_LEFT_SIXTH:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_CENTER_SIXTH:
                previewRect.x = workArea.x + Math.floor(workArea.width / 3);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.TOP_RIGHT_SIXTH:
                previewRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                previewRect.y = workArea.y;
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Sixths (bottom row)
            case POSITIONS.BOTTOM_LEFT_SIXTH:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_CENTER_SIXTH:
                previewRect.x = workArea.x + Math.floor(workArea.width / 3);
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
            case POSITIONS.BOTTOM_RIGHT_SIXTH:
                previewRect.x = workArea.x + Math.floor(workArea.width * 2 / 3);
                previewRect.y = workArea.y + Math.floor(workArea.height / 2);
                previewRect.width = Math.floor(workArea.width / 3);
                previewRect.height = Math.floor(workArea.height / 2);
                break;
                
            // Special positions
            case POSITIONS.MAXIMIZE:
                previewRect.x = workArea.x;
                previewRect.y = workArea.y;
                previewRect.width = workArea.width;
                previewRect.height = workArea.height;
                break;
            case POSITIONS.CENTER:
                // Center the window at 2/3 of the screen size
                const centerWidth = Math.floor(workArea.width * 2/3);
                const centerHeight = Math.floor(workArea.height * 2/3);
                previewRect.x = workArea.x + (workArea.width - centerWidth) / 2;
                previewRect.y = workArea.y + (workArea.height - centerHeight) / 2;
                previewRect.width = centerWidth;
                previewRect.height = centerHeight;
                break;
        }
        
        // Position the preview
        this._previewRect.set_position(previewRect.x, previewRect.y);
        this._previewRect.set_size(previewRect.width, previewRect.height);
        this._previewRect.show();
    }

    _hidePreview() {
        if (this._previewRect) {
            this._previewRect.destroy();
            this._previewRect = null;
        }
    }
}

function init() {
    // We don't need translations for this extension
    return new Extension();
}
