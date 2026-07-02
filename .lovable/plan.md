
## Kanban revamp + Matrix ↔ Kanban sync

### 1. Default board — auto-syncs with tasks
- The current single Kanban becomes the **"Default"** board.
- Its columns are fixed: **To Do**, **Overdue**, **Done** (rename current "In Progress" → "Overdue").
- Column placement is **derived from task state**, so completing anywhere (Matrix, List, etc.) instantly moves it to Done:
  - `status === "done"` → Done
  - `status === "open"` and `dueDate` before today → Overdue
  - otherwise → To Do
- Users cannot rename/add/remove columns on Default (or drag between them — status is the source of truth). Toggling status via drag between Todo/Done still works and calls `toggleStatus`.

### 2. Custom boards (up to 10)
- Add a **board switcher** at the top of the Kanban view (chips: Default • Board A • Board B • + New board).
- **"+ New board"** prompts for a name, then asks for **column names (1–6)**.
- Custom boards store tasks explicitly (a task must be assigned to a custom board — it doesn't auto-show).
- Columns are renamable / removable per custom board (still capped at 6). Boards can be renamed / deleted.
- Cap enforced at 10; "+ New board" disabled at cap.

### 3. Expand a column
- Every column shows an **expand icon** in its header, and clicking anywhere on the header title expands it.
- Expanded state = full-screen focus dialog showing that column's tasks large, with the same TaskCard interactions.

### 4. Bulk action bar → new "Add to Kanban" button
- After Reschedule / Add to sprint / Delete, add a **4th button "Add to Kanban"**.
- Clicking reveals a popover with:
  - **Add to new Kanban** (hidden if boards.length ≥ 10) — opens the new-board flow prefilled with the selected tasks going into the first column.
  - **Add to existing Kanban** — lists all custom boards; picking one prompts for which column, then assigns the selected tasks.

### 5. Data model (backend)
- New table `kanban_boards(id, user_id, name, sort_order, is_default, created_at)`.
- Extend `kanban_columns` with `board_id` (nullable — legacy rows migrated to a per-user Default board that's system-managed).
- New table `kanban_board_items(board_id, task_id, column_key, sort_order)` for custom-board placement (many-to-many so one task can appear on multiple custom boards).
- RLS + GRANTs added on new tables scoped to `auth.uid()`; realtime enabled so board changes propagate.

### 6. Realtime sync fix
- Ensure `tasks`, `kanban_boards`, `kanban_board_items`, `kanban_columns` are added to `supabase_realtime` and the client subscriptions invalidate the right queries. This fixes Matrix ↔ Kanban not syncing on complete.

### Technical notes
- Default board columns are computed client-side from `Task.status` + `dueDate` — no writes needed when moving between them, which is what fixes the sync bug.
- Legacy `Task.kanbanColumn` is deprecated for Default (ignored). For custom boards, membership lives in `kanban_board_items`.
- `useKanbanColumns` becomes `useKanbanBoards` returning `{ boards, columnsByBoard, itemsByBoard, addBoard, renameBoard, deleteBoard, addColumn, renameColumn, removeColumn, assignTasks(boardId, columnKey, taskIds) }`.
- `KanbanView` gains a `board` prop; if `board.isDefault` it renders derived columns and blocks structural edits; otherwise it renders stored columns and enables edit/DnD writes to `kanban_board_items`.

Confirm and I'll implement.
