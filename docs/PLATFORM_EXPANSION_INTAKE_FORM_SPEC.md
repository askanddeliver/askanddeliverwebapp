# Platform Expansion — Default Intake Form Spec (Tenant #1)

**Status:** Planning (July 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**See also:** [PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md), [PLATFORM_EXPANSION_ARCHITECTURE.md](./PLATFORM_EXPANSION_ARCHITECTURE.md)

This document locks the **default public intake form** for Ask And Deliver: step order, fields, required vs optional, conditional logic, option sets, and the seed `IntakeForm` snapshot for implementation Phases 2–4.

---

## Design principles

1. **Progressive disclosure** — start low-friction (confidence), deepen qualification, end with contact info.
2. **Confidence-aware copy** — step titles and placeholders adapt when `confidence` is YES / MAYBE / UNSURE (preserve current `Contact.tsx` behavior).
3. **Client-generalized disciplines** — discipline multi_select on step 2; no task-level granularity.
4. **Soft optional commercial fields** — budget and timeline encouraged but skippable (matches current form: step can proceed without them).
5. **Admin-editable** — all copy, option sets, and discipline picker selection configurable via `/intake-config` without deploy.

---

## Step flow overview

| Step | Title (default) | Purpose | Required to continue |
|------|-----------------|---------|----------------------|
| **0** | What are we building? | Confidence / clarity level | `confidence` |
| **1** | Tell us about your project | Disciplines + description (+ project type if confident) | `disciplines_needed`, `description` |
| **2** | Numbers and timing | Budget + timeline | — (all optional) |
| **3** | Share any files | Optional attachments | — (optional) |
| **4** | How do we reach you? | Contact details | `name`, `email` |

**Total steps:** 5 (expanded from current 4 — disciplines split into step 1; files added as step 3).

```
[ Confidence ] → [ Disciplines + Details ] → [ Budget / Timeline ] → [ Files ] → [ Contact ] → Submit
```

---

## Step 0 — Confidence

**Step id:** `confidence`  
**Headline:** What are we building?

| Field key | Type | Required | mapsTo | Notes |
|-----------|------|:--------:|--------|-------|
| `confidence` | `single_select` (card UI) | ✓ | `confidence` | Values: `YES`, `MAYBE`, `UNSURE` |

**Options (fixed enum — pipeline uses these values):**

| Value | Label | Description |
|-------|-------|-------------|
| `YES` | I know exactly what I need | Clear scope, ready to go |
| `MAYBE` | I have a general idea | Direction, but open to input |
| `UNSURE` | I'm still figuring it out | Start the conversation anyway |

Card layout with icons (Target / Compass / HelpCircle) — preserve existing visual pattern.

---

## Step 1 — Disciplines & project details

**Step id:** `project-details`  
**Headline / subcopy:** Conditional on `confidence` (see table below).

| Field key | Type | Required | mapsTo | Conditional |
|-----------|------|:--------:|--------|-------------|
| `disciplines_needed` | `disciplines_needed` | ✓ | — (in `responses`) | always |
| `project_type` | `single_select` | ✗ | `projectType` | `showWhen: { confidence equals YES }` |
| `description` | `textarea` | ✓ | `description` | always; label/placeholder vary by confidence |

### `disciplines_needed` — admin picker (seed defaults)

`disciplineOptionIds`: `design`, `development`, `strategy`, `research`, `support`

Multi-select card or checkbox grid — client may pick **one or more**.

### `project_type` — option set (tenant-defined)

Seed options (from current `Contact.tsx`):

- Brand Strategy
- Web Design & Development
- Marketing Campaign
- Experiential Design
- Creative Consulting
- Video Production
- Other

### Confidence-conditional copy (step 1)

| confidence | Step title | Step description | Description label | Description placeholder |
|------------|------------|------------------|-------------------|-------------------------|
| `YES` | Tell us about your project. | Help us understand the scope so we can match you with the right team. | Brief Description | Help us understand what you're looking to create... |
| `MAYBE` | What problem are you trying to solve? | Share what you know and we'll help fill in the gaps. | Brief Description | Tell us about the challenge or opportunity you see... |
| `UNSURE` | What inspired you to reach out? | No pressure — let's start with what's on your mind. | What's on your mind? | What brought you here today? What are you thinking about? |

Implement via `stepCopyVariants: Record<confidence, { title, description }>` on the step and field-level `labelVariants` / `placeholderVariants` on `description`.

---

## Step 2 — Budget & timeline

**Step id:** `budget-timeline`  
**Headline:** Let's talk numbers and timing.  
**Description:** No wrong answers here. Even a rough sense helps us build the right team.

| Field key | Type | Required | mapsTo | Notes |
|-----------|------|:--------:|--------|-------|
| `budget` | `single_select` (pill buttons) | ✗ | `budget` | Encouraged, not blocking |
| `timeline` | `single_select` (pill buttons) | ✗ | `timeline` | Encouraged, not blocking |

### Budget option set (seed)

- Under $5,000
- $5,000 – $15,000
- $15,000 – $50,000
- $50,000+
- Not sure yet

### Timeline option set (seed)

- ASAP
- Within 4–6 weeks
- 1–2 months
- 3–6 months
- 6+ months
- Flexible / ongoing

**canProceed:** always `true` for this step (match current behavior).

---

## Step 3 — Files (optional)

**Step id:** `attachments`  
**Headline:** Have anything to share?  
**Description:** Brand guidelines, briefs, inspiration, or reference files — totally optional.

| Field key | Type | Required | mapsTo | Notes |
|-----------|------|:--------:|--------|-------|
| `attachments` | `file` | ✗ | — (in `responses`) | Multiple files allowed; max 5 files, 25MB each (configurable) |

**Accept (seed):** `.pdf`, `.doc`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.zip`  
**Storage:** `{workspaceOwnerId}/intake/{leadId}/…` on Cloudinary after lead draft/create on submit.

**canProceed:** always `true` — client may skip with no uploads.

**UX:** Drag-and-drop zone + file list with remove. If no files selected, Continue skips upload API calls.

---

## Step 4 — Contact

**Step id:** `contact`  
**Headline:** How do we reach you?  
**Description:** We read every submission personally. You'll hear from us within 1–2 business days — usually faster.

| Field key | Type | Required | mapsTo | Notes |
|-----------|------|:--------:|--------|-------|
| `name` | `text` | ✓ | `name` | |
| `email` | `email` | ✓ | `email` | |
| `company` | `text` | ✗ | `company` | |
| `message` | `textarea` | ✗ | `message` | Label: "Anything else?" |

**Submit button label:** Start the Conversation

---

## Success state

**Title:** Thank you!  
**Body:** We've received your project inquiry and will be in touch within 1–2 business days. In the meantime, feel free to browse our work.  
**CTA:** Explore Our Portfolio → `/work`

Configurable on `IntakeForm.successMessage` + optional `successCta`.

---

## Form-level metadata (seed)

```typescript
{
  slug: 'default',
  status: 'PUBLISHED',
  version: 1,
  title: "Let's build something together.",
  subtitle: "Tell us about your project and we'll figure out the best way to help. Every great project starts with a conversation.",
  successMessage: "We've received your project inquiry and will be in touch within 1–2 business days...",
  steps: [ /* 5 steps per above */ ]
}
```

---

## Lead mapping on submit

| Source | Lead column | Also in `responses` |
|--------|-------------|---------------------|
| `confidence` | `confidence` | ✓ |
| `disciplines_needed` | — | ✓ (discipline ids array) |
| `project_type` | `projectType` | ✓ |
| `description` | `description` | ✓ |
| `budget` | `budget` | ✓ |
| `timeline` | `timeline` | ✓ |
| `attachments` | — | ✓ (array of `{ url, filename, mimeType, size }`) |
| `name` | `name` | ✓ |
| `email` | `email` | ✓ |
| `company` | `company` | ✓ |
| `message` | `message` | ✓ |

**Pipeline defaults:** `status: NEW`, `priority: MEDIUM`, `source: public`.

**Admin lead detail display order:**
1. Contact block (name, email, company)
2. Confidence badge
3. Disciplines needed (resolved to discipline names)
4. Project type, budget, timeline
5. Description + message
6. Attachments (links)
7. Raw responses (collapsed)

---

## Validation summary

| Field | Client required | Server required |
|-------|:---------------:|:---------------:|
| confidence | ✓ | ✓ |
| disciplines_needed (≥1) | ✓ | ✓ |
| description (non-empty) | ✓ | ✓ |
| project_type | ✗ | ✗ (only if visible) |
| budget | ✗ | ✗ |
| timeline | ✗ | ✗ |
| attachments | ✗ | ✗ |
| name | ✓ | ✓ |
| email | ✓ | ✓ (valid email) |
| company | ✗ | ✗ |
| message | ✗ | ✗ |

---

## Admin intake builder notes

- Steps reorder via ordered list (v1).
- Each field: type, key, label, required flag, mapsTo, showWhen, option set or discipline picker.
- **Option set library** on SiteConfig or IntakeForm: `budgetOptions`, `timelineOptions`, `projectTypeOptions` — editable without code.
- **Preview mode** respects confidence variants (preview toolbar: toggle YES / MAYBE / UNSURE).
- Publish increments `version`; public route serves latest PUBLISHED `default` form.

---

## Migration from current Contact.tsx

| Current step | New step | Change |
|--------------|----------|--------|
| 0 Confidence | 0 | unchanged |
| 1 Project details | 1 | **+ disciplines_needed**; keep conditional project type + description |
| 2 Budget/timeline | 2 | unchanged |
| — | **3 Files** | **new optional step** |
| 3 Contact | 4 | unchanged |

Legacy leads without `disciplines_needed` in responses: show "—" in admin UI.

---

## Implementation checklist

- [ ] Phase 2: Seed `IntakeForm` document from this spec
- [ ] Phase 3: Dynamic renderer with step variants + showWhen
- [ ] Phase 4: `disciplines_needed` field + file upload step + Cloudinary
- [ ] Admin preview: confidence toggle
- [ ] Lead detail: structured display per order above

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Initial default intake spec — 5 steps, A&D seed, required/optional matrix |
