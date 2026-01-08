# kyh.io Monorepo

Personal monorepo. Uses pnpm workspaces + turborepo.

## Commands

```bash
pnpm dev-<app>     # dev server for specific app
pnpm build         # build all
pnpm lint          # lint all
pnpm typecheck     # typecheck all
```

## Apps

### kwadrants (`apps/kwadrants`)
2x2 matrix canvas editor using react-konva.

**Stack**: React, Vite, Konva, Tailwind v4, motion

**Features**:
- Draggable tags + images on canvas
- Editable axis labels (click to edit)
- Quadrant color customization
- Grid options (none/squares/dots)
- Layout modes: axis (labels at axis ends) vs edge (labels as headers)
- Floating draggable panel snaps to 4 corners
- Export to PNG/JPEG
- State persisted to localStorage

**Key files**:
- `src/lib/KwadrantContext.tsx` - state management
- `src/components/canvas/` - Konva canvas components
- `src/components/ui/FloatingIsland.tsx` - draggable toolbar

### cli (`apps/cli`)
Personal CLI tool.

### kyh (`apps/kyh`)
Main website.

### party (`apps/party`)
PartyKit app.

### tc, covid-19, vis-ml
Other project apps.

## Packages

Shared configs and utilities in `packages/`.
