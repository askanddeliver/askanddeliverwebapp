# Project communication and assets (shipped)

Shipped 2026-09-25. Admin/member hubs and the client portal share one project thread and one project file library. Visibility is two-tier (internal vs client), not per-person ACL. Google Docs (2026-10-19) are a separate tray: the file lives in the business Shared Drive, and access is per person.

See also: [PROJECT_HUB_BUILD_PLAN.md](./PROJECT_HUB_BUILD_PLAN.md), [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md), [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md), [ONBOARDING_UX_EXPANSIONS_BUILD_PLAN.md](./ONBOARDING_UX_EXPANSIONS_BUILD_PLAN.md) (unread, pins, task requests shipped; message Notify None/@/Team shipped after).

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

Flipping a team message to visible uses the same Resend path as a new client-visible post (`notifyTeamMessageToClient`). Teammate posts email only according to the compose **Notify** control (None / @ / Team) and the recipient’s **All messages**, **Team messages**, or **@ mentions** prefs — not a blanket roster blast. Completing a task emails opted-in teammates (`taskCompleted`) as well as portal users when the task is client-visible.

---

## Messages

`ProjectMessage` (Pattern B) includes optional `projectTaskId` + **`taskTitle` snapshot**, optional **`replyToMessageId`** (immediate parent only), and **`notifyMode`** (`none` \| `mentions` \| `team`) with optional `mentionedAuth0Ids` / `mentionedNames`. Notify does not change who can read the thread.

| Method | Path | Who | Notes |
|--------|------|-----|--------|
| GET/POST | `/api/projects/:projectId/messages` | admin / assigned member | POST accepts `{ body, clientVisible?, projectTaskId?, replyToMessageId?, notifyMode?, mentionedAuth0Ids? }` |
| POST | `/api/projects/:projectId/messages/read` | admin / assigned member | Set unread cursor |
| PATCH | `/api/projects/:projectId/messages/:messageId` | admin / assigned member | `{ clientVisible }` only |
| GET/POST | `/api/portal/projects/:projectId/messages` | client | GET visible only; POST always visible; may set `projectTaskId` (client-visible tasks) and `replyToMessageId` (visible parents) |
| POST | `/api/portal/projects/:projectId/messages/read` | client | Set unread cursor |

**Hub:** compose toggle is shown for members (no longer forced internal). **Notify** is None (default, thread only), **@** (picked people; task compose pre-fills assignee), or **Team** (admin + assigned). Email follows recipient prefs **All messages**, **Team messages**, and **@ mentions** (legacy `teamMessages: true` with unset `allMessages` still counts as All). Thread badges are clickable Internal / Visible to client. **Reply** quotes only the immediate previous message — never the full chain. Portal GET omits notify/mention fields. Portal compose has no Notify picker.

**Unread (in-app, not email):** `User.projectMessageReads` per project. No cursor → count 0. Mark-read when the messages section is on screen. See onboarding slice A.

**Projects list:** open-task rows under each project start **collapsed**; the “N open tasks” label expands them. Unread badges on the title still deep-link to `#messages`.

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

**Jump nav:** sticky **Jump to** chips on the admin/member hub and portal project page (and portal home/list cards). Portal: Brief, Tasks, Requests, Files, Documents, Messages. Hub adds Team, Budget (admin), Requests (above Tasks), Time. Messages is the emphasized chip.

Out of this slice: per-file member ACL, versioning, folders, in-app notification bell, extra chat rooms, PSD in-browser preview.

---

## Documents (Google Docs)

Shipped 2026-10-19. Separate from Cloudinary files. The bytes stay in a Workspace Shared Drive. The app stores the folder id, the doc id, and who was granted access. Doc body is not copied into MongoDB.

**Setup (omit to disable the tray):**

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_SHARED_DRIVE_ID`

The service account uses the Drive scope and must be a **Content manager** on that Shared Drive. Google returns "File not found" when it is not a member. All Drive calls run on the server. The folder is created the first time someone creates a doc, not when the project is created.

**Who can edit:** workspace admins, assigned creators, the CRM client email, and portal users linked to that client. Role is `writer`. Share the **folder** once (`ProjectFolderGrant`); new docs inherit it. `sendNotificationEmail` is false. A rejected email is stored as `failed` with Google's message. Admins see granted / pending / failed and can **Retry failed** (re-runs the sync). Clients and members do not see that list.

**Completed or archived:** delete client and member grants. Admins stay. Active or Paused again re-grants the current people. Paused alone does not change access. Drive errors do not fail the project save.

| Method | Path | Who | Notes |
|--------|------|-----|--------|
| GET | `/api/projects/:projectId/documents` | admin / assigned member | `{ configured, documents, grants? }`. Grants only for admin |
| POST | `/api/projects/:projectId/documents` | admin / assigned member | `{ title }`. Ensures folder, creates a Google Doc, syncs grants. Admins may create on a closed project; members may not |
| POST | `/api/projects/:projectId/documents/access/retry` | admin | Re-sync folder grants |
| GET/POST | `/api/portal/projects/:projectId/documents` | client | Same list/create. No grants. Create only while Active or Paused |

**UI:** hub and portal `#documents` (`ProjectDocumentsPanel`). Table: title, created by, created date. Create asks for a title and opens the doc. Modal iframe uses `/preview`, Edit switches to `/edit`, and **Open in Google Docs** is always available because Google often refuses to frame the editor. A rename inside Google is not written back. Sheets and Slides are not created; `mimeType` is stored so they can be added later.

---

## Task requests (`ProjectTaskSuggestion`)

Clients do **not** write `ProjectTask` rows. They submit a request on the portal (`#requests`). Admin approves (creates a `TODO` task, default `clientVisible: true`) or declines. Members see the hub queue read-only. Cap: 10 `PENDING` per project.

Requests are not messages. They become tasks only after approve (`createdTaskId`). Decline is silent (no email). `GET /api/project-tasks` is `requireMemberOrAdmin` — client JWTs get 403.

| Method | Path | Who | Notes |
|--------|------|-----|--------|
| GET/POST | `/api/portal/projects/:projectId/task-suggestions` | client | Pattern C; POST `{ title, description? }` |
| GET | `/api/projects/:projectId/task-suggestions` | admin / assigned member | Full queue |
| POST | `/api/projects/:projectId/task-suggestions/:id/approve` | admin | Creates task; emails submitter if opted in |
| POST | `/api/projects/:projectId/task-suggestions/:id/decline` | admin | `DECLINED`; no email |

Email: team `taskSuggestions` on submit; submitter `taskSuggestionApproved` on approve. CRM `Client.email` is unused.

---

## Key files

| Layer | Path |
|-------|------|
| Hub | `client/src/pages/ProjectHub.tsx` |
| Jump nav | `client/src/components/projects/ProjectJumpNav.tsx` |
| Portal detail | `client/src/pages/portal/PortalProjectDetail.tsx` |
| Thread | `client/src/components/portal/ProjectMessageThread.tsx` |
| Hub messages | `client/src/components/projects/ProjectMessagesPanel.tsx` |
| Notify picker | `client/src/components/projects/MessageNotifyPicker.tsx` |
| Unread badge | `client/src/components/projects/UnreadCountBadge.tsx` |
| Files table | `client/src/components/projects/ProjectAssetsPanel.tsx` |
| Documents tray | `client/src/components/projects/ProjectDocumentsPanel.tsx` |
| Task → message | `client/src/components/projectTasks/ProjectTaskList.tsx` |
| Models | `server/src/models/ProjectMessage.ts`, `ProjectAsset.ts`, `ProjectDocument.ts`, `ProjectFolderGrant.ts`, `ProjectTaskSuggestion.ts` |
| Routes | `server/src/routes/projectMessages.ts`, `projectAssets.ts`, `projectDocuments.ts`, `projectTaskSuggestions.ts`, `portal.ts` |
| Drive client | `server/src/lib/googleDrive.ts`, `projectDocumentAccess.ts` |
| Team emails | `server/src/lib/email/notifications/teamMessageToTeam.ts`, `teamTaskCompleted.ts`, `taskSuggestionToTeam.ts` |
| Hub requests | `client/src/components/projects/ProjectTaskSuggestionsPanel.tsx` |
| Portal requests | `client/src/components/portal/PortalTaskRequestSection.tsx` |
| Upload | `server/src/lib/cloudinaryUpload.ts`, `projectAssetUpload.ts` |
