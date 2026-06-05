# Style Editor Preview Research

## Mechanism

`mergePreviewClassNames` ([StyleEditor.tsx:128](StyleEditor.tsx#L128)) directly mutates DOM `element.className` on elements matched by `data-slot`. It does NOT go through React or `cn()`/`twMerge`.

**Formula:**
```
previewTokens  = toClassTokens(previewValue)        // current edited style, plain join, no twMerge
savedTokens    = new Set(toClassTokens(savedValue))  // baseline saved style
extraTokens    = baseClassName tokens NOT in savedTokens
result         = Set([...previewTokens, ...extraTokens]).join(' ')
```

`baseClassName` is the React-rendered className, captured as `data-pb-preview-base-class` on first preview run and restored on cleanup. The effect re-runs on every `previewStyles` change (every keystroke).

**Key difference from React rendering:** React uses `cn()` → `twMerge()` which resolves conflicting Tailwind utilities. The preview bypasses this — all tokens land in the className as-is, both sides of any conflict.

---

## Known Problems

### P-1 · Child height changes when editing parent property (observed on Frame / corner radius)

**Symptom:** Editing Frame's corner radius causes a child element's (FrameTitle) visible height to change in the preview.

**Root cause hypothesis:**
`mergePreviewClassNames` replaces Frame's `className` without running `twMerge`. React renders Frame via `cn(pb.Frame)` which does run `twMerge`. If Frame's token set contains classes that `twMerge` would conflict-resolve, the preview reintroduces both sides of the conflict, producing different effective CSS.

Frame's relevant tokens: `border-2` + `h-[240px]` (box-sizing: border-box → content height ≈ 236px) + `overflow-hidden`. FrameTitle has `h-full`, which in a flex container resolves relative to Frame's content box height. Any change to Frame's effective height (even a 1px shift from a conflicting padding/border token) cascades directly to FrameTitle's computed height.

**What to confirm in DevTools:** inspect Frame's computed `height` before vs during the edit. If it changes, the diverging token is the culprit.

**Status:** Open — root token not yet identified.

**Related code:**
- `mergePreviewClassNames` — [StyleEditor.tsx:128](StyleEditor.tsx#L128)
- Preview DOM-mutation effect — [StyleEditor.tsx:1825-1862](StyleEditor.tsx#L1825-L1862)
- `fromClassTokens` (no twMerge) — [style-editor-helpers.mjs:156](../lib/style-editor/style-editor-helpers.mjs#L156)

---

## Open Questions

- Does the preview need to run `twMerge` on `previewTokens` to match what React would render?
- Should `mergePreviewClassNames` use `cn()` instead of plain Set-join to keep behavior consistent with the component's own rendering?
