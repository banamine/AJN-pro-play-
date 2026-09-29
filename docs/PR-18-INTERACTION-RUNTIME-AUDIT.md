# PR 18 — Interaction Runtime Audit & Hardening

Status: AUDIT IN PROGRESS  
Branch: `feature/pr-18-interaction-runtime-audit`  
Baseline: `main` after PR #17 merge (`ae7003d5fbc4fc9e3fb0b6cc9c93ddef846ee91c`)  
Scope: runtime interaction boundary between virtualized EPG DOM, CSS viewport pinning, browser keyboard event routing, and cross-origin Rumble iframe behavior.

## Audit method

This initial pass is source-level and contract-level. It does not claim browser-runtime proof where the repository currently has only pure tests. Findings are classified as confirmed from code, partial, or not yet browser-verified.

## Six edge-case findings

### 1. Cross-origin iframe focus trap — HIGH / CONFIRMED RISK

**Evidence**

`RumblePlayerContainer` makes the player wrapper focusable with `tabIndex={0}`, but its child `RumbleIframe` creates a real cross-origin `<iframe>` directly inside the same viewport. There is no parent overlay, iframe focus shield, or iframe-focus escape mechanism.

`RumbleTVStationView` installs its keyboard listener with the default `window.addEventListener("keydown", ...)` bubble behavior. It cannot observe key events occurring inside the cross-origin document once browser focus has entered that document.

**Conclusion**

The current implementation does not establish a reliable parent-level focus trap. Clicking/interacting with the Rumble iframe can transfer focus into the cross-origin browsing context. Parent spatial navigation cannot then be assumed to receive Arrow/Escape events.

**Required hardening direction**

Preserve iframe playback interaction while providing an explicit parent-controlled navigation escape path. The implementation must be validated in a real browser; pure Node tests cannot prove cross-origin focus behavior.

---

### 2. Layout collapse / IntersectionObserver feedback loop — PASS at structural level

**Evidence**

The player is wrapped by:

`<div className="relative aspect-video w-full" data-rumble-player-anchor="v1">`

The `RumblePlayerContainer` changes to `position: fixed` only inside that wrapper. The wrapper itself remains in normal document flow and retains its aspect-ratio-derived height.

**Conclusion**

The principal collapse/oscillation failure mode described in the audit is structurally prevented by the stable anchor. Pinning removes the player from flow but does not remove the anchor's reserved aspect-ratio box.

**Remaining browser gate**

Verify in a real browser with scroll transitions that IntersectionObserver does not oscillate at the visibility threshold and that the pinned state remains stable while the anchor is outside the viewport.

---

### 3. Focus disappearance under EPG virtualization — PARTIAL / HIGH RISK

**Evidence**

`EpgContainer` stores logical focus as primitive numeric coordinates:

`focusedCell = { row, column }`

It does not store a DOM node or program object as the focus authority. This is directionally correct.

However, the audit requirement is stronger: stable logical identity should survive schedule refresh/reordering, and the implementation should ensure the target row is mounted before attempting DOM scrolling.

Current `focusCell()` updates React state and then performs:

`rootRef.current?.querySelector(...)` followed by `scrollIntoView()`

The target query can return no element when the requested row is outside the currently virtualized slice. There is no explicit pre-scroll of `verticalScrollRef` to mount the target row before querying it.

The logical coordinates are also index-based rather than stable `channelId/programId` keys, so schedule insertion/removal can shift the meaning of a stored row/column.

**Conclusion**

The implementation avoids direct DOM-node focus state, but it does not yet satisfy the stronger stable-key + mount-before-focus contract.

**Required hardening direction**

Move the authoritative selection to primitive stable identifiers (`channelId`, `programId`) and explicitly bring the target row into the virtualized window before applying DOM focus/scroll behavior.

---

### 4. Capture vs bubble key hijacking — PARTIAL / CONFIRMED ESCAPE PROPAGATION BUG

**Evidence**

`RumbleTVStationView` registers:

`window.addEventListener("keydown", handleKeyDown)`

with no capture flag, so this is bubble phase.

`EpgContainer` handles `keydown` locally and calls `preventDefault()` for arrows and Escape, but does not call `stopPropagation()`.

The window handler correctly gates arrow handling with:

`if (activeFocusRegion === "epg") return`

so EPG arrow keys are not double-stepped by the macro handler.

However, Escape is handled by the window listener before/after the EPG handler according to normal bubble ordering, and the EPG handler does not stop propagation. The EPG Escape path requests `focusRegion("player")`, while the window Escape path unconditionally requests `focusRegion("carousel")`.

**Conclusion**

Arrow double-processing is currently guarded by the EPG region gate, but Escape has competing handlers and can cause an unintended second focus transition.

**Required hardening direction**

Define one authoritative Escape path and stop propagation when the EPG consumes the event, or make the macro handler explicitly honor `event.defaultPrevented`.

---

### 5. Polling churn / active selection reset — HIGH / CONFIRMED DATA-IDENTITY ISSUE

**Evidence**

`RumbleTVStationView` stores:

`const [previewProgram, setPreviewProgram] = useState<EpgProgram | null>(null)`

This stores the entire transient program object rather than a stable `channelId/programId` identity.

Meanwhile `epgChannels` is recomputed from the latest `channels` state and `adaptRumbleStateToEpgSchedule()`. A sync update can therefore replace program object instances while `previewProgram` continues to reference the previous object.

**Conclusion**

Preview state is not bound strictly to stable IDs. It can become stale relative to newly projected schedule data. The same identity concern applies to index-based `focusedCell` selection.

**Required hardening direction**

Store `previewChannelId` + `previewProgramId` (or one equivalent stable composite key) and resolve the current program from the latest projection when rendering.

---

### 6. Z-index layering / preview modal — HIGH / CONFIRMED UI BUG

**Evidence**

The current program preview is rendered as an ordinary `<aside>` inside normal document flow:

`<div className="p-2 pt-0"><PreviewDrawer ... /></div>`

It has no explicit z-index or modal/backdrop layer.

The pinned player explicitly uses:

`fixed ... z-50 ...`

Therefore a pinned player can visually sit above the preview content. The current implementation is not a true modal despite the interaction requirement describing modal behavior.

**Conclusion**

The stacking contract is currently unsafe for pinned PiP + preview interaction.

**Required hardening direction**

Either make the preview a deliberate modal layer with a z-index above the pinned player and explicit focus/close semantics, or explicitly define it as a non-modal panel and keep the pinned player from obscuring it. Browser visual validation is required.

---

## Initial gate matrix

| Edge case | Initial classification | Browser proof still required |
|---|---|---|
| Cross-origin iframe focus | HIGH — confirmed architectural risk | Yes |
| Pinning layout collapse | PASS structurally | Yes |
| Virtualized focus disappearance | PARTIAL — hardening required | Yes |
| Key capture/bubble | PARTIAL — Escape conflict confirmed | Yes |
| Polling selection identity | HIGH — hardening required | Yes |
| PiP vs preview stacking | HIGH — confirmed UI issue | Yes |

## Hardening order

1. Establish a safe parent/iframe focus escape contract.
2. Replace index/object focus state with stable channel/program identity.
3. Make virtualization mount/scroll deterministic before focus presentation.
4. Consolidate Escape/key event ownership.
5. Define explicit preview modal/panel stacking and focus semantics.
6. Add browser-runtime evidence for pinning, iframe focus, virtualization, keyboard routing, and stacking.

## Boundary rule

No browser behavior is marked PASS solely from pure Node tests. The existing pure tests prove helper logic only. PR 18 must add or document real browser-runtime evidence for the six interaction boundaries before claiming completion.
