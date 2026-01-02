---
name: iOS PWA Performance Optimizations
overview: ""
todos:
  - id: remove-global-transitions
    content: Remove conflicting global * CSS transitions from index.css
    status: in_progress
  - id: mobile-blur-utilities
    content: Add CSS utilities to disable blur effects on mobile/touch devices
    status: pending
  - id: update-dashboard-header
    content: Update Dashboard header to use conditional blur class
    status: pending
  - id: update-landing-blurs
    content: Update Landing page to disable blur and infinite animations on mobile
    status: pending
  - id: update-onboarding-blur
    content: Update OnboardingCarousel gradient blur for mobile
    status: pending
  - id: ios-optimizations
    content: Add iOS-specific hardware acceleration CSS hints
    status: pending
---

# iOS PWA Performance Optimizations

## Overview

Fix flickering during page navigation on iOS PWA by removing conflicting global CSS transitions and conditionally disabling blur effects on mobile devices.

## Root Cause

The global `*` selector in `index.css` applies CSS transitions to ALL elements, conflicting with Framer Motion's animation system and causing double-animations that manifest as flickering.

## Changes

### 1. Remove Global Transition Selector ([frontend/src/index.css](frontend/src/index.css))

Remove the problematic global `*` transition rule (lines 85-90) that conflicts with Framer Motion. Components that need transitions already have them via Tailwind's `transition-colors`, `transition-all`, etc.

### 2. Conditional Blur Effects

Create a utility approach for blur effects that:

- Uses `@media (hover: hover)` to detect desktop/mouse devices
- Disables `backdrop-blur` and heavy `blur-*` on touch devices (mobile)
- Keeps visual effects on desktop where performance is better

Affected files:

- [frontend/src/index.css](frontend/src/index.css) - Add mobile-specific overrides
- [frontend/src/pages/Dashboard.tsx](frontend/src/pages/Dashboard.tsx) - Header blur
- [frontend/src/pages/Landing.tsx](frontend/src/pages/Landing.tsx) - Background blurs
- [frontend/src/components/onboarding/OnboardingCarousel.tsx](frontend/src/components/onboarding/OnboardingCarousel.tsx) - Gradient blur

### 3. iOS-specific optimizations ([frontend/src/index.css](frontend/src/index.css))

- Add `-webkit-transform: translateZ(0)` for hardware acceleration hints
- Add `-webkit-backface-visibility: hidden` to animated elements
- Ensure smooth scrolling with `-webkit-overflow-scrolling: touch`