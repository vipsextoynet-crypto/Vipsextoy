# Vipsextoy AI Development Rules

## 1. Project

Project name: `vipsextoy`

Project root:

`G:\vipextoy`

This is the main project. Prioritize this project over other projects.

---

## 2. Persistent Memory

The MCP server `vipsextoy-memory` is the persistent memory for this project.

### BEFORE EVERY TASK

Before working on anything involving:

- previous decisions
- existing architecture
- configuration
- product data
- product images
- synchronization
- bugs
- previous fixes
- deployment
- commands that previously worked
- project paths
- Git history
- previous development work

ALWAYS call:

`vipsextoy-memory_search_memory`

Search memory FIRST.

Use:

`project="vipsextoy"`

Do not replace Memory search with Glob, Grep, or guessing.

### AFTER IMPORTANT WORK

After completing an important task, ALWAYS call:

`vipsextoy-memory_save_memory`

Use:

`project="vipsextoy"`

Save reusable information such as:

- important fixes
- architecture decisions
- configuration
- file locations
- working commands
- product data rules
- image synchronization rules
- deployment information
- solutions to errors
- important development decisions

NEVER save:

- passwords
- API keys
- tokens
- cookies
- private credentials

---

## 3. Development Workflow

For every coding task:

### Step 1 â€” Understand

Read the request carefully.

Do not make assumptions about the desired behavior.

### Step 2 â€” Memory

Search `vipsextoy-memory` first.

### Step 3 â€” Inspect

Inspect only the relevant files.

Prefer the smallest useful search.

### Step 4 â€” Plan

Determine the smallest safe change.

Do not rewrite unrelated files.

### Step 5 â€” Modify

Make the minimum required change.

Preserve existing functionality.

### Step 6 â€” Verify

Run an appropriate test, type check, build, or targeted verification.

### Step 7 â€” Memory

Save important reusable knowledge to `vipsextoy-memory`.

### Step 8 â€” Report

Tell the user:

- what changed
- which files changed
- how it was verified
- whether anything still needs attention

---

## 4. Safety Rules

NEVER:

- delete large amounts of data without explicit permission
- overwrite product data blindly
- regenerate the entire product database unnecessarily
- remove product images
- change ports without permission
- change the Gemini FastAPI configuration without permission
- change MCP configuration without permission
- install or upgrade packages unnecessarily
- run destructive Git commands
- force push
- reset the repository
- discard user changes
- resolve Git conflicts by guessing
- modify unrelated files

Before destructive operations, STOP and ask the user.

---

## 5. Important Vipsextoy Architecture

### Product database

`src/data/products.ts`

This is the main product data source.

### Product images

`public/anh1/<SKU>/`

The folder name is the product SKU.

Example:

`public/anh1/DC82C/`

### Product image synchronization

Script:

`scripts/sync-images-anh1.mjs`

Important commands:

```text
node scripts/sync-images-anh1.mjs --dry-run
node scripts/sync-images-anh1.mjs
node scripts/sync-images-anh1.mjs --all
