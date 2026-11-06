# Custom Jellyfin theme called Orphues

- 80% Vibe coded, 20% coded with vibes
- Custom CSS and JavaScript for Jellyfin
- Works on desktop, tablets and cellphones
- Works on Jellyfin 12.4
- Pulls Font from Google
- You need to create your own library icons for movies, series etc..

## What is included

- 'orpheus_theme.css' : Main Visual Theme
- 'orpheus_mediaspotlight.js' : Home Page Hero Banner
- 'orpheus_nav.js' : Custom Navigation Icons
- 'orhpeus_scrollhighlight.js' : Home Page Headers Highlight As You Scroll
- 'orpheus_libraryfilters.js' : Filter Tabs Inside Library Folders
- 'orpheus_pausescreen.js' : Custom Display When Playback Is Paused
- 'orpheus_pausecontrols.js' : Player Controls In The Centre Of The Playback

## Installation

### CSS

1. Open **Jellfin -  Dashboard - Branding**.
2. Paste the contents of 'orpheus_theme.css' into **Custom CSS Code**.
3. Save.

### JavaScript

1. Install the **JavaScript Injector** Plugin.
2. Open the JavaScript Injector Settings.
3. Create a new script for each each .js file, pasting the contents of the relevant file as you go.
4. Save and enable each script

## Requirements

- Jellyinf Web Client updated to latest version
- JavaScript Injector Plugin

## Troubleshooting Notes

- On Android, you may need to update your WebView Client
- Test after each item you add if the video plays, if not - remove what you just added and try playing the video again - then add back
- After each item added, restart the Jellyfin app or hard refresh the web page using Ctrl + Shift + R
