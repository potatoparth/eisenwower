## Project Collaboration with Realtime Sync

Add the ability to invite others to a project via a shareable link, pick which items they see, give them Editor or Viewer rights, and keep everything live-synced. The owner can revoke access at any time.

### 1. Roles & sharing model

- Two roles per collaborator: **Editor** (add/edit/delete tasks & notes) or **Viewer** (read-only).
- Two share scopes per collaborator:
  - **All items** — every current & future task and note in the project.
  - **Selected items** — owner picks specific tasks/notes from a bulk picker.
- Only the project owner (creator) can invite, change scope/role, or revoke.

### 2. Invite flow (link-based)

- On a project, a new **Share** button opens a dialog:
  - "Generate invite link" — pick role (Editor/Viewer) and scope (All / Selected items with checkbox picker for tasks + notes).
  - Produces a URL: `/join/:token`. Copy-to-clipboard.
  - Links can be revoked, and expire after 7 days by default (configurable later).
- Recipient opens the link while logged in → sees project name + inviter + role → clicks **Join**. If logged out, they're sent to auth first and returned.
- Same dialog lists current collaborators with their role/scope and a **Revoke** button (owner only).

### 3. Data access & live sync

- Collaborators see the shared project inside their normal Projects view alongside their own.
- All task/note CRUD respects role: Editors can mutate, Viewers cannot (UI hides controls + DB enforces).
- Changes propagate within ~1 second via Realtime subscriptions on tasks, notes, collaborators, and shared-items — both users see edits, additions, deletions, and revocations live.
- Revoking access removes the project from the collaborator's view immediately.

### 4. Technical section

**New tables**
- `project_collaborators(id, project_id, user_id, role, scope, invited_by, created_at)` — `role ∈ {editor,viewer}`, `scope ∈ {all,selected}`. Unique on `(project_id, user_id)`.
- `project_shared_items(id, project_id, collaborator_user_id, item_type, item_id, created_at)` — `item_type ∈ {task,note}`. Only used when scope='selected'.
- `project_invites(id, token, project_id, role, scope, item_ids jsonb, created_by, expires_at, revoked_at, accepted_by, accepted_at)`.

**Security-definer helpers** (avoid recursive RLS)
- `is_project_owner(uid, project_id) → boolean`
- `is_project_collaborator(uid, project_id) → boolean`
- `project_role(uid, project_id) → text` (`owner|editor|viewer|null`)
- `can_see_item(uid, project_id, item_type, item_id) → boolean` (owner OR scope='all' OR row in `project_shared_items`).

**RLS updates**
- `project_templates`: SELECT allowed if owner or collaborator; UPDATE/DELETE owner-only.
- `project_tasks` & `notes`: SELECT/UPDATE/DELETE allowed if the row is visible via `can_see_item` and the caller has editor+ rights for writes. INSERT allowed for owner and editors with scope='all' (selected-scope editors can insert; new rows are auto-shared by trigger).
- `project_collaborators` & `project_shared_items`: owner can manage all; collaborator can read their own row.
- `project_invites`: owner manages; token lookup handled by a security-definer RPC (`accept_invite(token)`) so pending invites aren't publicly listable.

**Realtime**
- `ALTER PUBLICATION supabase_realtime ADD TABLE` for `project_tasks`, `notes`, `project_collaborators`, `project_shared_items`, `project_templates`.
- Client subscribes inside a `useEffect` in the project data hook and refetches on change events. Cleanup on unmount.

**Frontend**
- New `ShareProjectDialog` (invite link generator + item picker + collaborator list + revoke).
- New `/join/:token` route → calls `accept_invite` RPC → routes to project.
- Data hooks (`useProjects`, `useTasks`, `useNotes`) fetch owned + shared rows, add realtime subscription, and expose per-project role so UI can disable write actions for Viewers.
- Delete/edit controls on tasks & notes gated by role.

### 5. Out of scope for this pass

- Email notifications on invite/revoke.
- Per-item role overrides (all collaborator items inherit the collaborator's role).
- Presence indicators / cursors.
- Transferring ownership.