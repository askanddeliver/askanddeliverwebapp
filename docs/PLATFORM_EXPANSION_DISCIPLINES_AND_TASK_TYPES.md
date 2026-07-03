# Platform Expansion — Disciplines & Task Types

**Status:** Planning (July 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**See also:** [PLATFORM_EXPANSION_ARCHITECTURE.md](./PLATFORM_EXPANSION_ARCHITECTURE.md)

Disciplines and Task Types **overlap** but serve different layers. **Tasks nest under (or derive from) disciplines** for internal ops; **intake stays generalized** at the discipline level with admin-curated options per form.

---

## Three-layer model

```
┌─────────────────────────────────────────────────────────────┐
│  INTAKE (client-facing, generalized)                         │
│  Admin picks which disciplines appear on each intake field   │
│  e.g. Design · Development · Strategy · Research             │
└──────────────────────────────┬──────────────────────────────┘
                               │ discipline ids
┌──────────────────────────────▼──────────────────────────────┐
│  DISCIPLINE (tenant taxonomy — SiteConfig)                   │
│  What work involves · what members practice · project tags   │
│  └── tasks[] nested (derived from / linked to TaskTypes)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ taskTypeId
┌──────────────────────────────▼──────────────────────────────┐
│  TASK TYPE (existing — billing & time tracking)              │
│  Rate · color · timer · invoice rollups                      │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Question it answers | Audience |
|-------|---------------------|----------|
| **Intake options** | "What kind of help do you need?" | Prospective client |
| **Discipline** | "What domain is this work?" | Admin, members, projects |
| **Discipline task** | "What specific billable activity?" | Timer, invoices, assignment |
| **Task Type** | "What rate applies?" | Billing engine |

**Key rule:** Clients on intake select **disciplines only** — not granular tasks. Testing, for example, is a task under **Development**; clients pick Development, staff track time as Development or Testing.

---

## Schema

### Discipline (SiteConfig)

```typescript
interface DisciplineDefinition {
  id: string;                    // stable slug, e.g. 'development'
  name: string;                  // display label, e.g. 'Development'
  description?: string;          // optional helper for intake labels
  assignableToMember: boolean;   // member profile: can declare this discipline
  showOnProject: boolean;        // project discipline picker
  sortOrder: number;
  tasks: DisciplineTask[];       // nested — derived from / linked to TaskTypes
}

interface DisciplineTask {
  id: string;                    // slug within discipline, e.g. 'testing'
  name: string;                  // e.g. 'Testing'
  taskTypeId: string;            // → TaskType._id (required for billing link)
  assignableToMember: boolean;   // member can declare this specific task skill
  sortOrder: number;
}
```

### Task Type (unchanged)

Existing `TaskType` model — rates, colors, invoice rollups. Some Task Types are **billing-only** (e.g. Fixed Rate Design) and nest under a discipline without being intake-visible or standalone disciplines.

### Intake field — discipline picker (IntakeForm)

New field type for the admin builder — options are **curated per form**, not auto-all disciplines:

```typescript
interface IntakeField {
  // ...existing
  type: 'disciplines_needed' | ...;

  // When type === 'disciplines_needed'
  disciplineOptionIds?: string[];   // admin-selected subset of SiteConfig.disciplines[].id
  // Resolved at publish/render: labels from discipline.name; values = discipline.id
}
```

**Admin intake builder UX:**

1. Add field → type **"Disciplines needed"**
2. Panel shows **available disciplines** from Site Config taxonomy (checkbox list)
3. Admin checks which disciplines appear on **this** intake form (e.g. Design, Development, Strategy, Research — not Testing, Admin, Meeting)
4. Optional: reorder how they appear to the client
5. Publish embeds `disciplineOptionIds` in the published form snapshot

Static `multi_select` with hand-typed options remains available for non-discipline fields (budget, timeline, project type).

---

## Ask And Deliver — Tenant #1 seed

### Discipline → nested tasks (from production Task Types)

| Discipline | Intake default? | Nested tasks (→ TaskType) | Notes |
|------------|:---------------:|---------------------------|-------|
| **Design** | ✓ | Design, Fixed Rate Design | Fixed Rate Design is billing-only task under Design |
| **Development** | ✓ | Development, **Testing** | Testing rolls up under Development for clients |
| **Support** | ✓ | Support | Standalone discipline — onboarding, field work, experiential install/servicing, ongoing client support |
| **Strategy** | ✓ | Strategy | |
| **Research** | ✓ | Research | |
| **Admin** | ✗ | Admin | Operational; internal assignment only |
| **Meeting** | ✗ | Meeting | Operational; time tracking, not intake |

**Default intake discipline picker (admin pre-selects on seed form):**  
Design · Development · Strategy · Research · **Support**

Not on intake by default: Admin, Meeting, Testing (nested under Development only).

### Seed structure (abbreviated)

```json
{
  "disciplines": [
    {
      "id": "design",
      "name": "Design",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 0,
      "tasks": [
        { "id": "design", "name": "Design", "taskTypeId": "<Design>", "assignableToMember": true, "sortOrder": 0 },
        { "id": "fixed-rate-design", "name": "Fixed Rate Design", "taskTypeId": "<Fixed Rate Design>", "assignableToMember": false, "sortOrder": 1 }
      ]
    },
    {
      "id": "development",
      "name": "Development",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 1,
      "tasks": [
        { "id": "development", "name": "Development", "taskTypeId": "<Development>", "assignableToMember": true, "sortOrder": 0 },
        { "id": "testing", "name": "Testing", "taskTypeId": "<Testing>", "assignableToMember": true, "sortOrder": 1 }
      ]
    },
    {
      "id": "support",
      "name": "Support",
      "description": "Onboarding, field work, experiential asset installation, servicing, ongoing client support",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 2,
      "tasks": [{ "id": "support", "name": "Support", "taskTypeId": "<Support>", "assignableToMember": true, "sortOrder": 0 }]
    },
    {
      "id": "strategy",
      "name": "Strategy",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 3,
      "tasks": [{ "id": "strategy", "name": "Strategy", "taskTypeId": "<Strategy>", "assignableToMember": true, "sortOrder": 0 }]
    },
    {
      "id": "research",
      "name": "Research",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 4,
      "tasks": [{ "id": "research", "name": "Research", "taskTypeId": "<Research>", "assignableToMember": true, "sortOrder": 0 }]
    },
    {
      "id": "admin",
      "name": "Admin",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 5,
      "tasks": [{ "id": "admin", "name": "Admin", "taskTypeId": "<Admin>", "assignableToMember": true, "sortOrder": 0 }]
    },
    {
      "id": "meeting",
      "name": "Meeting",
      "assignableToMember": true,
      "showOnProject": true,
      "sortOrder": 6,
      "tasks": [{ "id": "meeting", "name": "Meeting", "taskTypeId": "<Meeting>", "assignableToMember": false, "sortOrder": 0 }]
    }
  ]
}
```

Migration script: match `taskTypeId` by TaskType name within workspace.

### Support as its own discipline (locked)

**Support** is a first-class intake discipline — not nested under Development. Client-facing scope includes:

- Client onboarding and handoff
- Field work and on-site activities
- Experiential design asset installation or servicing
- Ongoing retainer-style web/systems support (e.g. existing client support retainers)

**Development** remains for build, engineering, and QA (Testing nested internally). A lead may select **both** Development and Support when a project spans build plus install, onboarding, or field servicing.

---

## Where each layer appears

| Surface | Discipline | Discipline task | Task Type |
|---------|:----------:|:---------------:|:---------:|
| **Intake** (client) | ✓ (admin-selected subset) | ✗ | ✗ |
| **Project** | ✓ (`Project.disciplines[]`) | optional future | — |
| **Member profile** | ✓ + optional task-level skills | ✓ (`assignableToMember`) | via task link |
| **Timer / time entry** | — | — | ✓ (picker as today) |
| **Invoice rollups** | — | — | ✓ |
| **Lead → staffing match** | ✓ (intake response) | optional v2 | — |

---

## Member profile (assignable at two levels)

Members declare skills at **discipline** and/or **task** level:

```typescript
// User (member)
disciplines?: string[];           // discipline ids, e.g. ['development', 'design']
disciplineTasks?: string[];       // composite keys: 'development:testing', 'design:design'
```

UI suggestion:
- Primary: pick disciplines (Design, Development, …)
- Expand discipline → optionally check specific tasks (Development → Testing; Support → Support)

Intake only sees the parent discipline — admin staffing maps lead's `development` to members with `development:testing` etc.

---

## Operational vs. core

**Core disciplines** (Design, Development, Strategy, Research, **Support**)  
- Client-facing on intake (when admin includes them)  
- Primary project classification  
- Contain nested billable tasks (Support typically has one task; Development nests Testing)  

**Operational disciplines** (Admin, Meeting)  
- Internal time and project tagging  
- Available in taxonomy for member/project use  
- Typically **excluded** from intake discipline picker  

---

## Admin UX

### Site Config → Disciplines

- Manage discipline list + nested tasks  
- Link each task to a Task Type (rate/color source)  
- "Add task from Task Type" helper — pick unassigned Task Types to nest under a discipline  
- Task Types page unchanged for rate CRUD  

### Intake Config → Field editor

When adding **Disciplines needed** field:

```
┌─ Disciplines needed ─────────────────────────────┐
│ Label: [ What do you need help with?           ]   │
│ Required: [x]                                      │
│                                                    │
│ Options (from your discipline list):               │
│ [x] Design        [x] Development                  │
│ [x] Strategy      [x] Research                     │
│ [x] Support       [ ] Admin         [ ] Meeting    │
│                                                    │
│ Drag to reorder how options appear to clients      │
└────────────────────────────────────────────────────┘
```

Budget, timeline, and other selects use separate option-set editors (tenant-defined strings, not discipline taxonomy).

---

## API helpers

```typescript
// Resolve intake field options at render/validate time
resolveDisciplineIntakeOptions(
  siteConfig: SiteConfig,
  field: IntakeField
): { value: string; label: string }[]  // discipline ids + names

// Filter taxonomy by context
getDisciplines(siteConfig, { forProject | forMemberProfile })
getDisciplineTasks(siteConfig, disciplineId, { assignableOnly?: boolean })

// Validate lead submit
validateDisciplinesNeeded(
  responses.disciplines_needed,
  field.disciplineOptionIds  // from published form snapshot
)
```

---

## Deriving tasks from Task Types

**Initial seed:** one-time migration nests existing Task Types under disciplines (table above).

**Ongoing:** when admin creates a new Task Type, prompt: "Add to discipline?" — nest under existing or create new discipline. Do **not** auto-add new Task Types to intake.

**Billing-only tasks** (Fixed Rate Design): nest under discipline, `assignableToMember: false`, never in intake picker.

---

## Implementation phases

| Phase | Work |
|-------|------|
| **4** | `SiteConfig.disciplines` with nested `tasks[]`; seed script; `disciplines_needed` field type + admin picker UI |
| **6** | Member profile: discipline + optional task skills |
| **10** | Lead `disciplines_needed` → member discipline/task matching |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Initial spec; A&D seed from Task Types; Fixed Rate Design billing-only |
| 2026-07-03 | Nested tasks under disciplines; intake generalized; admin-curated discipline picker per intake form; Testing under Development |
| 2026-07-03 | Support as standalone intake discipline (onboarding, field work, experiential install/servicing) |
