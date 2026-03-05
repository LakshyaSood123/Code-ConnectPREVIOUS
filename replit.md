# Reagvis Labs Pvt. Ltd.

## Overview

Reagvis Labs Pvt. Ltd. is a frontend-only web application for Document Verification. Users upload one PDF report and one evidence image as a single submission. Each document is verified independently with REAL/FAKE/MEDIUM verdicts determined from filename patterns. The app features an image lightbox with zoom, bounding box overlays, and output image toggle support. Results can be exported as JSON.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom build script for production
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks for local state
- **Styling**: Tailwind CSS with custom CSS variables for theming, shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions

### Component Structure
- `client/src/components/NavBar.tsx` - Simple header with brand logo and user label
- `client/src/components/ui/` - shadcn/ui primitives (buttons, cards, dialogs, etc.)
- `client/src/pages/Home.tsx` - Single page with all verification functionality (upload, analysis, results, lightbox, export)
- `client/src/styles/` - CSS tokens and UI utility classes

### Feature: PDF + Image Authenticity Verification
- Dual upload (PDF + Image) as a single submission
- Filename-based verdict determination (`_fake` => FAKE, `_real` => REAL, else MEDIUM)
- Image lightbox with zoom in/out
- Bounding box overlay support (triggered by `bbox` in filename)
- Imperfection localization circles overlay (triggered by `bbox` or `circles` in filename + `_fake` in filename)
  - Renders red SVG circles at relative 0..1 coordinates over the image
  - Circle format: `{cx, cy, r, label, severity}` with severity levels: low/medium/high
  - Hover tooltips show label text; stroke width and fill opacity vary by severity
  - Circles scale correctly with zoom (SVG positioned inside the zoom transform container)
  - Uses `var(--danger)` for border/stroke color only — no new hex colors
- Forgery localization polygon overlay (triggered by `_fake` in image filename, case-insensitive)
  - Renders 4 red dots connected by straight lines forming a closed quadrilateral
  - Uses normalized 0..1 coordinates stored as `ForgeryLocalization { points: {x, y}[] }`
  - Shown in both the lightbox (scales with zoom) and the thumbnail preview
  - Styling: polygon stroke = `var(--danger)`, dot fill = `var(--danger)`, subtle red fill
  - Real images (`_real` or no `_fake`): no overlay, localization = null
  - Included in JSON export as `image.localization.points` for fake images
- Output image toggle support (triggered by `outimg` in filename)
- JSON export of verification results (includes localization points for fake images)
- Overall decision: APPROVE/REJECT/MANUAL_REVIEW based on individual verdicts

### Theming System
- CSS custom properties defined in `tokens.css` for colors, gradients, shadows
- Dark theme enforced by default via `[data-theme="dark"]`

### Backend Architecture
- Express 5 server serves the built frontend in production
- Minimal server-side code - routes file is essentially empty
- In-memory storage class exists but unused (frontend-only demo)

### Data Layer
- Drizzle ORM configured with PostgreSQL dialect
- Schema defined in `shared/schema.ts` with `submissions` table
- Database not actively used - all demo data is client-side

### Build System
- Development: `tsx` runs TypeScript directly
- Production: Custom build script bundles server with esbuild, client with Vite
- Output: `dist/` folder with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### UI Component Libraries
- **shadcn/ui**: Full component library via Radix UI primitives
- **Lucide React**: Icon library
- **Framer Motion**: Animation library

### Database & ORM
- **Drizzle ORM**: Type-safe SQL query builder
- **drizzle-zod**: Schema validation integration

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across client/server/shared code

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Intelligent class merging
