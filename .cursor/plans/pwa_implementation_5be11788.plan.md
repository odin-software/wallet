---
name: PWA Implementation
overview: ""
todos:
  - id: pwa-deps
    content: Install vite-plugin-pwa and configure in vite.config.ts
    status: completed
  - id: pwa-icons
    content: Create PWA icons (192px, 512px, apple-touch-icon)
    status: completed
  - id: pwa-html
    content: Update index.html with manifest link and iOS meta tags
    status: completed
---

# PWA Implementation for iOS Installation

## Summary

Add Progressive Web App support using `vite-plugin-pwa` for automatic manifest generation, service worker with offline caching, and iOS-specific configuration. This will allow the app to be "installed" on your wife's iPhone via Safari's "Add to Home Screen".

## Implementation

### 1. Install vite-plugin-pwa

Add the PWA plugin to handle manifest and service worker generation automatically.

### 2. Configure PWA in Vite

Update [`frontend/vite.config.ts`](frontend/vite.config.ts) with PWA plugin configuration:

- App name, description, theme colors
- Display mode: `standalone` (looks like native app)
- Icon definitions for all required sizes
- Service worker strategy: `generateSW` with runtime caching for API calls
- iOS-specific settings

### 3. Create App Icons

Create PNG icons in [`frontend/public/`](frontend/public/):

- `pwa-192x192.png` - Standard PWA icon
- `pwa-512x512.png` - Large PWA icon
- `apple-touch-icon-180x180.png` - iOS home screen icon

Will generate from the existing [`favicon.svg`](frontend/public/favicon.svg) design (wallet on dark background with accent color).

### 4. Update index.html

Add manifest link and additional iOS meta tags to [`frontend/index.html`](frontend/index.html):

- Link to manifest.webmanifest
- Apple touch icon references
- iOS splash screen color

### 5. Service Worker Caching Strategy

The service worker will cache:

- **App shell**: HTML, CSS, JS (cache-first)
- **API calls**: Network-first with fallback to cache for `/api/*` endpoints
- **Static assets**: Cache-first for images and fonts

## File Changes

| File | Change |

|------|--------|

| `frontend/package.json` | Add vite-plugin-pwa dependency |

| `frontend/vite.config.ts` | Configure PWA plugin |

| `frontend/index.html` | Add manifest link |

| `frontend/public/pwa-192x192.png` | New - PWA icon |

| `frontend/public/pwa-512x512.png` | New - Large PWA icon |

| `frontend/public/apple-touch-icon-180x180.png` | New - iOS icon |

## iOS Installation

Once deployed, your wife can:

1. Open the app URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"