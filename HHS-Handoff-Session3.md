# HHS Teams & Awards — Handoff (end of Session 3, partial)

Paste this plus `HHS-Teams-Awards-Handover.md` (design spec) into the new chat.
Do NOT re-upload the full `students.json` (huge, wastes context). Upload only the
source files you want changed (`app.js`, `render.js`, `index.html`, `search.js`, `data-service.js`).

## Working rules (from project preferences)
- Before generating: confirm/optimise token + session use, flag where code changes are needed,
  and estimate sessions for large tasks.
- Stack: Firebase/Firestore 10.12.2, vanilla ES modules, strict separation
  (pure logic / render / wiring). Doc id of `students/{adminNo}` is always `String(adminNo)`.

## Locked decisions
1. Awards live on the student record; two-stage workflow (admin recommends -> approver confirms/declines).
2. `awardsApprover` claim implies `admin` (approvers can also edit/recommend).
3. Same student may receive the same award level twice for one team (duplicates appended, counter incremented).
4. Every confirmation = one Firestore transaction (student + team + recommendation).
5. Denormalise `teamsSummary`, `teamMemberships`, `awards` onto the student doc.
6. Caches: in-memory + sessionStorage, 30-min TTL, per collection.
7. `confirmRecommendation()` returns post-transaction `{student, team}`; callers patch cache with that, not a local copy.

## DONE — files on disk in /mnt/user-data/outputs (may not persist; re-request if missing)
| File | Notes |
|---|---|
| `js/firebase-init.js` | Single SDK 10.12.2; exports all Firestore/Auth symbols awards code needs |
| `js/auth-service.js` | `onAuthChange`, `getAuthState`, `signInStaff`, `signOutStaff`, `refreshClaims`; state `{user,isAdmin,isApprover,ready}` |
| `js/awards-form.js` | Pure draft helpers (`AWARD_LEVELS`, `NOTE_MAX`, validate/build payload) |
| `js/awards-service.js` | `createRecommendation`, `listRecommendations`, `confirmRecommendation`, `rejectRecommendation`, `todayLocal` |
| `js/render-awards.js` | Pure render fns, all text escaped |
| `js/awards-app.js` | Page controller (written Session 3). Imports `getAllTeams`, `patchCachedStudent` from data-service (patch NOT yet applied) |
| `awards.html` | Written Session 3 |

## NOT DONE — in priority order
1. **`css/awards.css`** (reuse `:root` vars from `style.css`, no new palette). `awards.html` needs styles for:
   `.page-narrow, .panel, .panel-title, .panel-hint, .panel-row, .auth-form, .user-badge, .header-spacer,
   .form-grid, .match-list, .selected-student, .note-count, .tab-row, .tab(.is-active), .rec-list, .ok-text`,
   plus `textarea` styling and `.btn-on-dark`. Check `render-awards.js` for the card class names it emits
   (e.g. `.rec-issue-date`, `data-rec-id`, `data-action`). Note: `.staff-link` is used in `index.html`/`awards.html` but is not defined in `style.css` — define it.
2. **Team filter**
   - `search.js` `filterStudents`: add `if (state.team && !(s.teamsSummary || []).includes(state.team)) return false;`
   - `index.html`: add `<div><label for="filterTeam">Team</label><select id="filterTeam"><option value="">All teams</option></select></div>` in `.modal-grid`.
   - `app.js`: `els.team = $("filterTeam")`; add `team: els.team.value` to `state()`; `els.team.addEventListener("change", runSearch)`; clear it in `filterClearBtn` handler; in `init()` `populateSelect(els.team, collectTeamNames(roster), "All teams")`.
3. **`render.js` drawer patch** (spec given in chat): add `renderTeamsAndAwards(student)` (+ `esc()` helper, `AWARD_LABELS`) and call it after the subjects table in `renderDrawerView`.
4. **Pending patches from Session 1 (spec only, nothing on disk)**
   - `config.js`: add `TEAMS_COLLECTION: "teams"`, `AWARDS_RECOMMENDATIONS_COLLECTION: "awards-recommendations"`.
   - `data-service.js`: cache key -> `hhs_students_cache_v2`; stop injecting `id` in `fetchFromFirestore`; add `getAllTeams({forceRefresh})`, `collectTeamNames(students)`, `collectTeamsForStudent(teams, adminNo)` (cache key `hhs_teams_cache_v1`).
   - `app.js` (6 edits): import from `firebase-init.js`/`auth-service.js` (drop 12.2.1 imports); real auth via `signInStaff`/`signOutStaff`/`onAuthChange`; edit start strips stale `id` and stores `editOriginal`; save handler uses `buildUpdatedRecord` + `saveStudentEdits` with doc id `String(adminNo)`; subject edits include `grade/teacher/line/class/subject`; bulk update guarded by auth, doc id `String(adminNo)`, grade as Number.
5. **Firestore Security Rules**: public read `students`/`teams`; `admin`-only create on `awards-recommendations` with `status == "pending"`; `awardsApprover`-only update of recommendations (-> confirmed/rejected) and of `students.awards/teamMemberships/teamsSummary`, `teams.members`.
6. **Admin SDK script** to set `awardsApprover: true` (and `admin: true`, since approver implies admin) by email.
7. **Known outstanding bugs/hardening**
   - Add-student only updates local `roster` (no Firestore write).
   - Delete-student button has no handler (must also remove from `teams.members`).
   - Bulk update needs chunking at 400 writes + local rollback on failure.
   - `buildUpdatedRecord` doesn't refresh `registrationClass` on grade/class change.
   - `render.js` doesn't escape names/subjects (apostrophes e.g. `Na'im`, `Faneles'Bonge` can break the inline `onerror`).
   - `admin-import.html` has placeholder config and no auth: retire/remove from deploy.
8. End-to-end test once rules + claims exist.

## Open question to confirm
- Does an existing script already set the `admin` claim (to mirror), or must one be written?

## Suggested next-chat plan (~2 sessions)
- Session A: items 1-3 (small, UI) then item 4 patches written to disk.
- Session B: items 5-6, then item 7 fixes and E2E test.
