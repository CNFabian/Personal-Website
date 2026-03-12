# Website Improvements

## Overview

Beyond the casino expansion, the portfolio side of the website has room for polish, performance improvements, and new features. This document catalogs improvements organized by priority and effort level.

---

## High Priority — Should Be Done

### 1. Navigation Restructure

**Current State:** The navbar has links to Home, About, Projects, Resume, Contact, and Egyptian Ratscrew. The Secret page is hidden. The Egyptian Ratscrew link leads directly to the game.

**Improvement:** With the casino expansion, the navigation needs to evolve:

- Rename "Egyptian Ratscrew" to "Casino" or "Game Room"
- Make the Casino link the gateway to the entire casino ecosystem (lobby, all games)
- Consider grouping the site into two clear sections: "Portfolio" (Home, About, Projects, Resume, Contact) and "Casino" (Lobby, Games, Leaderboard)
- The navbar could have a visual divider or different styling for the casino link to signal it's a different experience
- Mobile hamburger menu should clearly separate portfolio links from the casino link

### 2. Performance Optimization

**Current Issues:**
- The home page loads Three.js, GSAP, and multiple animated GIF files for the footer characters. This is heavy for first-time visitors.
- Phaser 3 is bundled with the React app even for non-game pages. This adds to the main bundle size.

**Improvements:**
- **Code Splitting:** Use React.lazy() and Suspense to load the Phaser game bundle only when the user navigates to the casino. The portfolio pages shouldn't carry the weight of the game engine.
- **Lazy Load Footer Characters:** The animated GIFs in the footer are large. Load them only when they're about to scroll into view (Intersection Observer or a lazy-load library).
- **Image Optimization:** Convert PNGs to WebP format where possible. Add width/height attributes to prevent layout shift. Use srcset for responsive images.
- **Font Loading:** The site loads PressStart2P, Pixel Times, JuliusSansOne, and Inter fonts. Use `font-display: swap` to prevent invisible text during load. Consider subsetting fonts to include only used characters.

### 3. SEO and Metadata

**Current State:** The public/index.html has basic metadata but could be improved for discoverability.

**Improvements:**
- Add descriptive meta tags (description, keywords) to index.html
- Add Open Graph tags for social sharing (og:title, og:description, og:image)
- Add a Twitter Card meta tag
- Create a sitemap.xml for search engines
- Add structured data (JSON-LD) for the portfolio (Person schema with links to projects)
- Each React route should update document.title dynamically (react-helmet or a simple useEffect)

### 4. Accessibility (a11y)

**Current State:** The site uses custom UI elements (Phaser canvas, animated components) that may not be accessible to screen readers or keyboard-only users.

**Improvements:**
- Add proper alt text to all images (profile photos, project thumbnails, character sprites)
- Ensure the navbar is fully keyboard-navigable (Tab/Enter to navigate, Escape to close hamburger)
- Add ARIA labels to interactive elements
- Ensure sufficient color contrast (dark backgrounds with light text — mostly okay, but verify gold-on-green and other combinations)
- The contact form should have proper labels and error messages
- Game sections can note that they require visual/reaction-based interaction (honest limitation)

### 5. Mobile Experience Polish

**Current State:** The site is responsive but some elements feel adapted-from-desktop rather than mobile-native.

**Improvements:**
- Home page character selection cards could stack vertically on mobile instead of horizontal scroll
- The About page image tooltips don't work well on touch (hover-dependent). Switch to tap-to-expand on mobile.
- Projects timeline could use a simplified single-column layout on mobile with collapsible entries
- Contact form inputs should be sized for touch (minimum 44px tap targets)
- Footer character grid should reduce to 3 or fewer characters on small screens to avoid crowding

---

## Medium Priority — Would Be Nice

### 6. Projects Page Enhancement

**Improvements:**
- Add the casino platform itself as a featured project once it reaches a presentable state
- Add filter/category tabs: "Web Apps," "Games," "AI/ML," "Professional Work"
- Add thumbnail screenshots for each project (many currently have none)
- The YouTube embeds could be replaced with thumbnail images that load the iframe on click (performance improvement)
- Add GitHub links to open-source projects
- Consider a "Featured Project" spotlight at the top that rotates

### 7. About Page Refresh

**Improvements:**
- The underlined-letters puzzle is clever but invisible to most visitors. Consider adding a subtle hint ("Look closely...") that doesn't give it away but signals there's something to find
- Add a "What I'm Working On" section that highlights the casino project and other current interests
- The photo tooltips could benefit from a subtle visual cue (like a "hover me" shimmer) so visitors know they're interactive

### 8. Contact Form Upgrade

**Current State:** Submits to Google Apps Script. Works but lacks features.

**Improvements:**
- Add form validation with helpful error messages (email format, minimum message length)
- Add a "Subject" dropdown with preset options ("Collaboration," "Job Opportunity," "General Question," "Bug Report")
- Add a confirmation email to the sender (requires backend change)
- Rate-limit submissions to prevent spam
- Consider adding reCAPTCHA if spam becomes an issue

### 9. Dark/Light Mode Toggle

**Current State:** The site is permanently dark-themed.

**Improvement:** Add a theme toggle in the navbar. Most content works on dark backgrounds, but offering a light mode improves accessibility and user preference support. Store the preference in localStorage.

### 10. Blog Section

**Consideration:** A blog could showcase development progress on the casino, technical write-ups about game logic, and general tech/creative content. This would help with SEO and establish credibility.

**Implementation:** Could be as simple as markdown files rendered with a React markdown parser, or a headless CMS (like Contentful or Sanity) for a more polished experience.

---

## Low Priority — Future Polish

### 11. Page Transition Animations

Add smooth transitions between pages using Framer Motion or GSAP. The current hard-cut between routes feels abrupt. A subtle fade or slide would add polish.

### 12. Loading States

Add skeleton screens or loading animations for heavy pages (Projects with YouTube embeds, the Casino Phaser canvas). Currently, there's a blank moment while assets load.

### 13. Analytics

Add privacy-respecting analytics (Plausible, Umami, or a simple custom counter) to understand which pages get traffic, how many people play games, and where visitors come from.

### 14. Error Handling

Add a custom 404 page for invalid routes. Currently, unknown routes likely show a blank page or the React Router fallback. A themed 404 page (maybe with a lost-in-the-casino joke) adds personality.

### 15. Resume Page Improvement

**Current State:** An iframe showing a PDF. Functional but minimal.

**Improvements:**
- Add a download button alongside the iframe
- Consider rendering the resume as HTML (not just embedded PDF) for better mobile reading
- Add a "Last updated" date

### 16. Secret Page / Puzzle System Maintenance

**Current State:** Fully functional with three puzzles feeding into a password-protected page.

**Considerations:**
- The puzzles are clever and should be preserved as-is
- Could add new puzzles over time (Puzzle 4, 5, etc.) with new secret page content
- The 30-minute countdown is interesting but might frustrate some users — consider making it 60 minutes or removing the timer entirely
- The Rick Roll reveal is funny but could be replaced with something more meaningful (an unlockable avatar item, a bonus chip package, or a personal message)

---

## Design System Consistency

The website currently uses an organic mix of styles across pages. Establishing a basic design system would help as the site grows:

**Typography:**
- Headings: PressStart2P (already used for the game aesthetic)
- Body: Inter or system font stack
- Accent: JuliusSansOne (used sparingly for special elements)
- Standardize font sizes: H1 (2rem), H2 (1.5rem), H3 (1.25rem), Body (1rem), Small (0.875rem)

**Colors:**
- Primary: Gold (#FFD700) — used extensively already
- Secondary: Royal Blue (#4169E1) — buttons and accents
- Background: Near-black (#121212) — consistent across pages
- Surface: Dark gray (#1E1E1E) — cards, panels
- Text: White (#FFFFFF) primary, Light gray (#B0B0B0) secondary
- Success: Green (#0A5F38) — from the game table
- Error: Red (#FF4444)
- Warning: Orange (#FFA500)

**Spacing:**
- Use consistent padding/margin units (multiples of 8px: 8, 16, 24, 32, 48, 64)
- Standardize card/panel padding (24px on desktop, 16px on mobile)

**Components:**
- Buttons: Consistent style across portfolio and casino (rounded corners, gold border, hover glow)
- Cards: Used for projects, character selection, and game info — standardize the border, shadow, and padding
- Inputs: Contact form and auth form should use the same input styling

---

## Technical Debt

Items to clean up as the site evolves:

- **`new_home.js` vs `Home.js`:** There appear to be two home page implementations. Consolidate to one.
- **Mixed JS/TS:** Some components are `.js`, the game is `.ts`. Consider migrating the portfolio components to TypeScript for consistency.
- **CSS Organization:** A mix of `.css` and `.scss` files. Standardize on SCSS and consider a folder structure (`styles/pages/`, `styles/components/`, `styles/base/`).
- **Unused Dependencies:** Audit package.json for unused packages. React Three Fiber is imported — if it's only used minimally, consider whether the bundle size cost is worth it.
- **Environment Variables:** The socket URL is hardcoded in some places and uses `REACT_APP_SOCKET_URL` in others. Consolidate to use env vars everywhere.
