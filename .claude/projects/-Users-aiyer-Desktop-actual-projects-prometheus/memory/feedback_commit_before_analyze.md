---
name: commit-and-push-before-analysis
description: Always commit and push code changes before running /analyze or /regen-all skills
type: feedback
---

Always commit and push all pending changes before generating stock analyses.

**Why:** User explicitly requested this workflow — ensures code state is saved before running analysis pipelines that modify the database.

**How to apply:** Before running `/analyze` or `/regen-all`, check for uncommitted changes. If any exist, commit and push first, then proceed with the analysis.
