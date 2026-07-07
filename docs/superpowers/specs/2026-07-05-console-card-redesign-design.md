# Console-Style Card Redesign

## Brief

BSDock is a Panel-Node management platform. The current panel frontend UI uses a light, generic shadcn/ui SaaS look. The node list cards show almost no actionable information, detail-page info cards are flat, and the install-command card lacks the "command" presence the action deserves.

Goal: redesign the frontend around a **mission-control console** aesthetic so that card information is scannable, status is instantly readable, and every card feels like an instrument panel.

Scope covers three card types:

1. Node list card (`/nodes`)
2. Node detail info cards (`/nodes/$nodeId`)
3. Install command card (used in dialog and detail page)

---

## Subject, Audience, and Single Job

- **Subject**: server / node fleet management
- **Audience**: system administrators and developers who need to see node health at a glance
- **Single job of the page**: tell the user which nodes are healthy, which need attention, and give them the fastest path to act (install, reset, inspect)

---

## Visual Token System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `deep-space` | `#0B0C10` | page background |
| `panel` | `#1F2833` | card, sidebar, dialog, panel backgrounds |
| `panel-hover` | `#2A3546` | card hover state |
| `console-text` | `#C5C6C7` | primary body text |
| `dim-text` | `#8892A0` | labels, captions, placeholders |
| `signal-green` | `#39FF14` | online / success states |
| `signal-amber` | `#FFC107` | offline / warning states |
| `signal-red` | `#FF4D4D` | pending / error states |
| `signal-cyan` | `#00F0FF` | focus rings, links, primary-action accents |

### Typography

- **Single font family**: `Maple Mono CN` (already in use). The console direction uses one monospace family for everything and relies on weight/size/tracking for hierarchy.
- **Scale**:
  - page title: `text-2xl font-semibold tracking-tight`
  - card title / data value: `text-lg font-semibold`
  - labels: `text-xs font-medium uppercase tracking-wider text-dim-text`
  - body: `text-sm`

### Layout Principles

- All cards sit on `#0B0C10`.
- Cards use `#1F2833` background, `rounded-lg`, `p-4`, subtle border (`#2A3546`).
- Strict internal alignment; values line up where possible.
- Status is encoded by color first, text second.

### Signature Element

**Left-edge status light bar**. Every card has a 4px vertical bar on the left edge that runs the full card height. Colors map to status:

- `online` → `signal-green`
- `offline` → `signal-amber`
- `pending` / error → `signal-red`

On hover, the bar emits a soft 1.5s pulse glow matching its color. This is the single memorable visual hook of the redesign.

---

## 1. Node List Card Redesign

### Current State

Shows only node name and a status badge.

### New Structure

```
┌────────────────────────────────────┐
│████  prod-web-01              ⋮  │
│████  ONLINE                  2m   │
│████  Linux   10.0.0.4   CPU 12%   │
└────────────────────────────────────┘
```

- **Left 4px status light bar** in signal color.
- **Row 1**: node name (monospace, white, truncated with `title` tooltip) + actions dropdown on the right.
- **Row 2**: status word in uppercase + signal color, and `last_seen_at` as relative time on the right in dim text.
- **Row 3**: platform mini-badge, primary IP, and a one-line resource snapshot (CPU / memory percentages) when `system_info` is available.
- **Hover**: background shifts to `panel-hover`, left bar glow-pulses.

### Data Added

- `last_seen_at` formatted as relative time (e.g., "2m ago")
- `platform` as a small badge
- `system_info.ips[0]` as primary IP
- CPU / memory utilization summary when present

### Actions Menu

Keep the existing dropdown, but rename / reorder items for clarity:

- For `online` nodes: **Reset**
- For non-online nodes: **Install Command**
- **Rotate Token**
- **View Details**

---

## 2. Node Detail Info Cards Redesign

### Current State

Nine equal-weight cards in a 3-column grid, each showing a title and value. Resource numbers have no visual reference.

### New Structure

Group related readings into labeled sections.

#### A. Status Banner

A full-width panel at the top of the detail page:

- Large left status light bar (8px)
- Status word in uppercase + signal color
- Last seen relative time
- Uptime

#### B. Hardware Group

Cards for:

- Hostname
- OS / Arch
- Kernel
- CPU Model
- Platform

Each card:

```
┌─────────────────────────┐
│ hostname                │  <- label, lowercase, dim-text
│ prod-web-01             │  <- value, text-lg, monospace
└─────────────────────────┘
```

#### C. Resources Group

Cards for memory, disk, CPU cores. Include a usage bar when data exists:

```
┌─────────────────────────┐
│ memory                  │
│ 12.40 GB / 31.25 GB     │
│ ████████████░░░░░░░░░░  │  <- usage ratio bar
└─────────────────────────┘
```

- Missing data shows "—" instead of "0" or "-".
- Bar uses signal color thresholds: green ≤ 70%, amber ≤ 90%, red > 90%.

#### D. Network Group

- IP list with one address per line
- Uptime card

---

## 3. Install Command Card Redesign

### Current State

Looks like a generic form panel.

### New Structure

Terminal-session card:

```
┌─────────────────────────────────────┐
│ INSTALL COMMAND              [copy] │
├─────────────────────────────────────┤
│ $ curl -sSL ... | bash              │
│                                     │
│   [Copy]  [Regenerate]              │
└─────────────────────────────────────┘
```

- Header: uppercase label "INSTALL COMMAND" on the left, compact copy icon button on the right.
- Code block: deep-space background, monospace text, `$` prompt prefix, rounded-md, scrollable when long.
- Actions: "Copy" and "Regenerate" styled as console buttons (outline with signal-cyan focus ring).
- Empty state: dim-text explanation + "Generate" primary button.

---

## Motion

- **Status bar pulse**: only on card hover, 1.5s ease-in-out infinite, respecting `prefers-reduced-motion`.
- **Card hover**: background transition 150ms.
- **Focus rings**: signal-cyan outline for keyboard navigation.
- No page-load animations or scatter effects; keep motion functional.

---

## Accessibility

- Color is not the only status signal: status text is always present.
- Focus rings visible on all interactive elements.
- Respect `prefers-reduced-motion` by disabling the pulse.
- Maintain current keyboard and screen-reader semantics.

---

## Implementation Tasks

Work is split into four incremental tasks so each can be reviewed and merged independently:

### Task 1 — Global Theme Switch

- Update `web/src/index.css` dark-mode variables to the console palette.
- Ensure sidebar, page background, inputs, dialogs, and dropdowns inherit the new tokens.
- Add `prefers-reduced-motion` guard for any global transitions.

### Task 2 — Node List Cards

- Create or update `NodeCard` component (or inline in `/nodes/index.tsx`).
- Add left status light bar with hover pulse.
- Display platform badge, last-seen time, primary IP, and resource snapshot.
- Update empty-state and skeleton loaders to match new card shape.

### Task 3 — Node Detail Info Cards

- Replace flat 3-column grid with grouped sections.
- Create reusable `InfoCard` and `ResourceCard` components.
- Add status banner at the top of the page.
- Add usage bars for memory/disk with color thresholds.

### Task 4 — Install Command Card

- Redesign `InstallCommandCard` / `InstallCommandDisplay` as terminal-session UI.
- Update the dialog that shows install/reset commands.
- Verify copy and regenerate actions still work.

---

## Acceptance Criteria

- [ ] Page renders in dark console theme without visual regressions in layout.
- [ ] Node list cards display status light bar, last seen, platform, IP, and resource snapshot.
- [ ] Node detail page groups information into status banner, hardware, resources, and network sections.
- [ ] Resource cards show usage bars with correct threshold colors.
- [ ] Install command card resembles a terminal session and remains fully functional.
- [ ] All existing unit and E2E tests pass, or are updated to match new selectors/markup.
- [ ] Reduced-motion preference disables the status-bar pulse.

---

## Risks

- The dark theme is a large visual change. Task 1 must land first to avoid half-themed pages.
- `system_info` may be missing for pending/offline nodes; all new fields must degrade gracefully to "—" or be hidden.
- Existing Playwright tests may rely on old card selectors; update tests alongside components.
