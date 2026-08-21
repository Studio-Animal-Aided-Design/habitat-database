# Editorial UI system

The public application uses one small editorial system rather than page-specific visual patterns. Management screens remain deliberately separate under the `.management` namespace.

## Foundations

- **Colour:** semantic CSS tokens distinguish text, muted text, brand surfaces, accent, borders and focus. Components must use tokens instead of introducing one-off hex colours.
- **Type:** `--font-editorial` is used for expressive headings and scientific names; `--font-interface` is used for navigation, labels, controls and body copy.
- **Space and shape:** `--space-*`, `--radius-*`, `--shadow-*` and `--content-*` tokens provide the shared rhythm. Public cards and sections use the same corner and border language.
- **Motion:** motion supports orientation and reveal only. Every animation has a `prefers-reduced-motion` fallback.
- **Focus:** all keyboard-operable elements receive a visible orange focus ring. Search and filter groups also expose `:focus-within` state.

## Reusable primitives

`src/components/editorial-primitives.tsx` contains the public building blocks:

- `EditorialEyebrow` for short navigational labels;
- `EditorialSectionHeading` for section hierarchy, optional explanatory copy and an action;
- `EditorialActionLink` with primary, outline and text variants;
- `EditorialEmptyState` for filtered, sparse or unavailable collections;
- `EditorialFactList` for label/value facts using semantic description-list markup;
- `EditorialSourceNote` for attribution and literature notes.

Prefer these primitives whenever a pattern appears on more than one route. Entity-specific components may compose them, but should not reproduce their typography, focus or spacing rules.

## Content and responsive rules

- German labels may wrap; headings and buttons must not rely on fixed text widths.
- Missing images use an intentional entity illustration or neutral surface, never an empty broken frame.
- Missing relationships use a neutral empty state and must not mention mock data or migration internals.
- At narrow widths, section actions move below their headings and catalogue cards become a single column.
- The supported narrow reference width is 390 px. Touch targets remain at least 44 px where the component is an important action.

## Homepage featured-content policy

Featured content is deterministic without adding a premature editorial-curation schema:

1. only published records are eligible;
2. `src/lib/catalog/featured-content.ts` defines an explicit ordered slug list for each entity type;
3. missing preferred records are skipped rather than failing the page;
4. remaining positions are filled by published records ordered by stable slug;
5. the mock adapter applies the same selection function as PostgreSQL.

The preferred slug lists are a temporary code-owned editorial choice. Move them into managed content only when the management workflow includes preview, publication and audit behavior.

## Boundary with management UI

Public primitives use the `editorial-*` namespace. Management components use the existing `management-*` namespace and may share low-level colour tokens only. Editorial typography, cards and motion must not leak into authenticated work screens.
