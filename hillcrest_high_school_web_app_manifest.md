# Hillcrest High School — Web Application Architecture & State Manifest

## Executive Overview & Tech Stack
- **Project Name:** Hillcrest High School Student Portal & Awards Management System
- **Frontend Stack:** Standard Vanilla JavaScript (ES Modules), HTML5, CSS3.
- **Backend Stack:** Firebase Platform (Firebase Authentication, Firestore, Hosted Config).
- **Core Design Pattern:** Client-side caching (SessionStorage), modular service layers (pure state / service helpers / DOM renderers), and single-file CSS variable inheritance.
- **Data Model Core Collections:** `students`, `teams`, `timetables`, `awards-recommendations`.

---

## File Inventory & Technical Descriptions

### 1. `css/style.css`
- **Purpose:** Central stylesheet providing theme definitions (`:root` CSS custom properties for palette, typography, radii, shadows) and base reset/typography rules. Used across the entire site.

### 2. `css/awards.css`
- **Purpose:** Page-specific CSS for `awards.html`.
- **Key Mechanics:** Imports/inherits variables from `style.css`. Style definitions for authentication panels, search match rows, selected student chips, tab navigation, recommendation cards, status badges (`.status-pending`, `.status-confirmed`, `.status-rejected`), and responsive grid layouts.

### 3. `js/firebase-init.js`
- **Purpose:** Centralized Firebase SDK initialization module.
- **Key Mechanics:** Imports Firebase App, Firestore, and Auth functions (v10.12.2) from official Google CDN URLs and exports initialized `db` and `auth` instances. Ensures no conflicting SDK versions across modules.

### 4. `js/auth-service.js`
- **Purpose:** Authorization & authentication wrapper around Firebase Auth.
- **Key Mechanics:** Resolves custom user claims (`admin`, `awardsApprover`). Manages application auth state listeners via `onAuthChange()`. Provides sign-in/sign-out helpers and dynamic token refresh via `refreshClaims()`. Standard authenticated users default to read-only access.

### 5. `js/data-service.js`
- **Purpose:** Roster and team data loader and client-side cache layer.
- **Key Mechanics:** Fetches student and team rosters from Firestore and caches them in `sessionStorage` with TTL checks (`CACHE_TTL_MS`) to minimize Firestore reads. Maps document IDs (`teamId: d.id`) and exposes utility functions like `getAllStudents()`, `getAllTeams()`, `patchCachedStudent()`, `collectTeamNames()`, `collectSubjects()`, `collectClasses()`, and `collectTeachers()`.

### 6. `js/awards-form.js`
- **Purpose:** Pure draft state management and validation logic for award recommendations (DOM and network-agnostic).
- **Key Mechanics:** Defines award levels (`Merit`, `Half Colours`, `Full Colours`), note length limits (`NOTE_MAX = 300`), draft updates (`applyDraftChange`), validation checks (`validateRecommendation`), and payload serialization (`buildRecommendationPayload`).

### 7. `js/awards-service.js`
- **Purpose:** Data access layer for award submission and transaction processing.
- **Key Mechanics:** 
  - `createRecommendation()`: Submits recommendation payloads to `awards-recommendations` collection as `pending`.
  - `listRecommendations()`: Fetches recommendations filtered by status (`pending`, `confirmed`, `rejected`, `all`) and sorts client-side by timestamp.
  - `confirmRecommendation()`: Executes an atomic Firestore transaction (`runTransaction`) updating student awards history, student `teamMemberships`, team `members`, and setting recommendation status to `confirmed`.
  - `rejectRecommendation()`: Rejects a recommendation with a required reason string.

### 8. `js/render-awards.js`
- **Purpose:** String-building template module for `awards.html` components.
- **Key Mechanics:** Pure functions for escaping HTML (`escapeHtml`), rendering student search match lists (`renderStudentMatches`), rendering selected chips (`renderSelectedStudent`), generating option dropdowns (`renderTeamOptions`, `renderLevelOptions`), and building recommendation cards with contextual review controls (`renderRecommendationList`, `renderRecommendationCard`).

### 9. `js/awards-app.js`
- **Purpose:** Main controller for `awards.html`.
- **Key Mechanics:** Connects DOM events to services. Listens to `onAuthChange()` to gate tools, handles debounced student searches, validates/submits forms, toggles tab filters, and executes approval/rejection actions using `confirmRecommendation()` and `rejectRecommendation()`.

### 10. `awards.html`
- **Purpose:** Web page layout for the Awards capturing and review workflow.
- **Key Mechanics:** Features standard Hillcrest High School branding header, authentication gate section (`#authGate`), award submission form (`#recommendForm`), search autocomplete picker, and tabbed recommendation review list (`#recList`).

### 11. `firestore.rules`
- **Purpose:** Security rules enforcement for Google Cloud Firestore.
- **Key Mechanics:** 
  - Restricts student, team, and timetable writes to authenticated `@hhs.co.za` staff or admins (`isStaff()`).
  - Grants read access to `awards-recommendations` and creation rights to staff.
  - Restricts recommendation updates (`confirm`/`reject`) exclusively to users with `awardsApprover == true` or `admin == true` claims.

---

## Reconstruction Guidance for AI Assistant Session Restarts
1. Read `PROJECT_MANIFEST.md` to understand context and existing file paths.
2. Maintain strict separation of concerns:
   - Data & Async logic $\rightarrow$ `*-service.js`
   - Pure string rendering & HTML escaping $\rightarrow$ `render-*.js`
   - Form state & validation helpers $\rightarrow$ `*-form.js`
   - Page wiring & DOM handlers $\rightarrow$ `*-app.js`
3. Always maintain `teamId: d.id` document mapping in `data-service.js` fetches.
4. Ensure all user-generated content rendered in HTML string templates passes through `escapeHtml()`.