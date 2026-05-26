# App Redesign Plan

A single-pass visual + interaction overhaul. No existing functionality is removed — task CRUD, project mapping, kanban/gantt, auth, persistence all remain. Changes are additive (new fields, new toggles) plus a thorough restyle.

## 1. Design tokens & typography

Rewrite `src/index.css` and `tailwind.config.ts` tokens:

- Font stack: system (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`) on `body`. Headings get `letter-spacing: -0.02em`; app title `-0.03em`.
- Light: bg `#FAFAFA`, card `#FFFFFF`, border `#E8E8ED`, text default near-black, muted `#888`.
- Dark: bg `#111111`, heading `#F0F0F0`, body `#C0C0C0`, muted `#888888`, separator `#1A1A1A`.
- New per-quadrant tokens (light + dark) with `accent`, `bg`, `text`, `badge-bg`. Replace the existing `--quadrant-N-*` vars; map old class names (`quadrant-1`, `quadrant-badge-1`, etc.) to the new tokens so existing components keep working.
- Radii: card 12px, input/button 8px.

## 2. Theme toggle (light/dark)

- New `src/hooks/useTheme.ts` — reads/writes `localStorage("theme")`, toggles `.dark` on `<html>`. Default light.
- Sun/Moon button added to `Header.tsx` top-right.

## 3. Settings additions

Extend `AppSettings` (`src/types/settings.ts`) + `useSettings`:

- `quadrantTintIntensity: number` (0–30, default 10).
- Apply at runtime by setting a CSS variable (e.g. `--quadrant-tint-alpha`) on `<html>` and rewriting quadrant `bg` to use `color-mix` / hsl with that alpha, OR by inline-styling quadrant containers.
- Settings panel gets a slider control (uses existing `Slider` component) and an inline username editor (writes to localStorage; updates header display).

## 4. Quadrant card interaction

`QuadrantColumn.tsx`:

- Click on header / empty body → toggle "expanded" local state showing the full task list (vs the current compact preview).
- The ↗ icon becomes "Focus mode": opens fullscreen view of that quadrant inside the main content area (new `QuadrantFocusView` component, or reuse `QuadrantExpandDialog` rendered inline full-bleed instead of as a dialog) with a back button.
- Pinned `TaskInput` at top with the quadrant's importance/urgency pre-set (already the case).
- Completed tasks hidden by default, shown under a collapsible "X completed" pill at the bottom. Checking a task triggers strikethrough + 40% opacity + 600ms delay before it moves to completed list.

## 5. Task row & detail popup

- `TaskCard` restyled: circular checkbox (stroke = quadrant accent), title, category + subcategory chips, deadline chip (amber if today, red+strikethrough if overdue), hover drag handle on right.
- New `TaskDetailDialog` component (modal, max-w 640, radius 16, backdrop blur) replaces the side panel as the default.
- Header of the popup has a "Sidebar view" toggle that persists per-user in localStorage; when on, clicks open the existing `TaskDetailPanel` sidebar instead.
- Popup contents: large editable title, rich-ish description (textarea with basic markdown buttons — bold/italic/bullets/checklists), date + time picker (default 22:00), category dropdown, project select (keep existing).
- Overdue tasks: red strikethrough deadline chip + two inline buttons "Reschedule" and "Move to Do First".

## 6. Categories & subcategories

Replace the flat category list with a tree.

- `src/types/category.ts`: `Category { id, name, emoji?, color, parentId: string|null, order: number }`.
- New `useCategories` hook persisted to Supabase (new `categories` table with RLS by `user_id`) and selected leaf id stored on task as `category` (string id) — keep field name to avoid breaking imports; migrate values lazily (treat unknown strings as legacy text labels, displayed as-is).
- New `CategoryDropdown` component: search, indented rows, checkboxes with tri-state, drag-to-reorder (dnd-kit), inline "Add subcategory…" and "Add new category…" creators with emoji + color palette (8 presets + hex).
- Task chips: parent (colored) + leaf (light grey), ellipsis for deep paths.
- Used in: task creation input, task popup, filter bar.

## 7. Sorting & filters

- New sort util in `src/lib/sort.ts` applied inside `MatrixView`/`QuadrantColumn` per the spec (overdue pinned → deadline asc → category order → subcategory order → no-date toggle, with manual drag override flag stored on task `manualOrder`).
- Filter bar component under the view switcher: Today, This week, category multi-select, Show overdue toggle (default ON), No-date Top/Bottom toggle. State lives in `Index.tsx`.

## 8. Mobile (<768px)

- Matrix view becomes a 2×2 compact tile grid: top accent, name, count badge, first 2 task titles.
- Tap → bottom drawer (95vh, slide-up) using existing `Drawer` component, containing pinned input + full list.
- View switcher becomes a bottom tab bar.
- Filter bar collapses into a "Filter" button that opens a bottom sheet.

## 9. Nav chrome

`Header.tsx` rebuilt: app name left (15px / 600 / -0.03em), segmented pill switcher centered, right cluster = avatar (initials), settings icon, theme toggle. Active pill = white bg + dark text, radius 8. "Edit with Lovable" badge hidden via `opacity: 0` if present.

## 10. Quadrant labels

Update placeholder/subtitle text in `QUADRANTS` (`src/types/task.ts`) to:
- Do First: "Crises, deadlines, and fires"
- Schedule: "Goals, growth, and planning"
- Delegate: "Interruptions and busy work"
- Eliminate: "Distractions and time wasters"

## Technical notes

- New files: `src/hooks/useTheme.ts`, `src/hooks/useCategories.ts`, `src/hooks/useTaskDetailPref.ts`, `src/components/ThemeToggle.tsx`, `src/components/TaskDetailDialog.tsx`, `src/components/CategoryDropdown.tsx`, `src/components/FilterBar.tsx`, `src/components/QuadrantFocusView.tsx`, `src/components/MobileMatrix.tsx`, `src/components/MobileQuadrantDrawer.tsx`, `src/lib/sort.ts`, `src/types/category.ts`.
- Edited: `src/index.css`, `tailwind.config.ts`, `src/types/settings.ts`, `src/types/task.ts`, `src/hooks/useSettings.ts`, `src/hooks/useTasks.ts` (add `manualOrder`, optional `dueTime`), `src/components/Header.tsx`, `src/components/MatrixView.tsx`, `src/components/QuadrantColumn.tsx`, `src/components/TaskCard.tsx`, `src/components/TaskInput.tsx`, `src/components/SettingsPanel.tsx`, `src/pages/Index.tsx`.
- One migration: `categories` table (id, user_id, name, emoji, color, parent_id, order, timestamps) with RLS by `user_id`; add `manual_order int` and optional `due_time text` to `tasks`.
- Existing `TaskDetailPanel` is preserved and reused when the user opts into sidebar view.
- All colors flow through CSS variables so the tint-intensity slider can adjust live without re-rendering components.

This is large — expect ~15 file edits + ~10 new files + 1 migration. I'll implement in one pass after you approve.
