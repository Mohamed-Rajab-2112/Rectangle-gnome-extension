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
        this._windowCreatedId = 0;
        this._windowsTracker = null;
        this._windowLayoutData = {};
        this._windowSignalIds = new Map();
        this._layoutSaveTimeoutId = 0;
        this._saveLayoutTimeout = 0;
    }

    enable() {
        log('Enabling Rectangle for GNOME extension');
        
        // Load settings
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.rectangle-gnome');
        
        // Load window tracker
        this._windowsTracker = Shell.WindowTracker.get_default();
        
        // Load saved window layouts
        this._loadWindowLayouts();
        
        // Add panel button
        this._indicator = new RectangleIndicator();
        Main.panel.addToStatusArea('rectangle-gnome', this._indicator);
        
        // Set default snap area size if not already set
        if (this._settings.get_int('snap-area-size') <= 0) {
            this._settings.set_int('snap-area-size', 30); // Larger default size
        }
        
        // Add keyboard shortcuts
        this._addKeybindings();
        
        // Setup snap areas
        this._setupSnapAreas();
        
        // Connect to window creation events for restoring layouts
        this._windowCreatedId = global.display.connect('window-created', 
            (display, window) => this._onWindowCreated(window));
            
        // Connect to existing windows to track their positions
        this._connectToExistingWindows();
        
        // Set up periodic saving of window layouts (every 30 seconds)
        this._layoutSaveTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            30,
            () => {
                this._saveAllWindowPositions();
                this._cleanupOldLayouts();
                return GLib.SOURCE_CONTINUE; // Continue the timeout
            }
        );
        
        log('Rectangle for GNOME extension enabled');
    }

    disable() {
        log('Disabling Rectangle for GNOME extension');
        
        // Save window positions before disabling
        this._saveAllWindowPositions();
        
        // Clean up the save layout timeout if it exists
        if (this._saveLayoutTimeout) {
            GLib.source_remove(this._saveLayoutTimeout);
            this._saveLayoutTimeout = 0;
        }
        
        // Remove keyboard shortcuts
        this._removeKeybindings();
        
        // Remove snap areas
        this._removeSnapAreas();
        
        // Disconnect window signals
        this._disconnectWindowSignals();
        
        // Disconnect from window creation events
        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = 0;
        }
        
        // Remove periodic layout saving
        if (this._layoutSaveTimeoutId) {
            GLib.source_remove(this._layoutSaveTimeoutId);
            this._layoutSaveTimeoutId = 0;
        }
        
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
        this._windowLayoutData = {};
    }

    _loadWindowLayouts() {
        // Only load layouts if the feature is enabled
        if (!this._settings.get_boolean('save-window-positions')) {
            log('Window layout persistence is disabled');
            return;
        }
        
        try {
            // Load saved window layouts from settings (stored as JSON string)
            const layoutsJson = this._settings.get_string('window-layouts');
            log(`Loading window layouts from settings. JSON size: ${layoutsJson.length} bytes`);
            
            if (!layoutsJson || layoutsJson === '{}') {
                log('No saved window layouts found');
                this._windowLayoutData = {};
                return;
            }
            
            this._windowLayoutData = JSON.parse(layoutsJson);
            const layoutCount = Object.keys(this._windowLayoutData).length;
            log(`Loaded ${layoutCount} window layouts`);
            
            // Log the first few layouts for debugging
            let count = 0;
            for (const [windowKey, layout] of Object.entries(this._windowLayoutData)) {
                if (count < 5) { // Only log the first 5 layouts to avoid flooding the log
                    log(`Loaded layout for window: ${windowKey} at position (${layout.x},${layout.y}) with size ${layout.width}x${layout.height}`);
                }
                count++;
            }
        } catch (e) {
            log(`Error loading window layouts: ${e.message}\n${e.stack}`);
            this._windowLayoutData = {};
        }
    }

    _saveAllWindowPositions() {
        // Only save layouts if the feature is enabled
        if (!this._settings.get_boolean('save-window-positions')) {
            log('Window layout persistence is disabled, not saving layouts');
            return;
        }
        
        try {
            // Save all current window positions to settings
            const layouts = {};
            
            log('Starting to save window layouts...');
            let windowCount = 0;
            
            // Get all windows - different method based on GNOME Shell version
            let windows = [];
            if (global.display.get_windows) {
                // Newer GNOME Shell versions
                windows = global.display.get_windows();
            } else if (global.get_window_actors) {
                // Older GNOME Shell versions
                windows = global.get_window_actors().map(actor => actor.get_meta_window());
            } else {
                log('Unable to get window list - unsupported GNOME Shell version');
                return;
            }
            
            log(`Found ${windows.length} windows to save layouts for`);
            
            for (let window of windows) {
                // Skip windows we don't want to save
                if (!this._shouldSaveWindow(window)) {
                    log(`Skipping window: ${window.get_title()} (not suitable for saving)`);
                    continue;
                }
                
                // Get window details
                const app = this._windowsTracker.get_window_app(window);
                if (!app) {
                    log(`Skipping window: ${window.get_title()} (no app found)`);
                    continue;
                }
                
                const appId = app.get_id();
                const rect = window.get_frame_rect();
                const monitor = window.get_monitor();
                
                // Create a unique identifier for this window
                const windowKey = `${appId}:${window.get_wm_class()}:${window.get_title()}`;
                
                layouts[windowKey] = {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    monitor: monitor,
                    lastSeen: Date.now()
                };
                
                log(`Saved layout for window: ${windowKey} at position (${rect.x},${rect.y}) with size ${rect.width}x${rect.height})`);
                windowCount++;
            }
            
            // Update our in-memory window layout data
            this._windowLayoutData = layouts;
            
            // Store as JSON string
            const layoutsJson = JSON.stringify(layouts);
            this._settings.set_string('window-layouts', layoutsJson);
            log(`Saved ${windowCount} window layouts. JSON size: ${layoutsJson.length} bytes`);
            
            // Verify the save worked by reading it back
            const savedJson = this._settings.get_string('window-layouts');
            log(`Verification - Read back ${savedJson.length} bytes of layout data`);
        } catch (e) {
            log(`Error saving window layouts: ${e.message}\n${e.stack}`);
        }
        
        return GLib.SOURCE_REMOVE;
    }

    _shouldSaveWindow(window) {
        const title = window.get_title();
        const wm_class = window.get_wm_class();
        const isCalendar = title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar');
        
        // Skip certain types of windows
        if (window.is_override_redirect()) {
            if (isCalendar) log(`Calendar window rejected: is_override_redirect = true`);
            return false;
        }
        
        // Accept more window types - include DIALOG, UTILITY, etc.
        const windowType = window.get_window_type();
        if (windowType !== Meta.WindowType.NORMAL && 
            windowType !== Meta.WindowType.DIALOG && 
            windowType !== Meta.WindowType.UTILITY) {
            if (isCalendar) log(`Calendar window rejected: window type = ${windowType}`);
            return false;
        }
        
        // Skip minimized windows
        if (window.minimized) {
            if (isCalendar) log(`Calendar window rejected: minimized = true`);
            return false;
        }
        
        // Log the window details for debugging
        if (isCalendar) {
            log(`Calendar window PASSED all checks and is eligible for saving`);
        }
        
        return true;
    }

    _connectToExistingWindows() {
        // Connect to existing windows to track their positions
        try {
            // Get all windows - different method based on GNOME Shell version
            let windows = [];
            if (global.display.get_windows) {
                // Newer GNOME Shell versions
                windows = global.display.get_windows();
            } else if (global.get_window_actors) {
                // Older GNOME Shell versions
                windows = global.get_window_actors().map(actor => actor.get_meta_window());
            } else {
                log('Unable to get window list - unsupported GNOME Shell version');
                return;
            }
            
            log(`Found ${windows.length} existing windows to connect to`);
            
            for (let window of windows) {
                if (this._shouldSaveWindow(window)) {
                    this._connectToWindow(window);
                }
            }
        } catch (e) {
            log(`Error connecting to existing windows: ${e.message}\n${e.stack}`);
        }
    }

    _disconnectWindowSignals() {
        // Disconnect from all windows
        for (let [window, signals] of this._windowSignalIds.entries()) {
            for (let signalId of signals) {
                if (window && signalId) {
                    window.disconnect(signalId);
                }
            }
        }
        this._windowSignalIds.clear();
    }

    _connectToWindow(window) {
        if (!window) return;
        
        const signals = [];
        
        // Connect to window position changes
        signals.push(window.connect('position-changed', () => {
            this._updateWindowLayout(window);
        }));
        
        // Connect to window size changes
        signals.push(window.connect('size-changed', () => {
            this._updateWindowLayout(window);
        }));
        
        // Store signal IDs for later disconnection
        this._windowSignalIds.set(window, signals);
    }
    
    _updateWindowLayout(window) {
        if (!window || !this._settings.get_boolean('save-window-positions')) return;
        
        // Special debug for Calendar app
        const title = window.get_title();
        const wm_class = window.get_wm_class();
        if (title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar')) {
            log(`Calendar window detected: Title="${title}", WM_CLASS="${wm_class}", Type=${window.get_window_type()}`);
            log(`Calendar window properties: override_redirect=${window.is_override_redirect()}, minimized=${window.minimized}`);
        }
        
        // Skip windows we don't want to save
        if (!this._shouldSaveWindow(window)) {
            if (title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar')) {
                log(`Calendar window NOT eligible for saving: ${window.get_title()}`);
            }
            return;
        }
        
        // Get window details
        const app = this._windowsTracker.get_window_app(window);
        if (!app) {
            if (title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar')) {
                log(`Calendar window has no app associated with it!`);
            }
            return;
        }
        
        const appId = app.get_id();
        const rect = window.get_frame_rect();
        const monitor = window.get_monitor();
        
        // Create a unique identifier for this window
        const windowKey = `${appId}:${window.get_wm_class()}:${window.get_title()}`;
        
        // Special debug for Calendar app
        if (title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar')) {
            log(`Calendar window key: ${windowKey}`);
            log(`Calendar window position: (${rect.x},${rect.y}) with size ${rect.width}x${rect.height}`);
        }
        
        // Update layout data
        this._windowLayoutData[windowKey] = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            monitor: monitor,
            lastSeen: Date.now()
        };
        
        // Debounce the save operation to avoid excessive writes
        if (this._saveLayoutTimeout) {
            GLib.source_remove(this._saveLayoutTimeout);
        }
        
        // Save after a short delay (300ms) to avoid saving too frequently
        this._saveLayoutTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._persistWindowLayouts();
            this._saveLayoutTimeout = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _persistWindowLayouts() {
        if (!this._settings.get_boolean('save-window-positions')) {
            return;
        }
        
        try {
            // Use the same format as _saveAllWindowPositions for consistency
            const layoutsJson = JSON.stringify(this._windowLayoutData);
            this._settings.set_string('window-layouts', layoutsJson);
            log(`Persisted window layouts. JSON size: ${layoutsJson.length} bytes`);
            
            // For debugging - log a sample of what's being saved
            const keys = Object.keys(this._windowLayoutData);
            if (keys.length > 0) {
                const sampleKey = keys[0];
                log(`Sample window layout: ${sampleKey} at position (${this._windowLayoutData[sampleKey].x},${this._windowLayoutData[sampleKey].y})`);
            }
        } catch (e) {
            log(`Error persisting window layouts: ${e.message}\n${e.stack}`);
        }
        
        return GLib.SOURCE_REMOVE;
    }

    _onWindowCreated(window) {
        if (!window || !this._settings.get_boolean('save-window-positions')) return;
        
        // Special debug for Calendar
        const title = window.get_title();
        const wm_class = window.get_wm_class();
        const isCalendar = title.includes('Calendar') || wm_class.includes('calendar') || wm_class.includes('Calendar');
        
        // Skip windows we don't want to restore
        if (!this._shouldSaveWindow(window)) {
            log(`Not restoring window: ${window.get_title()} (not suitable for restoration)`);
            return;
        }
        
        // Connect to the window for tracking changes
        this._connectToWindow(window);
        
        log(`Window created: ${window.get_title()}, checking for saved layout...`);
        
        // Wait a moment for the window to initialize
        // Use a longer delay for Calendar app to ensure it's fully initialized
        const delay = isCalendar ? 1000 : 300;
        
        if (isCalendar) {
            log(`Using longer delay (${delay}ms) for Calendar app to ensure proper restoration`);
        }
        
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            try {
                // Get window details
                const app = this._windowsTracker.get_window_app(window);
                if (!app) {
                    log(`Cannot restore window: ${window.get_title()} (no app found)`);
                    return GLib.SOURCE_REMOVE;
                }
                
                const appId = app.get_id();
                const windowClass = window.get_wm_class();
                const windowTitle = window.get_title();
                const windowKey = `${appId}:${windowClass}:${windowTitle}`;
                
                log(`Looking for saved layout with key: ${windowKey}`);
                
                // Check if we have a saved layout for this window
                const layout = this._windowLayoutData[windowKey];
                if (layout) {
                    log(`Found saved layout for window: ${windowKey}`);
                    
                    // Ensure the window is on the correct monitor
                    if (layout.monitor !== undefined && layout.monitor !== window.get_monitor()) {
                        log(`Moving window to monitor: ${layout.monitor} (currently on ${window.get_monitor()})`);
                        window.move_to_monitor(layout.monitor);
                    }
                    
                    // Restore position and size
                    log(`Restoring window to position (${layout.x},${layout.y}) with size ${layout.width}x${layout.height}`);
                    window.move_resize_frame(true, layout.x, layout.y, layout.width, layout.height);
                    
                    // For Calendar app, apply the position twice with a small delay to ensure it sticks
                    if (isCalendar) {
                        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                            log(`Re-applying position for Calendar window to ensure it sticks`);
                            window.move_resize_frame(true, layout.x, layout.y, layout.width, layout.height);
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                    
                    // Update the last seen timestamp
                    layout.lastSeen = Date.now();
                } else {
                    log(`No saved layout found for window: ${windowKey}`);
                    
                    // Try some alternative keys (in case the title changed slightly)
                    let found = false;
                    for (const [savedKey, savedLayout] of Object.entries(this._windowLayoutData)) {
                        if (savedKey.startsWith(`${appId}:${windowClass}:`)) {
                            log(`Found similar layout: ${savedKey}`);
                            
                            // Ensure the window is on the correct monitor
                            if (savedLayout.monitor !== undefined && savedLayout.monitor !== window.get_monitor()) {
                                window.move_to_monitor(savedLayout.monitor);
                            }
                            
                            // Restore position and size
                            log(`Restoring window to position (${savedLayout.x},${savedLayout.y}) with size ${savedLayout.width}x${savedLayout.height}`);
                            window.move_resize_frame(true, savedLayout.x, savedLayout.y, savedLayout.width, savedLayout.height);
                            
                            // Update the key and last seen timestamp
                            this._windowLayoutData[windowKey] = savedLayout;
                            savedLayout.lastSeen = Date.now();
                            
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        log(`No similar layouts found for window: ${windowKey}`);
                    }
                }
            } catch (e) {
                log(`Error restoring window layout: ${e.message}\n${e.stack}`);
            }
            
            return GLib.SOURCE_REMOVE;
        });
    }

    _cleanupOldLayouts() {
        // Only clean up layouts if the feature is enabled
        if (!this._settings.get_boolean('save-window-positions')) {
            log('Window layout persistence is disabled, not cleaning up layouts');
            return;
        }
        
        try {
            // Get the current time
            const now = Date.now();
            
            // Get the maximum age for layouts (in milliseconds)
            const maxAge = this._settings.get_int('max-layout-age') * 1000;
            
            // Create a new layout data object
            const newLayouts = {};
            
            // Iterate over the current layouts
            for (let [windowKey, layout] of Object.entries(this._windowLayoutData)) {
                // Check if the layout is recent enough
                if (now - layout.lastSeen < maxAge) {
                    // Add the layout to the new layout data object
                    newLayouts[windowKey] = layout;
                } else {
                    log(`Removing old layout for window: ${windowKey}`);
                }
            }
            
            // Update the layout data
            this._windowLayoutData = newLayouts;
            
            // Store the updated layouts as a JSON string
            this._settings.set_string('window-layouts', JSON.stringify(this._windowLayoutData));
            log(`Cleaned up ${Object.keys(this._windowLayoutData).length} window layouts`);
        } catch (e) {
            log(`Error cleaning up window layouts: ${e}`);
        }
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

        let indicator = Main.panel.statusArea['rectangle-gnome'];
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
            let indicator = Main.panel.statusArea['rectangle-gnome'];
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
