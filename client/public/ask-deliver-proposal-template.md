---
# Share this file with Claude (or any assistant) to draft proposal copy. Import the
# filled file via Proposals → open draft → Import markdown. Lines starting with #
# are YAML comments and are ignored by the importer.
title: Client project title
proposalNumber: PROP-2026-000
client: Primary contact or business name
project: Short project label
date: 2026-03-28
---

## Introduction

Two or three paragraphs: what you are building, for whom, and the outcome they get.

## Challenge

What pain exists today? Why does it matter?

## Solution

How the proposed work addresses the challenge at a high level.

## Terms

Plain-language billing, validity, and how to start.

**Assumptions**

- First assumption the client must satisfy
- Second assumption

**Not included in this proposal**

- Explicit out-of-scope item
- Another exclusion

```proposal-data
{
  "phases": [
    {
      "name": "Phase 1 — Discovery & foundation",
      "summary": "One line describing this phase for the summary table.",
      "bullets": [
        "Concrete deliverable or milestone",
        "Another bullet the client can scan quickly"
      ],
      "estimatedHours": 40,
      "estimatedCost": 5200,
      "duration": "2–3 weeks"
    },
    {
      "name": "Phase 2 — Build & launch",
      "summary": "Follow-on work through go-live.",
      "bullets": [
        "Feature or integration",
        "QA, documentation, or training"
      ],
      "estimatedHours": 32,
      "estimatedCost": 4160,
      "duration": "2 weeks"
    }
  ],
  "investment": {
    "fees": 0,
    "notes": "Optional markdown notes under the investment table (e.g. billing cadence)."
  }
}
```
