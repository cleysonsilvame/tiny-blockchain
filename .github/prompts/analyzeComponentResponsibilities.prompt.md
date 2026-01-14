---
name: analyzeComponentResponsibilities
description: Analyze component responsibilities and refactor for single responsibility principle
argument-hint: component file path or name
---

You are analyzing a component that may have too many responsibilities. Follow this systematic approach:

## Step 1: Research Current State
- Read the component file to identify all responsibilities
- Check if there are existing services that handle similar concerns
- Examine the template to understand which state is actually used
- Search the codebase to determine if any logic is shared across components

## Step 2: Categorize Responsibilities
For each responsibility, identify:
- **Primary role**: Is this the component's main purpose? (e.g., layout orchestration, data presentation)
- **Shared concern**: Is this logic used by multiple components?
- **Complexity**: Is this logic simple (<5 lines) or complex?
- **Coupling**: Is this tightly coupled to the component's template/DOM?

## Step 3: Decision Framework
**Extract to Service when:**
- Logic is shared across multiple components
- Logic is complex and benefits from isolated testing
- Logic represents a domain concern (e.g., business rules, API calls)
- State needs to persist across component instances or route changes

**Keep in Component when:**
- Logic is only used in this component
- Logic is simple and directly tied to template rendering
- Logic is presentation-specific (e.g., local UI state, animations)
- Extraction would be premature abstraction (YAGNI principle)

## Step 4: Apply Improvements
For logic staying in component:
1. Remove unused computed values or methods
2. Group related concerns together
3. Extract repeated types to type files
4. Replace inefficient patterns (e.g., HostListener → RxJS, manual updates → computed)
5. Avoid comments by using clear naming and structure

For logic moving to service:
1. Create injectable service following project patterns
2. Use signals/computed for reactive state
3. Export methods for mutations
4. Inject service in components via `inject()`

## Step 5: Validate
- Ensure template still functions correctly
- Check that no responsibilities were missed
- Verify performance improvements (e.g., debouncing, computed reactivity)
- Confirm code follows project conventions

**Output**: Provide analysis summary with specific recommendations and implement the refactoring if confirmed.
