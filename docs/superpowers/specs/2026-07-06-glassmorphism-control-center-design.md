# Glassmorphism Control Center - Frontend Redesign

## Brief

BSDock is a Panel-Node management platform. The current web UI already uses a dark console palette, but the visual language remains generic and flat. The goal of this redesign is to establish a cohesive **mission-control / night-operations-center** aesthetic using layered glass panels, ambient light, and signal-colored accents. Every surface should feel like an instrument panel floating in a dark command center.

Scope covers the entire authenticated frontend surface:

1. Login page (`/login`)
2. Home dashboard (`/`)
3. Node list page (`/nodes`)
4. Node detail page (`/nodes/$nodeId`)
5. Shared components (sidebar, header, cards, rings, status badges, install command)

---

## Subject, Audience, and Single Job

- **Subject:** server / node fleet management
- **Audience:** system administrators and developers who need to scan node health and act quickly
- **Single job of the page:** tell the user which nodes are healthy, which need attention, and give them the fastest path to act (install, reset, inspect)

---

## Design Read

Reading this as: a dense developer/operator dashboard for infrastructure monitoring, with a night-operations command-center language, leaning toward Tailwind utilities + Maple Mono CN + glassmorphism with signal-cyan accents.

## Three Dials

- `DESIGN_VARIANCE: 7` - asymmetric hero panels, varied card sizes, layered depth
- `MOTION_INTENSITY: 8` - ambient drifting light, hover glow, orchestrated entrance transitions
- `VISUAL_DENSITY: 6` - dense data but breathable through glass layering

---

## Visual Token System

### Color Palette

| Token | Hex / RGBA | Usage |
|---|---|---|
| `deep-space` | `#080A0F` | page background |
| `panel` | `rgba(20, 28, 45, 0.55)` | glass card backgrounds |
| `panel-solid` | `#0F1620` | fallback for reduced transparency / high contrast |
| `panel-hover` | `rgba(30, 42, 66, 0.65)` | glass hover state |
| `console-text` | `#E8EBF0` | primary body text |
| `dim-text` | `#8B95A8` | labels, captions, placeholders |
| `signal-green` | `#39FF14` | online / success states |
| `signal-amber` | `#FFC107` | offline / warning states |
| `signal-red` | `#FF4D4D` | pending / error states |
| `signal-cyan` | `#00F0FF` | focus rings, links, primary-action accents |
| `border-glass` | `rgba(255, 255, 255, 0.08)` | default glass border |
| `border-glow` | `rgba(0, 240, 255, 0.35)` | hover / focus glow border |
| `highlight` | `rgba(255, 255, 255, 0.12)` | inner glass highlight |

### Typography

- **Single font family:** `Maple Mono CN` (already in use). The command-center direction uses one monospace family for everything and relies on weight/size/tracking for hierarchy.
- **Scale:**
  - page title: `text-2xl font-semibold tracking-tight`
  - section label: `text-xs font-semibold uppercase tracking-widest text-dim-text`
  - card title / data value: `text-lg font-semibold`
  - body: `text-sm`
  - caption / mono data: `text-xs font-mono`

### Layout Principles

- All surfaces sit on `#080A0F` with a subtle ambient light layer behind.
- Cards use glass panel style: translucent background, blur, inner highlight, subtle border.
- Strict internal alignment; values line up where possible.
- Status is encoded by color first, text second.
- Layered depth: page > glass panel > inner data tile > terminal block.

### Signature Element

**Glass panel with inner glow and top-edge status light.** Every major card has:

- A translucent frosted background (`backdrop-blur-xl`)
- A 1px inner highlight at the top (`inset 0 1px 0 rgba(255,255,255,0.12)`)
- A subtle outer border (`rgba(255,255,255,0.08)`)
- On hover: border brightens and emits a soft signal-cyan glow
- Status-bearing cards get a 3px top-edge light bar in signal color

---

## 1. Global Shell Redesign

### App Shell

- Background: `#080A0F` with a fixed ambient light layer (CSS pseudo-element, slow drift animation).
- Sidebar: glass panel, collapsible, with inner highlight. Active item has signal-cyan left border glow.
- Header: glass sticky bar, blurred background, minimal height 56px.
- Main content area: transparent, padded `p-4 lg:p-6`.

### Ambient Light Layer

- Fixed full-screen pseudo-element.
- Two large radial gradients (`rgba(0,240,255,0.04)` and `rgba(57,255,20,0.03)`) drifting slowly.
- Disabled under `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Fallback: static faint gradient, no blur cost.

---

## 2. Login Page Redesign

### Layout

Full-screen split:

- **Left (desktop only):** glass system-status panel showing animated telemetry rows (version, uptime, node count, network throughput).
- **Right:** centered frosted login card on deep-space background.

### Glass Login Card

- Background: `rgba(20, 28, 45, 0.6)` with `backdrop-blur-xl`
- Border: `rgba(255,255,255,0.08)`
- Inner highlight at top
- Inputs: glass style with focus glow in signal-cyan
- Submit button: signal-cyan background with dark text

### Mobile

Single column, right-side form fills viewport, decorative telemetry panel hidden.

---

## 3. Home Dashboard Redesign

### Layout

Three stacked sections:

1. **Status Hero** - full-width glass panel showing system operational state, version, uptime
2. **Stats Grid** - 4 equal glass stat cards (Total / Online / Offline / Pending)
3. **Signal Layer** - glass panel containing traffic charts and telemetry

### Status Hero

- Full-width glass card with inner highlight.
- Left: large "System Operational" or "Degraded" status with dot indicator.
- Right: version, uptime, Go version, update action.
- Background ambient glow shifts to green/amber based on health.

### Stats Cards

- Glass card with top-edge status light matching the metric meaning.
- Icon in a glass circular badge.
- Large number, small description.

### Signal Layer

- Section header inside the glass panel header.
- Traffic chart area with glass sub-panel.
- Real-time indicator pill.

---

## 4. Node List Page Redesign

### Layout

- Page header with title, description, and New Node action.
- Search + status filter bar in a glass toolbar.
- Responsive card grid: 1 / 2 / 3 / 4 columns.

### Node Card

- Glass card with top-edge status light bar (3px).
- Header: node name + status badge + actions menu.
- Meta row: platform badge, primary IP, last seen relative time.
- Center: three resource rings (CPU / MEM / Disk) with color-coded fills.
- Footer: Install Command + Reset buttons as glass outline buttons.
- Hover: border glow, slight lift (`translateY(-2px)`), status bar pulse.

### Loading State

- 8 glass skeleton cards matching the new card shape.

### Empty State

- Centered glass panel with icon, title, description, and New Node CTA.

---

## 5. Node Detail Page Redesign

### Layout

- Back button in page header.
- Full-width status hero glass panel.
- Resource overview: 3 large resource rings in glass cards.
- Grouped info sections in glass panels:
  - **Hardware:** Hostname, OS/Arch, Kernel, CPU, Platform
  - **Network:** IPv4, IPv6, Uptime, network speed/packets
  - **Resources:** Memory, Disk, CPU cores with usage bars
- Terminal-style Install Command card at the bottom.

### Status Hero

- Large top status light bar (4px).
- Node name, status badge, last seen, uptime.
- Subtle background tint based on status.

### Resource Rings

- Size xl on desktop, lg on tablet, md on mobile.
- Colored by usage threshold: green <= 70%, amber <= 90%, red > 90%.

### Info Cards

- Glass tile with label and value.
- Resource cards add a usage ratio bar.

---

## 6. Install Command Card Redesign

- Glass card with terminal-session styling.
- Header: "INSTALL COMMAND" label + compact copy button.
- Code block: deep-space background (`#050607`), monospace, `$` prompt prefix in signal-green, cyan left light bar.
- Actions: Copy + Regenerate as glass outline buttons.
- Empty state: explanation text + Generate primary button.

---

## 7. Shared Components

### GlassCard

Reusable glass panel primitive:

```tsx
interface GlassCardProps {
  children: React.ReactNode
  className?: string
  status?: NodeStatus // optional top light bar
  hover?: boolean
}
```

### StatusBadge

- Dot variant used in headers.
- Default outline variant used in tables/cards.
- Same signal colors.

### ResourceRing

- Keep existing SVG implementation.
- Add glass drop-shadow and color-coded label.
- Respect reduced motion.

### PageHeader

- Slightly larger title, optional description.
- Actions aligned right.

---

## 8. Motion

- **Ambient light drift:** slow continuous transform on fixed pseudo-element, disabled under reduced motion.
- **Card hover:** border glow + subtle lift (150ms ease-out).
- **Card entrance:** staggered fade-up via Motion `whileInView`.
- **Status light pulse:** 1.5s ease-in-out infinite on hover, disabled under reduced motion.
- **Resource ring load:** stroke-dashoffset transition 700ms ease-out, disabled under reduced motion.
- **Focus rings:** signal-cyan outline for keyboard navigation.

All motion must be motivated: hierarchy, feedback, or storytelling. No scatter effects.

---

## 9. Accessibility

- Color is not the only status signal: status text is always present.
- Focus rings visible on all interactive elements.
- Respect `prefers-reduced-motion` by disabling ambient drift, pulse, and load animations.
- Provide solid fallback under `prefers-reduced-transparency`.
- Maintain current keyboard and screen-reader semantics.

---

## 10. Implementation Tasks

### Task 1 - Global Theme & Shell

- Update CSS variables in `web/src/index.css` to new deep-space and glass tokens.
- Add ambient light layer CSS and reduced-motion/reduced-transparency fallbacks.
- Update `__root.tsx` layout with glass sidebar/header.
- Update `app-sidebar.tsx` and `app-header.tsx` glass styling.

### Task 2 - Glass Primitives

- Create `GlassCard` component.
- Update `StatusBadge`, `PageHeader`, `StatCard` to new glass language.

### Task 3 - Login Page

- Redesign `login.tsx` with split-screen glass panels.

### Task 4 - Home Dashboard

- Redesign `index.tsx` with status hero, stats grid, signal layer.
- Update `panel-hero-card.tsx`, `panel-probe-card.tsx`, `traffic-chart.tsx`, `stat-card.tsx`.

### Task 5 - Node List

- Update `nodes/index.tsx` toolbar and grid.
- Redesign `node-card.tsx` with glass styling and top status light bar.

### Task 6 - Node Detail

- Redesign `nodes/$nodeId.tsx` with status hero, resource rings, grouped info cards.
- Update `info-card.tsx`, `resource-card.tsx`, `resource-ring.tsx`.

### Task 7 - Install Command

- Redesign `install-command-card.tsx` as terminal-in-glass.

### Task 8 - Tests

- Update unit tests for changed components.
- Update E2E tests for changed selectors.
- Run full verification: `bun run build`, `bun run test`, `bunx playwright test tests/e2e/layout.spec.ts --project=chromium`.

---

## Acceptance Criteria

- [ ] Page renders in deep-space glass theme without layout regressions.
- [ ] All existing pages adopt the new visual language.
- [ ] Glass cards display hover glow, top status light bars, and inner highlights.
- [ ] Resource rings show usage with correct threshold colors.
- [ ] Install command card resembles a terminal session inside glass.
- [ ] Login page shows glass system-status panel and glass login card.
- [ ] All existing unit and E2E tests pass, or are updated to match new selectors/markup.
- [ ] Reduced-motion preference disables ambient drift, pulse, and ring load animation.
- [ ] Reduced-transparency preference shows solid panel fallback.

---

## Risks

- Glassmorphism with backdrop-filter can hurt performance on low-end devices; ambient layer is fixed and pointer-events-none to mitigate.
- Existing Playwright tests may rely on old card selectors; update tests alongside components.
- shadcn/ui default components may need class overrides to blend with glass tokens.
