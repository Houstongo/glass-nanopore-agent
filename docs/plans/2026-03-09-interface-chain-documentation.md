# Interface Chain Documentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create one layered runbook document that explains the full frontend -> FastAPI -> ESP8266 -> STM32 interface chain and clearly separates confirmed behavior from protocol gaps.

**Architecture:** The documentation will use the existing source files as the only authority. The runbook will start with a chain overview, then drill down by layer: frontend entry points, backend HTTP/WebSocket contracts, bridge behavior, ESP8266 forwarding, and STM32 control/telemetry protocol. A final section will call out mismatches, placeholders, and pending confirmations.

**Tech Stack:** Markdown, React frontend call sites, FastAPI backend, ESP8266 Arduino sketch, STM32 HAL firmware

---

### Task 1: Gather confirmed interface sources

**Files:**
- Modify: `docs/plans/2026-03-09-interface-chain-documentation.md`
- Reference: `apps/glass_nanopore_agent/backend/main.py`
- Reference: `apps/glass_nanopore_agent/core/hardware_bridge.py`
- Reference: `apps/glass_nanopore_agent/frontend/src/pages/EtchingConsole.jsx`
- Reference: `apps/glass_nanopore_agent/frontend/src/pages/CleaningSystem.jsx`
- Reference: `apps/glass_nanopore_agent/frontend/src/pages/PoreMeasurement.jsx`
- Reference: `apps/glass_nanopore_agent/frontend/src/constants/config.js`
- Reference: `firmware/esp8266_websocket_bridge/README.md`
- Reference: `firmware/esp8266_websocket_bridge/esp8266_websocket_bridge.ino`
- Reference: `firmware/etching_controller/Core/Src/main.c`
- Reference: `firmware/etching_controller/Core/Src/usart.c`
- Reference: `firmware/etching_controller/MDK-ARM/usartCallback.c`

**Step 1: Read backend route and response definitions**

Run: `Get-Content .\apps\glass_nanopore_agent\backend\main.py | Select-Object -Skip 410 -First 330`
Expected: See all public HTTP and WebSocket endpoints plus request/response structures.

**Step 2: Read frontend call sites**

Run: `Get-ChildItem .\apps\glass_nanopore_agent\frontend\src -Recurse -File | Select-String -Pattern '/api/etching|/api/rag|/api/config|/ws/hardware/telemetry|AA '`
Expected: Identify which pages call real backend endpoints and which only log protocol frames locally.

**Step 3: Read bridge and firmware protocol sources**

Run: `Get-Content .\firmware\esp8266_websocket_bridge\esp8266_websocket_bridge.ino`
Expected: Confirm Wi-Fi, WebSocket port, line-forwarding behavior, and UART relay details.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-09-interface-chain-documentation.md
git commit -m "docs: add interface chain documentation plan"
```

### Task 2: Author the single layered runbook

**Files:**
- Create: `docs/runbook/full-interface-chain.md`
- Reference: `docs/plans/2026-03-09-interface-chain-documentation.md`

**Step 1: Write the document skeleton**

Include sections for overview, layered chain, frontend, backend, ESP8266, STM32, known gaps, and recommended next steps.

**Step 2: Fill confirmed contracts only**

For each layer, document:
- interface name
- path or frame format
- direction
- payload fields
- confirmed implementation status
- source of truth

**Step 3: Mark protocol uncertainty explicitly**

Call out areas where code only exposes partial evidence, such as incomplete STM32 command semantics and frontend placeholder pages.

**Step 4: Commit**

```bash
git add docs/runbook/full-interface-chain.md
git commit -m "docs: add full interface chain runbook"
```

### Task 3: Verify the document against source

**Files:**
- Modify: `docs/runbook/full-interface-chain.md`

**Step 1: Cross-check every endpoint and protocol statement**

Run: `Get-Content .\docs\runbook\full-interface-chain.md`
Expected: Each major claim maps back to a source file already inspected.

**Step 2: Verify no implemented chain is overstated**

Run: `Get-Content .\apps\glass_nanopore_agent\frontend\src\pages\CleaningSystem.jsx`
Expected: Confirm that `CleaningSystem` remains a local command-log UI and is documented as such.

**Step 3: Verify no protocol gap is hidden**

Run: `Get-Content .\firmware\etching_controller\MDK-ARM\usartCallback.c`
Expected: Confirm that only the observed 8-byte UART frame parsing and flag mapping are documented as current evidence.

**Step 4: Commit**

```bash
git add docs/runbook/full-interface-chain.md
git commit -m "docs: verify full interface chain details"
```

Plan complete and saved to `docs/plans/2026-03-09-interface-chain-documentation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
