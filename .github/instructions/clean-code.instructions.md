---
applyTo: '**/*.ts, **/*.html'
---

# Clean Code & Semantic Naming Instructions

These principles apply when writing or refactoring code in this repository to maintain clarity, maintainability, and domain-driven design.

## Semantic & Domain-Driven Naming

- **Avoid technical jargon without context**: Replace generic names like `delta`, `pos`, `dir`, `size`, `data` with domain-specific terms that reflect business logic.
  - ❌ `data`, `pos`, `delta`, `dir`, `size`
  - ✅ Domain-specific: `blockData` → `blockMetadata`, `pos` → `pointerOffsetPx`, `delta` → `offsetPercent`, `dir` → `axis`, `size` → `containerAxisPx`

- **Include units in names** when they matter (px, %, ms, etc.): makes implicit types explicit.
  - ❌ `startPos`, `nextValue`, `duration`
  - ✅ `startPx`, `nextPercent`, `durationMs`

- **Name functions after intent, not implementation**: what does it do in domain terms, not how.
  - ❌ `calculate()`, `get()`, `process()`
  - ✅ `computeNextPercent()`, `validateBlockHash()`, `extractTransactionFee()`

- **Keep naming consistent** across inputs, state, and local variables (e.g., if a transaction ID is `txId`, use it everywhere, not `id` or `transactionId` interchangeably).

## Single Responsibility & Helper Extraction

- **Extract helpers for repeated logic**: Break complex conditionals, nested ternaries, and duplicated calculations into small private methods with single responsibility.
  - ❌ Nested ternaries or inline conditionals throughout a handler
  - ✅ Extract `getPointerAxis()`, `validateBlockData()`, `computeNextValue()`

- **One level of abstraction per function**: Handlers orchestrate; helpers compute.
  - Public/handler methods: set up state, validate inputs, call helpers, update signals.
  - Private helper methods: compute values, transform data, no side effects.

- **Separate calculation from state mutation**: Compute the result first, then set it—don't interleave logic.
  - ❌ `this.state.set(process(input)); // calculation and mutation mixed`
  - ✅ `const result = this.process(input); this.state.set(result); // separate concerns`

## Class-Level State Access

- **Avoid unnecessary parameter passing** within a class: If a method accesses `this.direction()`, `this.minRatio()`, etc., don't pass them as parameters to private helpers.
  - ❌ `private helper(axis, minRatio, maxRatio) { ... }`
  - ✅ `private helper() { const axis = this.direction(); ... }`

- This keeps method signatures lean and makes the class's responsibility clear.

## Event Handling & Input Normalization

- **Prefer unified APIs** over branching on input type: Normalize different input sources into a single code path.
  - ❌ Separate `onMouseDown`, `onTouchStart`, `onKeyDown` with duplicated logic
  - ✅ `PointerEvent` for mouse/touch, `setPointerCapture()` to manage focus, single handler

- **Use input validation patterns** to gate logic, not boolean flags: If possible, rely on native APIs (`hasPointerCapture`, `isPrimary`) instead of duplicating state.
  - ❌ `if (!this.isDragging()) return;` alongside document-level listeners
  - ✅ `if (event.isPrimary) { el.setPointerCapture(...); }` + element-level capture

- **Avoid redundant state flags** if validation suffices: Reserve booleans for UI state (cursor, styling) only.
  - ❌ `isDragging` signal used both for logic gating AND style
  - ✅ `isDragging` signal for UI only; pointer capture gates the logic

## Code Clarity

- **Comment intent, not the obvious**:
  - ❌ `// Get the pointer position` (obvious from method name)
  - ✅ `// Only process moves for the active input during capture` (explains *why* we guard)

- **Type guards for defensive checks**: Validate nullability, array existence, positive values before use.
  - ❌ `const value = arr[0]; this.set(value);` (crashes if array empty)
  - ✅ `if (!arr.length) return; const value = arr[0]; this.set(value);`

- **Early returns** reduce nesting and clarify control flow:
  - ✅ `if (!condition) return;` then proceed with happy path.

## Relative, Not Absolute

- **Calculations are relative to constraints**: Min/max ranges, container sizes, and reference points are relative.
  - Name signals to reflect this: `dragStartPercent`, `containerAxisPx`, `minRatio` (not absolute pixel positions).
  - Document units and ranges in comments or type definitions.

## File Organization

- **Handlers at the top** (public-facing, orchestration).
- **Helpers at the bottom** (private, implementation details).
- **Group related logic**: Group related handlers together, then group related helpers together.

## Testing & Validation

- **Validate inputs early**: Check constraints (e.g., `containerSize > 0`, `pointerId !== null`) before proceeding.
- **Return null or safe defaults** for invalid states, don't throw silently.
- **Align with specs**: UI text and component behavior must match test expectations and documentation.

