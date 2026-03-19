# Reagvis Labs Pvt. Ltd.

## Overview

Reagvis Labs Pvt. Ltd. is a frontend-only web application for **Medical Claim Fraud Verification** (Ayushman Bharat / PM-JAY use case). Users upload four required medical documents — Aadhaar/identity, diagnostic report, diagnostic evidence image, and medical bill — as a single claim submission. The system runs deterministic frontend-only fraud analysis: each document is verified for authenticity, extracted fields are displayed, and all four documents are cross-correlated to detect fraud patterns such as fake documents, edited bills, procedure mismatches, identity mismatches, and provider inconsistencies.

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
- `client/src/components/NavBar.tsx` — Header with brand logo and user label
- `client/src/components/ui/` — shadcn/ui primitives
- `client/src/pages/Home.tsx` — Single-page medical claim fraud workflow (all sections, analysis, results, lightbox)
- `client/src/styles/` — CSS tokens (`tokens.css`) and UI utility classes (`ui.css`)

### Page Structure (top to bottom)

1. **NavBar** — sticky header with Reagvis Labs logo
2. **Hero section** — title "Medical Claim Fraud Verification", PM-JAY badge, subtitle
3. **KPI Tiles** (4 cards): Documents Uploaded · Fraud Flags · Correlation Mismatches · Manual Review
4. **Step progress bar**: Upload → Analyze → Correlate → Result (visual flow indicator)
5. **4 Stacked Document Upload Cards** (see below)
6. **CTA area**: Run Fraud Verification (primary) + Run Demo with Sample Data + Clear All
7. **Analysis loading state** — step-by-step progress display
8. **Result section** — Overall Verdict, Fraud Flags, Correlation, clean-pass banner
9. **ImageLightbox** — modal for diagnostic image with zoom, polygon overlay, imperfection circles

### Document Upload Cards (4 sections)

Each card is a `CompactUploadCard` with:
- Section index badge, icon, title, helper text
- Status pill: **Pending** / **Ready** / **Processed**
- Compact horizontal drag-and-drop upload strip
- After processing: extracted fields grid shown inline

| # | Title | Icon | Accept |
|---|-------|------|--------|
| 1 | Aadhaar / Patient Identity | CreditCard | PDF, JPG, PNG |
| 2 | Diagnostic Report | FileText | PDF |
| 3 | Diagnostic Evidence Image | Activity | JPG, PNG |
| 4 | Medical Bill / Claim Bill | Receipt | PDF, JPG, PNG |

### Smart Mock Logic (filename-based, deterministic)

**Procedure detection** (from filename):
- `xray` / `x-ray` → X-Ray
- `mri` → MRI Scan
- `ct` → CT Scan
- `lab` / `path` / `blood` → Lab Test
- `echo` → Echocardiogram
- `ultrasound` / `usg` → Ultrasound
- else → Medical Examination

**Patient name** (from Aadhaar filename):
- `sharma` → Rajesh Sharma, `kumar` → Priya Kumar, `verma` → Amit Verma, `singh` → Gurpreet Singh, `rao` → Suresh Rao, else → Rohit Mehta

**Hospital** (from report/bill filename):
- `aiims` → AIIMS Delhi, `apollo` → Apollo Hospitals, `fortis` → Fortis Healthcare, `max` → Max Super Speciality, `medanta` → Medanta, else → City Medical Center

**Fraud flag rules**:
- `_fake` in Aadhaar → Fake Patient Suspected (high)
- `_fake` in report → Fake Report Suspected (high)
- `_fake` in image → Fake Diagnostic Image (high)
- `_fake` in bill → Fake Bill Suspected (high)
- `edited` / `revised` / `final2` / `scan_copy` / `invoice_new` in bill → Edited Bill Detected (high)
- `inflated` in bill → Inflated Billing Risk (medium)
- Report procedure ≠ bill procedure → Procedure Mismatch (high)
- Patient name on Aadhaar ≠ patient name on bill → Identity Mismatch (medium)
- Image procedure ≠ report procedure → Diagnostic Image Mismatch (medium)
- Report hospital ≠ bill hospital → Provider Mismatch (medium)
- Bill date ≠ standard date → Date Inconsistency (low)

**Risk score calculation**:
- Base: 8
- +25 fake Aadhaar, +22 fake report, +20 fake image, +20 fake bill
- +18 edited bill, +15 procedure mismatch, +10 identity mismatch
- +8 image mismatch, +6 provider mismatch, +4 date inconsistency
- Capped at 98

**Overall verdict**:
- Risk ≥ 60 → High Fraud Risk (REJECT)
- Risk 28–59 → Needs Manual Review (MANUAL_REVIEW)
- Risk < 28 → Verified Safe (APPROVE)

### Demo Mode
"Run Demo with Sample Data" auto-populates all 4 slots with filenames that trigger a rich fraud scenario:
- `aadhaar_patient_rohit.pdf` — clean Aadhaar
- `xray_chest_report_real.pdf` — X-Ray report
- `mri_evidence_fake.jpg` — MRI image (FAKE, procedure mismatch + forgery polygon)
- `bill_mri_scan_edited.pdf` — Bill (Edited Bill + Procedure Mismatch with X-Ray report)

**Demo fraud scenario**: Report says X-Ray, bill says MRI → Procedure Mismatch; image is `_fake` → forgery polygon overlay; bill is `edited` → Edited Bill flag.

**Demo safe scenario**: Name all 4 files with `_real` suffix, aligned procedure keywords, same hospital → 0 flags, Verified Safe.

### Result Section Components

- **OverallVerdictCard**: verdict label, risk score (0–100), animated progress bar, color-coded (green/orange/red)
- **FraudFlagsSection**: pill/chip badges per flag with severity colors (red=high, orange=medium, blue=low) and icons
- **CorrelationSection**: 5 cross-document checks as rows — Patient Name, Procedure, Hospital, Date, Diagnostic Image; each row shows compared values and status (Matched/Mismatch/Review) with color-coded background
- **Clean-pass banner**: shown only when no fraud flags detected

### Image Analysis Features (for Diagnostic Evidence Image)
- Thumbnail preview in upload card with polygon overlay for fake images
- Click thumbnail → opens `ImageLightbox` modal
- Lightbox features: zoom in/out, original/model-output toggle, bounding box overlay, imperfection circles with hover tooltips, forgery localization polygon
- **Hover-to-show callout**: polygon and dots are interactive; hovering reveals an "AI discrepancy found" callout card with 100ms delayed hide, smooth opacity/scale transitions
- Forgery polygon triggered by `_fake` in image filename (normalized 0..1 coordinates)
- Imperfection circles triggered by `bbox`/`circles` + `_fake` in filename
- Bounding boxes triggered by `bbox` in filename

### Theming System
- CSS custom properties defined in `tokens.css` for colors, gradients, shadows
- Light theme enforced (dark theme exists but not active by default)
- `document.documentElement.removeAttribute('data-theme')` called on mount

### Backend Architecture
- Express 5 server serves built frontend in production
- Minimal server-side code — all demo logic is client-side

### Data Layer
- Drizzle ORM configured with PostgreSQL dialect
- Schema defined in `shared/schema.ts`
- Database not actively used in this demo

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
