# Project communication and assets (shipped)

Shipped 2026-09-25. Admin/member hubs and the client portal share one project thread and one project file library. Visibility is two-tier (internal vs client), not per-person ACL.

See also: [PROJECT_HUB_BUILD_PLAN.md](./PROJECT_HUB_BUILD_PLAN.md), [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md), [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md).

---

## Storage

| Layer | What it holds |
|-------|----------------|
| **Cloudinary** | The file bytes |
| **MongoDB `ProjectAsset`** | Name, uploader, MIME, size, `clientVisible`, Cloudinary public ID + URL |

Upload path: Multer (memory, 75 MB cap) → `uploadBufferToCloudinary` → folder `{workspaceOwnerId}/projects/{projectId}/assets`.

Cloudinary `resource_type`:

- `image` — jpg, png, gif, webp, svg
- `video` — mp4, mov, webm
- `raw` — pdf, psd, ai, eps, fonts, Office, zip, csv, txt (forced by extension even when MIME is weak)

Allowlist is MIME **and** extension. Same Cloudinary account as portfolio and intake (`CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET`). Files are not stored on the Express disk.

---

## Visibility (messages and files)

- Team compose/upload starts **internal** (`clientVisible: false`).
- **Admin and assigned members** may toggle **Visible to client** at send **or anytime after**.
- **Client** posts and uploads are always client-visible and cannot be hidden.
- Clients only list `clientVisible: true`. Internal names never leak on portal list/GET.
- Access follows **project assignment** (team) or CRM **`clientId`** (client). 404 on probe.

Flipping a team message to visible uses the same Resend path as a new client-visible post (`notifyTeamMessageToClient`). Teammate posts also email the **workspace admin and assigned members** who opted in to **Team messages** (`notifyTeamMessageToTeam`); the author is never emailed. Completing a task emails opted-in teammates (`taskCompleted`) as well as portal users when the task is client-visible.

---

## Messages

`ProjectMessage` (Pattern B) includes optional `projectTaskId` + **`taskTitle` snapshot**, and optional **`replyToMessageId`** (immediate parent only).

| Method | Path | Who | Notes |
|--------|------|-----|--------|
| GET/POST | `/api/projects/:projectId/messages` | admin / assigned member | POST accepts `{ body, clientVisible?, projectTaskId?, replyToMessageId? }` |
| PATCH | `/api/projects/:projectId/messages/:messageId` | admin / assigned member | `{ clientVisible }` only |
| GET/POST | `/api/portal/projects/:projectId/messages` | client | GET visible only; POST always visible; may set `projectTaskId` (client-visible tasks) and `replyToMessageId` (visible parents) |

**Hub:** compose toggle is shown for members (no longer forced internal). Thread badges are clickable Internal / Visible to client. **Reply** quotes only the immediate previous message — never the full chain.

**From a task (team and client):** task-row message action scrolls to `#messages` with a project + task chip. Team default visibility follows the task’s `clientVisible`. Publishing an internal task name to the client confirms: “The client will see this task name.” Portal tasks are already client-visible, so no confirm. Clients see the snapshot chip only — they do not gain the internal task list. Team chips link to `#tasks`; portal chips are static.

---

## Files (`ProjectAsset`)

Pattern B, `userId` = workspace owner.

| Method | Path | Who | Notes |
|--------|------|-----|--------|
| GET/POST | `/api/projects/:projectId/assets` | admin / assigned member | POST multipart field `file`; uploads start internal |
| PATCH | `/api/projects/:projectId/assets/:assetId` | admin / assigned member | `{ clientVisible }` |
| DELETE | `/api/projects/:projectId/assets/:assetId` | admin any; uploader own | Destroys Cloudinary object then row |
| GET/POST | `/api/portal/projects/:projectId/assets` | client | Visible only; POST always `clientVisible: true` |
| DELETE | `/api/portal/projects/:projectId/assets/:assetId` | client, own uploads | |

**UI:** hub `#files` (`ProjectAssetsPanel` team variant) and portal project detail. Table: name, type, who, date, Internal/Client badge, open/download, delete. Images/PDF open in-browser; other types download.

**Jump nav:** sticky **Jump to** chips on the admin/member hub and portal project page (and portal home/list cards). Portal: Brief, Tasks, Files, Messages. Hub adds Team, Budget (admin), Time. Messages is the emphasized chip.

Out of this slice: per-file member ACL, versioning, folders, unread bell, PSD in-browser preview.

---

## Key files

| Layer | Path |
|-------|------|
| Hub | `client/src/pages/ProjectHub.tsx` |
| Jump nav | `client/src/components/projects/ProjectJumpNav.tsx` |
| Portal detail | `client/src/pages/portal/PortalProjectDetail.tsx` |
| Thread | `client/src/components/portal/ProjectMessageThread.tsx` |
| Hub messages | `client/src/components/projects/ProjectMessagesPanel.tsx` |
| Files table | `client/src/components/projects/ProjectAssetsPanel.tsx` |
| Task → message | `client/src/components/projectTasks/ProjectTaskList.tsx` |
| Models | `server/src/models/ProjectMessage.ts`, `ProjectAsset.ts` |
| Routes | `server/src/routes/projectMessages.ts`, `projectAssets.ts`, `portal.ts` |
| Team emails | `server/src/lib/email/notifications/teamMessageToTeam.ts`, `teamTaskCompleted.ts` |
| Upload | `server/src/lib/cloudinaryUpload.ts`, `projectAssetUpload.ts` |
