# DigiTwin: Industrial Operator Login Portal, ERP Work Orders & Multi-Level MRP Architecture

## Executive Summary
This update transitions the digital twin to **DigiTwin**, removing individual architect tags, embedding default organization branding (**Mechanical Engg. Dept., IIESTS**), and implementing an industry-standard **Operator Login Portal** equipped with a live public system health ticker and environment selector (**Production**, **Simulation/Sandbox**, **Historical Playback**). Furthermore, it provides an interactive **Entity Inspection Modal** across Inventory, Converge/Joiner, and Dispatch buffers, and re-engineers the **ERP Work Orders & Multi-Level MRP** subsystem with automated BOM explosions, inventory allocations, and standalone zero-dependency deployment support.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been aligned based on user input:
> - **Authentication Mode**: Role-based authentication with operator credentials, pre-configured plant roles (Shift Operator, Maintenance Engineer, Quality Lead, Plant Supervisor), and mock SSO bypass.
> - **ERP & MRP Depth**: Full multi-level Bill of Materials (BOM) explosion with net requirements calculation, safety stock thresholds, and live inventory allocation against active work orders.
> - **Entity Inspection**: Dedicated drilldown modal on Inventory FIFO, Converge/Joiner, and Dispatch blocks displaying live queues, entity barcodes, wait dwell times, and material transit history.
> - **Branding & Identity**: Rebranded from *AeroTwin* to *DigiTwin*, architect name removed from all headers/footers, and organization set to *Mechanical Engg. Dept., IIESTS*.
> - **Universal Portability**: Zero hardcoded platform secrets or proprietary SDK lock-ins; standard Node.js/Vite/Express stack deployable via Docker, AWS, GCP, Render, or on-premise industrial IPCs.

---

## 1. Overview & Core Concept

DigiTwin serves as a high-fidelity industrial digital twin of a discrete manufacturing unit. The system controls and monitors raw material inflow, automated conveyors, 3-axis CNC machines (Lathe, Milling, Shaping), multi-stage Quality Control with rework circuits, synchronous 3-part merging, final assembly, and warehouse dispatch.

### Target Personas
- **Plant Floor Operator**: Logs into the active shift, inspects machine telemetry, triggers manual feed stops, and views queued items.
- **Production Planner / Industrial Engineer**: Manages work orders, audits Material Requirements Planning (MRP), and simulates line-balancing scenarios in Sandbox mode.
- **Maintenance Engineer**: Traces sensor vibration spectra (ISO 10816), Weibull RUL degradation, and machine alarms.

---

## 2. User Experience & Visual Design

### A. Industrial Operator Login Portal
A high-aesthetic, mission-critical portal inspired by Siemens Mindsphere, GE Digital, and AWS IoT TwinMaker:
- **Top Public Ticker Bar**:
  - Live system health status: `🟢 All Systems Operational`
  - Gateway metrics: `API Gateway: 14ms latency · Ingestion: 24,000 pts/sec · Edge Nodes: 16/16 Online`
  - Central Organization Brand: `Mechanical Engg. Dept., IIESTS`
- **Environment Switcher**:
  - `Simulation / Sandbox`: Active what-if testing, time acceleration (1x–60x), stochastic failure injection.
  - `Production (Live Asset)`: Shop-floor telemetry lock with real-time operational feeds.
  - `Historical Playback`: Shift archive analysis and audit replay.
- **Operator Card & Form**:
  - Clean credentials input (Operator ID / Email & Password or Badge PIN).
  - Quick-login demo presets: **Shift Operator (R. Sharma)**, **QC Lead (P. Banerjee)**, **Plant Supervisor (Dr. S. Roy)**.
  - Organization switcher support with persistence.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🟢 All Systems Operational] • [Gateway: 14ms] • [Nodes: 16/16 Online] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                       D I G I T W I N                                  │
│             Mechanical Engg. Dept., IIESTS                             │
│       Discrete Event Manufacturing Unit Digital Twin                   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Environment: [ Production | ⚙️ Simulation/Sandbox | Playback ] │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ Operator ID: [ op-10492                              ]         │   │
│   │ Passcode / PIN: [ ••••••••                           ]         │   │
│   │ Role: [ Shift Operator ▼                             ]         │   │
│   │                                                                │   │
│   │ [  Sign In to Cyber-Physical Twin  ]                           │   │
│   │ Quick Profiles: [ Operator ] [ Maintenance ] [ QC Lead ]       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Header & Brand Update
- Header title updated to **DigiTwin**.
- Author/architect credit removed completely from UI and metadata.
- Organization badge: **Mechanical Engg. Dept., IIESTS** displayed with subtle industrial styling.
- Operator status chip with current user role and a **Sign Out** action returning to the login gate.

### C. Entity Inspection Modal (Inventory, Converge/Joiner, Dispatch)
- Clicking on **Inventory RM1/RM2/RM3**, **Converge / Joiner Buffer**, or **Dispatch Outbound Dock** opens an interactive **Entity Queue & Traceability Inspector**:
  - Visual listing of all items currently buffered or in transit inside that station block.
  - Entity ID, Raw Material category, ingress timestamp, dwell duration ($t_{\text{wait}}$), and QC clearance status.
  - Click-through to detailed lifecycle step log with barcode rendering.

### D. ERP Work Orders & Multi-Level MRP Rework
- **Multi-Level Bill of Materials (BOM)**:
  - Level 0: Final Aerospace Assembly Mechanism (MRP: ₹18,500)
  - Level 1: RM1 Titanium Spindle Shaft (Qty: 1), RM2 Aluminum Housing Case (Qty: 1), RM3 Hardened Spur Gear (Qty: 1)
  - Level 2: Sub-components, fasteners, bearing seals, and raw billet stock.
- **MRP Net Requirement Calculation**:
  $$\text{Net Demand} = \text{Gross Sales Orders} - (\text{Stock On Hand} + \text{Scheduled Inflow}) + \text{Safety Stock}$$
- **Work Order Lifecycle**:
  - Dispatch board tracking Work Orders (`WO-001`, `WO-002`, `WO-003`) with stage indicators (`Allocated`, `In-Machining`, `In-QC`, `Completed`).
  - Real-time scrap write-off and rework unit allocation.

---

## 3. Technical Architecture & Data Strategy

### System Component Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION & CONTEXT                      │
│                  AuthContext (User, Role, Environment)               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Authenticated
┌──────────────────────────────────▼───────────────────────────────────┐
│                        DIGITWIN APPLICATION CORE                     │
│  ├── Top Navigation Bar (DigiTwin • IIESTS • Environment • Profile)  │
│  ├── Plant Operational State Engine (plantEngine.ts)                 │
│  │     ├── Discrete Event Clock & Entity Transitions                 │
│  │     ├── CNC / Transporters / Assembly Processing Stations         │
│  │     └── Sensor Synthesizer & Vibration/Temperature Regressors     │
│  ├── Factory Canvas & Layout Builder (Interactive SimEvents View)    │
│  ├── Entity Inspection Drawer/Modal (Buffer queue & barcode audits)  │
│  ├── Optimization Dashboard (7-Day OEE, Live Telemetry, Pop-out HUD) │
│  └── ERP & MRP Work Order Subsystem (BOM explosion & cost ledgers)   │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Universal Deployment
┌──────────────────────────────────▼───────────────────────────────────┐
│               PORTABLE FULL-STACK RUNTIME (Docker / Any Host)        │
│  ├── Express API Proxy & Static Asset Mount (server.ts)              │
│  ├── Zero Proprietary Cloud Lock-in (Standard npm & Node.js 18+)     │
│  └── Ready for AWS ECS / GCP Cloud Run / Render / On-Premise IPC     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Implementation Steps

1. **Authentication Store & Login View (`src/components/OperatorLoginPortal.tsx`)**:
   - Implement clean credential verification, environment selector, and public health ticker.
   - Provide role switcher and immediate session storage persistence (`digiTwin_session`).
2. **Branding & Header Cleanup (`src/App.tsx`, `index.html`, `metadata.json`)**:
   - Rename application to **DigiTwin**.
   - Strip all author/architect mentions.
   - Integrate **Mechanical Engg. Dept., IIESTS** organization mark.
   - Add operator avatar with environment badge and Sign Out button.
3. **Entity Inspection Modal (`src/components/EntityInspectionModal.tsx`)**:
   - Build modal for Inventory FIFO, Converge/Joiner, and Dispatch blocks.
   - Show entity IDs, arrival times, transit histories, and raw material specifications.
4. **ERP Work Orders & MRP Engine (`src/components/FinanceAndERPView.tsx` & `src/utils/mrpEngine.ts`)**:
   - Build multi-level BOM explosion tree.
   - Calculate gross demand, net requirements, and live inventory allocations.
   - Add work order dispatch board with cost breakdown in Indian Rupees (₹).
5. **Portability & Verification**:
   - Ensure clean compilation (`compile_applet`) and zero TypeScript/lint errors (`tsc --noEmit`).
   - Verify unit test suite with 44+ passing tests.
