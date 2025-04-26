'use strict';

const { Adw, Gio, Gtk, Gdk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.rectangle-gnome');
    
    // Create a preferences page
    const page = new Adw.PreferencesPage();
    window.add(page);

    // Create a keyboard shortcuts group
    const shortcutsGroup = new Adw.PreferencesGroup({
        title: 'Keyboard Shortcuts',
        description: 'Customize keyboard shortcuts for window positioning'
    });
    page.add(shortcutsGroup);

    // Add shortcut rows
    addShortcutRow(shortcutsGroup, settings, 'rectangle-left-half', 'Left Half');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-right-half', 'Right Half');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-top-half', 'Top Half');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-bottom-half', 'Bottom Half');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-top-left', 'Top Left Quarter');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-top-right', 'Top Right Quarter');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-bottom-left', 'Bottom Left Quarter');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-bottom-right', 'Bottom Right Quarter');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-left-third', 'Left Third');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-center-third', 'Center Third');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-right-third', 'Right Third');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-left-two-thirds', 'Left Two Thirds');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-right-two-thirds', 'Right Two Thirds');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-maximize', 'Maximize');
    addShortcutRow(shortcutsGroup, settings, 'rectangle-center', 'Center');

    // Create a snap areas group
    const snapAreasGroup = new Adw.PreferencesGroup({
        title: 'Snap Areas',
        description: 'Customize what happens when you drag windows to screen edges'
    });
    page.add(snapAreasGroup);

    // Add snap area size setting
    const snapAreaSizeRow = new Adw.ActionRow({ title: 'Snap Area Size (pixels)' });
    const snapAreaSizeAdjustment = new Gtk.Adjustment({
        lower: 5,
        upper: 50,
        step_increment: 1,
        page_increment: 5,
        value: settings.get_int('snap-area-size')
    });
    const snapAreaSizeSpinButton = new Gtk.SpinButton({
        adjustment: snapAreaSizeAdjustment,
        climb_rate: 1,
        digits: 0,
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END
    });
    snapAreaSizeRow.add_suffix(snapAreaSizeSpinButton);
    snapAreasGroup.add(snapAreaSizeRow);

    snapAreaSizeSpinButton.connect('value-changed', () => {
        settings.set_int('snap-area-size', snapAreaSizeSpinButton.get_value());
    });

    // Add snap area action settings
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-top-left-corner-action', 'Top Left Corner');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-top-right-corner-action', 'Top Right Corner');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-bottom-left-corner-action', 'Bottom Left Corner');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-bottom-right-corner-action', 'Bottom Right Corner');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-top-edge-action', 'Top Edge');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-bottom-edge-action', 'Bottom Edge');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-left-edge-action', 'Left Edge');
    addSnapAreaActionRow(snapAreasGroup, settings, 'snap-right-edge-action', 'Right Edge');
}

function addShortcutRow(group, settings, name, title) {
    const shortcutRow = new Adw.ActionRow({ title });
    
    const shortcutLabel = new Gtk.ShortcutLabel({
        accelerator: settings.get_strv(name)[0] || '',
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END
    });
    
    shortcutRow.add_suffix(shortcutLabel);
    group.add(shortcutRow);
    
    shortcutRow.activatable = true;
    shortcutRow.connect('activated', () => {
        // Create a new dialog for capturing the shortcut
        const dialog = new Adw.Window({
            title: `Set Shortcut for ${title}`,
            transient_for: group.get_root(),
            modal: true,
            default_width: 400,
            default_height: 200
        });
        
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 24
        });
        
        const label = new Gtk.Label({
            label: 'Press a key combination...',
            halign: Gtk.Align.CENTER
        });
        box.append(label);
        
        const keyDisplay = new Gtk.Label({
            label: 'Current: ' + (settings.get_strv(name)[0] || 'None'),
            halign: Gtk.Align.CENTER
        });
        box.append(keyDisplay);
        
        const buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.END,
            spacing: 12
        });
        
        const cancelButton = new Gtk.Button({
            label: 'Cancel'
        });
        cancelButton.connect('clicked', () => {
            dialog.destroy();
        });
        buttonBox.append(cancelButton);
        
        const clearButton = new Gtk.Button({
            label: 'Clear'
        });
        clearButton.connect('clicked', () => {
            settings.set_strv(name, []);
            shortcutLabel.set_accelerator('');
            keyDisplay.set_label('Current: None');
        });
        buttonBox.append(clearButton);
        
        const okButton = new Gtk.Button({
            label: 'OK',
            sensitive: false
        });
        okButton.connect('clicked', () => {
            dialog.destroy();
        });
        buttonBox.append(okButton);
        
        box.append(buttonBox);
        
        let currentAccelerator = '';
        
        // Add a controller for key events
        const keyController = new Gtk.EventControllerKey();
        keyController.connect('key-pressed', (controller, keyval, keycode, state) => {
            // Ignore modifier keys on their own
            if (keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
                keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
                keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
                keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R) {
                return Gdk.EVENT_PROPAGATE;
            }
            
            // Create accelerator string
            let mask = state & Gtk.accelerator_get_default_mod_mask();
            let accelerator = Gtk.accelerator_name(keyval, mask);
            
            // Update display
            keyDisplay.set_label('Current: ' + accelerator);
            currentAccelerator = accelerator;
            
            // Save the shortcut
            settings.set_strv(name, [accelerator]);
            shortcutLabel.set_accelerator(accelerator);
            
            // Enable OK button
            okButton.set_sensitive(true);
            
            return Gdk.EVENT_STOP;
        });
        
        box.add_controller(keyController);
        dialog.set_content(box);
        dialog.present();
    });
}

function addSnapAreaActionRow(group, settings, settingName, title) {
    const row = new Adw.ActionRow({ title });
    
    // Create a dropdown with all possible positions
    const model = new Gtk.StringList();
    
    // Add all position options
    const positions = [
        ['left-half', 'Left Half'],
        ['right-half', 'Right Half'],
        ['top-half', 'Top Half'],
        ['bottom-half', 'Bottom Half'],
        ['top-left', 'Top Left Quarter'],
        ['top-right', 'Top Right Quarter'],
        ['bottom-left', 'Bottom Left Quarter'],
        ['bottom-right', 'Bottom Right Quarter'],
        ['left-third', 'Left Third'],
        ['center-third', 'Center Third'],
        ['right-third', 'Right Third'],
        ['left-two-thirds', 'Left Two Thirds'],
        ['right-two-thirds', 'Right Two Thirds'],
        ['top-left-sixth', 'Top Left Sixth'],
        ['top-center-sixth', 'Top Center Sixth'],
        ['top-right-sixth', 'Top Right Sixth'],
        ['bottom-left-sixth', 'Bottom Left Sixth'],
        ['bottom-center-sixth', 'Bottom Center Sixth'],
        ['bottom-right-sixth', 'Bottom Right Sixth'],
        ['maximize', 'Maximize'],
        ['center', 'Center']
    ];
    
    positions.forEach(([value, label]) => {
        model.append(label);
    });
    
    const dropdown = new Gtk.DropDown({
        model,
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END
    });
    
    // Set current value
    const currentValue = settings.get_string(settingName);
    const currentIndex = positions.findIndex(([value]) => value === currentValue);
    dropdown.set_selected(currentIndex >= 0 ? currentIndex : 0);
    
    // Connect to changes
    dropdown.connect('notify::selected', () => {
        const selected = dropdown.get_selected();
        if (selected >= 0 && selected < positions.length) {
            settings.set_string(settingName, positions[selected][0]);
        }
    });
    
    row.add_suffix(dropdown);
    group.add(row);
}
