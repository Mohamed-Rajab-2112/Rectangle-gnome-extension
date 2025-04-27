#!/bin/bash

# Create extensions directory if it doesn't exist
mkdir -p ~/.local/share/gnome-shell/extensions/rectangle-gnome@cascade.example

# Copy all files to the extension directory
cp -r * ~/.local/share/gnome-shell/extensions/rectangle-gnome@cascade.example/

# Compile schemas in the extension directory
cd ~/.local/share/gnome-shell/extensions/rectangle-gnome@cascade.example/
glib-compile-schemas schemas/

echo "Extension installed. You can now restart GNOME Shell with Alt+F2, r, Enter"
echo "Or enable the extension with the Extensions app or gnome-extensions-app"
