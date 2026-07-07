# Projects as a recursive tree (subprojects replace categories)

Categories disappear as a first-class concept. `project_templates` becomes a self-referential tree of unlimited depth, and every task/note references a node in that tree.

## Data model

**Migration 1 — schema**

- Add `project_templates.parent_id UUID NULL REFERENCES project_templates(id) ON DELETE CASCADE`, indexed.
- Add `project_templates.sort_order INTEGER NOT NULL DEFAULT 0`.
- Add cycle-prevention trigger (a node cannot be its own ancestor).
- Add helper functions (SECURITY DEFINER, search_path=public):
  - `project_descendants(_root uuid) → SETOF uuid` — recursive CTE, used by RLS/filters.
  - `project_ancestors(_node uuid) → SETOF uuid`.
  - `project_root(_node uuid) → uuid`.
- Update `is_project_owner`, `can_edit_project`, `can_view_project_item` so a subproject inherits ownership/sharing from its root. Sharing stays attached to root projects only.

**Migration 2 — data backfill (runs after types regenerate but in the same approval turn)**

For every distinct `(project_id, category)` on `tasks` and `notes`:
1. If `project_id` is set → create a child project named after the category under it, reassign the row.
2. If `project_id` is null and category is not the literal `General` default → create a top-level project named after the category, reassign.
3. Leftover `category = 'General'` with no project → leave `project_id` null (unassigned).

Then drop `tasks.category` and `notes.category`.

**Task assignment**: tasks may live on any node (root or subproject). Views filter by node OR any descendant via `project_descendants`.

## Frontend types

- `ProjectTemplate` gains `parentId?: string | null` and `sortOrder: number`.
- Add derived helpers in `src/lib/projectTree.ts`:
  - `buildTree(projects)` → nested nodes with `children`, `depth`, `path` (array of names).
  - `getDescendantIds(tree, id)`, `getAncestors(tree, id)`, `getPathLabel(tree, id, sep=" / ")`.
- Remove `Task.category` and `Note.category`. Anywhere that displayed the category now shows the project breadcrumb (`Root / Sub / Leaf`, truncated with tooltip).

## Project picker (shared)

New `ProjectTreePicker` component (replaces every `category` picker and the existing flat project picker):

- Trigger renders `Root / Sub / Leaf` breadcrumb or "No project".
- Popover contains a `Command` with search across full paths. Results show indented tree with fold/unfold; "Create subproject here" affordance on hover of any node; "Create top-level project" at the bottom.
- Compact + full variants match current `SearchableSelect` / `SelectorWithCreate` sizing so it drops into `TaskInput`, `TaskDetailPanel`, `TaskDetailDialog`, `ProjectTemplatesDialog`, `NotesView`, and `QuickAddInput` flows.

## Filter UX

Breadcrumb-cascade in `FilterBar`:

```text
[Work ▾] › [Q4 ▾] › [Launch ▾] › [+]
```

- Each segment is a pill dropdown listing siblings of the current node, plus "All".
- Selecting a segment filters to that node + all descendants (`getDescendantIds`).
- "+" pill appears when the current node has children, letting the user drill deeper.
- Compact overflow: when path exceeds width, collapse middle segments into a `…` menu (mobile-friendly).

Recent-projects chip strip (from `RecentChipStrip`) continues to show most-recent leaf projects with breadcrumb tooltip.

## Views to update

Every view keeps working because the change is purely "category → project node":

- **MatrixView / QuadrantColumn / ListView / KanbanView / CalendarView**: task chips replace category badge with breadcrumb label (last 2 segments visible, full path on hover).
- **NotesView**: same treatment for notes; folder sidebar becomes the project tree.
- **ProjectBuilder / ProjectTemplatesDialog**: add "New subproject" action on each row; indent children; allow drag-to-reparent.
- **QuadrantExpandDialog / BulkActionBar**: "Add to category / project" becomes single "Move to project…" using `ProjectTreePicker`.
- **SettingsPanel**: remove the "Categories" management section; add "Projects" tree management (rename, reparent, delete cascade).

## MCP tools

- `create-task`, `update-task`, `list-tasks`, `create-note`, `list-notes`: replace `category` param with `project_id` and `project_path` (string like `Work/Q4/Launch`, auto-resolves or creates when explicitly requested).
- New tools: `create-subproject` (parent_id, name), `list-project-tree`.
- Keep `category` as a soft-deprecated alias that resolves to `project_path` for one release; log a deprecation notice in tool output.

## Rollout order

1. Migration 1 (schema + helper functions + cycle trigger).
2. Migration 2 (backfill + drop `category` columns).
3. Client refactor: types → `projectTree.ts` → `ProjectTreePicker` → replace every `category` prop site → `FilterBar` breadcrumb → view chips.
4. MCP tool updates + manifest rebuild.
5. Manual smoke via Playwright: create nested projects, assign task, filter by root vs leaf, verify Kanban/Calendar/Matrix render.

## Edge cases handled

- Cycle prevention: DB trigger + client guard in reparent.
- Deleting a project cascades to subprojects and clears `tasks.project_id` (via existing FK; will add `ON DELETE SET NULL` so tasks survive).
- Sharing: only root projects are shareable. `project_shared_items` at subproject-level are auto-expanded to include descendants server-side.
- Realtime: `project_templates` already in `supabase_realtime`; parent_id changes propagate.
- Recurring task templates keep their `project_id` reference.

## Non-goals (call out to user)

- No multi-parent (a project has exactly one parent).
- No cross-project task moves preserving history — moving just updates `project_id`.
- No per-subproject color yet; inherits root project color.
