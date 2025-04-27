#!/bin/bash

# Path to the installed extension
EXTENSION_PATH=~/.local/share/gnome-shell/extensions/rectangle-gnome@mohamed.github.io

# Check if the extension directory exists
if [ ! -d "$EXTENSION_PATH" ]; then
    echo "Extension directory not found at $EXTENSION_PATH"
    exit 1
fi

# Copy the modified files to the installed extension
echo "Copying modified files to $EXTENSION_PATH..."
cp -v extension.js "$EXTENSION_PATH/"
cp -v prefs.js "$EXTENSION_PATH/"
cp -v schemas/org.gnome.shell.extensions.rectangle-gnome.gschema.xml "$EXTENSION_PATH/schemas/"

# Compile the schemas
echo "Compiling schemas..."
cd "$EXTENSION_PATH" && glib-compile-schemas schemas/

echo "Update complete. You can now restart GNOME Shell with Alt+F2, r, Enter"
echo "Or log out and log back in to test the window layout persistence feature"
