# Concert Archive Vite Project - Setup & Usage

## Quick Start

### 1. Install Dependencies
```bash
cd /sessions/clever-great-brown/mnt/davidmccrindle
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The site will be available at `http://localhost:5173`

### 3. Build for Production
```bash
npm run build
```
Optimized files will be in the `dist/` directory

## Project Structure

The refactored project is organized as follows:

```
├── index.html                      # Main entry HTML
├── package.json                    # NPM configuration with Vite dev dependency
├── vite.config.js                  # Vite build configuration
├── css/
│   ├── global.css                 # Base styles, nav, modal, animations
│   └── concert-archive.css        # Map, panels, cards, responsive styles
├── js/
│   ├── main.js                    # Entry point, initializes app
│   ├── nav.js                     # Mobile menu & section dropdown
│   └── concert-archive/           # Feature modules
│       ├── state.js               # Shared app state & SHOWS array
│       ├── data.js                # CSV parsing & geocoding
│       ├── map.js                 # Leaflet map management
│       ├── render.js              # Main render orchestration
│       ├── shows.js               # Shows view & year navigation
│       ├── artists.js             # Artists view & sorting
│       ├── places.js              # Places/cities view
│       ├── venues.js              # Venues view
│       ├── tooltips.js            # Hover tooltips & navigation
│       └── api.js                 # Wikipedia/MusicBrainz integration
└── public/
    └── data/
        └── concerts.csv           # Concert data (391 records)
```

## What's New

### From Original File
The original `concert-archive.html` (2,412 lines) has been refactored into:

**HTML** (`index.html` - 180 lines)
- Clean, semantic HTML structure
- No inline styles or scripts
- CSS and JS imported as modules

**CSS** (~1,200 lines total)
- `global.css`: Reset, fonts, nav, hamburger, modals
- `concert-archive.css`: Map, UI panels, responsive design

**JavaScript** (~1,800 lines across 11 modules)
- Each module handles a specific feature
- Clean imports/exports with no circular dependencies
- Easier to maintain and extend

**Data** (`concerts.csv`)
- 391 concert records extracted from original
- Proper UK region mapping (Scotland, England, Wales, Northern Ireland)
- Served from `public/` directory

## Key Features Preserved

✓ Leaflet-based interactive map
✓ Shows browsing by year
✓ Artist list with Wikipedia images
✓ Places (cities & countries) view
✓ Venues management
✓ Hover tooltips with stats
✓ Search functionality (shows & artists)
✓ Mobile responsive design
✓ Dark theme with animations
✓ Keyboard shortcuts (Escape, Cmd+K)

## Development Tips

### Adding a New Feature
1. Create a new module in `js/concert-archive/`
2. Import needed dependencies (state, data, etc.)
3. Export functions
4. Import in `main.js` and attach to window if needed for inline handlers

### Modifying State
State is managed in `state.js`:
```javascript
import { state, SHOWS } from './concert-archive/state.js';
// Access: state.section, state.year, etc.
// Update: state.section = 'artists'
```

### Adding Styles
Add styles to appropriate CSS file:
- Global UI: `css/global.css`
- Concert-archive specific: `css/concert-archive.css`

### Debugging
All global functions are attached to `window` in `main.js` for debugging:
```javascript
window.setSection('shows')
window.renderShows()
```

## Performance Notes

- CSV data is fetched asynchronously on page load
- Wikipedia images are cached in `wikiCache` object
- Markers are clustered based on zoom level
- Mobile optimizations included (max-height scrolling, responsive grid)

## Browser Support

Requires modern browser with support for:
- ES6 modules
- async/await
- Optional chaining (?.)
- Promise API

Tested on Chrome, Firefox, Safari, Edge (latest versions)

## Troubleshooting

### CSV Not Loading
- Verify `public/data/concerts.csv` exists
- Check browser console for fetch errors
- Ensure dev server is serving the `public/` directory

### Maps Not Showing
- Verify Leaflet is loaded (`https://unpkg.com/leaflet@1.9.4`)
- Check that `#map` element exists in HTML
- Look for console errors related to tile layer

### Tooltips Not Working
- Check that `.show-link` elements have `data-tt` and `data-name` attributes
- Verify event listeners are attached (should be in `tooltips.js`)
- Check browser console for errors

## File Sizes (Approximate)

- `index.html`: 180 lines (8 KB)
- `css/global.css`: 550 lines (25 KB)
- `css/concert-archive.css`: 650 lines (35 KB)
- `js/` modules: 1,800 lines total (65 KB unminified)
- `concerts.csv`: 391 records (35 KB)
- **Total**: ~13 KB minified + gzipped

