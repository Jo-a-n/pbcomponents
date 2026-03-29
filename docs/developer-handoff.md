# Developer Handoff Log

## 2026-03-09

### Summary
- Added component creation from the Component Tree (API + UI flow).
- Added `/library` page to render and inspect component groups.
- Switched library rendering to support dedicated `*.view.tsx` previews.
- Updated component generation so new components also create `*.view.tsx`.
- Added component deletion for generated components (`Div###`) with cleanup of related files.
- Made style editing dynamic per component JSON file instead of frame-only behavior.
- Fixed selection/slot mapping so generated components and their children are selectable.

### Commits (chronological)
1. `bc6539a` refactor component mapping and folder organization
2. `384aad1` add breadcrumb in Style Editor panel
3. `ee10672` add component creation through the Component Tree side panel
4. `e3b1489` create a Component Library page to show components from `/components`
5. `9304051` render each component through its `.view.tsx` file in `/library`
6. `0cbb4c9` add delete flow for components and fix style editing
7. `cde44b6` UI design updates
8. `7f432ef` enable Component Selection for new components

### Key Files Touched Today
- `app/api/create-component/route.ts`
- `app/api/delete-component/route.ts`
- `app/api/save-styles/route.ts`
- `app/library/page.tsx`
- `app/library/LibraryWorkspace.tsx`
- `app/page.tsx`
- `components/panels/ComponentTree.tsx`
- `components/panels/StyleEditor.tsx`
- `components/card.view.tsx`
- `components/frame.view.tsx`
- `lib/component-selection/useComponentSelection.ts`
- `lib/component-selection/componentHierarchy.generated.ts`
- `lib/component-selection/types.ts`
- `scripts/generate-component-hierarchy.mjs`

### Current Uncommitted Workspace State
- Modified: `lib/component-selection/componentHierarchy.generated.ts`
- New files:
  - `components/div-004.tsx`
  - `components/div-004.json`
  - `components/div-004.view.tsx`

## 2026-03-29

### Summary
- Added structured controls for size mode, padding, corner radius, min/max limits, flex direction, gap, background, and border classes.
- Grouped raw Tailwind class editing into categorized text areas so padding, layout, text, border, effects, and uncategorized classes can be edited separately.
- Added token parsing/normalization helpers so arbitrary values like `12px` are preserved as Tailwind arbitrary values (for example `[12px]`) and existing class groups stay stable during edits.
- Improved padding usability with `Axes` vs `Sides` editing and improved corner radius editing with `Linked` vs `Independent` modes.
- Added width/height min-max controls with add/remove flows and a warning when min width exceeds max width.
- Added placeholder badges to unfinished Style Editor controls to make partial UI areas obvious during handoff.
- Cleaned up Component Tree styling to match the lighter current UI direction.
- Switched the global body font to use `var(--font-geist-sans)` before falling back to Arial/Helvetica.

### Commits (chronological)
1. `3452d32` works
2. `cbdaab6` Merge pull request #1 from Jo-a-n/pl
3. `4919b43` complete intender padding usability, align style editor layout with figma
4. `0535f77` Refine style editor text area edit for class grouping
5. `1790864` Refine style editor corner radius controls and clipping
6. `718bd98` Add min/max constraints to the style editor
7. `2b33857` add px values to padding inputs and fix border radius field bug
8. `80ad016` add placeholder badges to unfinished elements

### Key Files Touched Today
- `components/panels/StyleEditor.tsx`
- `components/panels/ComponentTree.tsx`
- `app/globals.css`

### Notes For The Next Developer
- The big change is almost entirely in `StyleEditor.tsx`; most recent work is UI polish and token-editing behavior rather than API changes.
- The Style Editor now derives editable fields from Tailwind class tokens, then writes back merged token groups when inputs change.
- Some inspector UI is intentionally incomplete and marked with `Placeholder` badges. The alignment matrix and some background/border affordances are visual placeholders, not fully wired controls yet.
- Width min/max conflict detection currently only warns for comparable units.
- The workspace is currently clean with no uncommitted changes.
