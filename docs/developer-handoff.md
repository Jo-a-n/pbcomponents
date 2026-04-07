# Developer Handoff Log

## 2026-04-07

### Summary
- Reduced workspace memory pressure by switching the library page to the generated component hierarchy instead of scanning `components/` at runtime, and added VS Code watcher/search excludes for heavy folders.
- Added a manual `renew-library` API flow and wired the library workspace UI to refresh the generated hierarchy after create/delete actions or an explicit renew.
- Moved workspace-only routes, scripts, and UI into `(pb.workspace)` / `pb.workspace/` so the workspace surface is separated more clearly from reusable component code.
- Completed the Style Editor border tool logic, including shared/side border width handling, border color parsing, inherited text-color fallback, and preview updates that reflect the active border color.
- Extracted Style Editor and save-styles normalization logic into shared helpers under `lib/style-editor/` and added Node test coverage for class token parsing, background/border helpers, editor state helpers, and save normalization.

### Commits (chronological)
1. `b7d081a` Optimizations for memory usage: Component scan, route changes and vscode settings
2. `2970b12` Directory changes & Style Editor Features: Seperate comp library layout to pb.workspace/ & complete Border tool logic
3. `8968e09` organize directory w/ pb.component distiction
4. `bdc872d` test: cover style editor helper logic and save-styles normalization

### Key Files Touched Today
- `.vscode/settings.json`
- `app/(pb.workspace)/library/page.tsx`
- `app/api/(pb.workspace)/create-component/route.ts`
- `app/api/(pb.workspace)/delete-component/route.ts`
- `app/api/(pb.workspace)/renew-library/route.ts`
- `app/api/(pb.workspace)/save-styles/route.ts`
- `pb.workspace/LibraryWorkspace.tsx`
- `pb.workspace/ComponentTree.tsx`
- `pb.workspace/StyleEditor.tsx`
- `pb.workspace/componentNameToFileName.ts`
- `lib/style-editor/save-styles.mjs`
- `lib/style-editor/style-editor-helpers.mjs`
- `app/tests/background-color.test.mjs`
- `app/tests/class-tokens.test.mjs`
- `app/tests/save-styles.test.mjs`
- `app/tests/style-editor-borders.test.mjs`
- `app/tests/style-editor-helpers.test.mjs`
- `scripts/pb.workspace/generate-component-hierarchy.mjs`
- `package.json`

### Notes For The Next Developer
- The `/library` page now reads from `componentHierarchy.generated.ts` and uses `componentNameToFileName()` instead of scanning component source files on each request. If the hierarchy looks stale after manual file changes, use the new renew flow or rerun `npm run generate:hierarchy`.
- Workspace-specific pages and APIs now live under `app/(pb.workspace)/...`, and the workspace-only React files/helpers moved into `pb.workspace/`. Any imports still pointing at the old `components/panels/*` or `app/library/*` paths should be treated as stale.
- The library workspace now exposes create, delete, and renew actions from the UI. The API routes regenerate the hierarchy script from `scripts/pb.workspace/generate-component-hierarchy.mjs` after mutations.
- `pb.workspace/StyleEditor.tsx` was slimmed down by moving pure logic into `lib/style-editor/style-editor-helpers.mjs`; border behavior changes are mostly there now, while `save-styles` normalization lives in `lib/style-editor/save-styles.mjs`.
- Test coverage was added through `npm test` (`node --test app/tests/*.test.mjs`) for the extracted helper logic and save path normalization. The save-styles route now shares normalization code with the editor instead of maintaining separate category regex logic.

## 2026-04-01

### Summary
- Added Background & Border color picker tool in the Style Editor for improved color editing experience.
- Updated the save-styles API to ensure proper handling of different variable categories in component JSON files, improving style normalization and categorization.

### Commits (chronological)
1. `7618590` Add Background & Border color picker tool in Style Editor
2. `f9f8425` Ensure line change for dif variable categories in component .json file

### Key Files Touched Today
- `app/globals.css`
- `components/panels/StyleEditor.tsx`
- `app/api/save-styles/route.ts`

### Notes For The Next Developer
- The Style Editor now includes color picker tools for background and border colors.
- The save-styles route enhances style categorization when saving to component JSON files.
- Note: There are some linting warnings in `StyleEditor.tsx` (missing ARIA props and missing dependencies in useEffect), but they appear to be pre-existing issues not introduced by today's changes.
- All tests pass, and the modified files have no new linting errors.
- The workspace is currently clean with no uncommitted changes.

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
