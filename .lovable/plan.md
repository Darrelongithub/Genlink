# Turn 2 — Pillar realignment + Fixes 2–5

Before I touch code I want you to sign off on **exactly** how the pillars map, because it drives a data migration that renames pillar ids everywhere (units, enrollments, assessment_results, pillar_enrollments, session_blocks). Getting the ID mapping wrong will orphan real learner progress.

## Part A — Pillar realignment

### ID mapping (old → new)

| # | New pillar (canonical) | New id | Old id being renamed | Notes |
|---|---|---|---|---|
| 1 | Personal Mastery & Mind Renewal | `personal-mastery` | `leadership-development` | Leadership/personal-dev folds in here |
| 2 | Financial Intelligence & Income Systems | `financial-intelligence` | `financial-intelligence` + `entrepreneurship-innovation` | Entrepreneurship units re-parented into Financial |
| 3 | Digital Literacy & Productivity Systems | `digital-literacy` | `digital-skills` | Rename only |
| 4 | Cybersecurity & Digital Protection | `cybersecurity` | `communication-networking` | Repurposed — existing units re-themed as cyber content (kept, not deleted, so learner progress survives) |
| 5 | Programming & Intelligent Systems | `programming-systems` | *(none — new)* | Empty pillar seeded with 7 placeholder units so the shell renders |
| 6 | Creator Economy & Digital Monetisation | `creator-economy` | `creator-economy` | Order change only |
| 7 | Civic Leadership & Governance | `civic-leadership` | `civic-leadership` | Order change only |

Two things I want you to confirm before I run the migration:

1. **`communication-networking` → `cybersecurity`**: existing units keep their UUIDs and learner progress, but the pillar label + theme becomes Cybersecurity. Their titles will still read like comms/networking content until you author cyber material. OK?
2. **Programming pillar has no existing content** — I'll create the pillar shell + 7 empty units (5 sessions each, all `is_locked_by_default=true`) so the routes work. No fake session content will be seeded.

### What the migration does (one SQL migration)

- `UPDATE units SET pillar_id = 'personal-mastery' WHERE pillar_id = 'leadership-development'`
- `UPDATE units SET pillar_id = 'financial-intelligence' WHERE pillar_id = 'entrepreneurship-innovation'` (re-parents entrepreneurship units into Financial; order_index reflowed to append after existing Financial units)
- `UPDATE units SET pillar_id = 'digital-literacy' WHERE pillar_id = 'digital-skills'`
- `UPDATE units SET pillar_id = 'cybersecurity' WHERE pillar_id = 'communication-networking'`
- Same renames on `enrollments.course_id`, `assessment_results` recommended-pillar columns, any `session_blocks` pillar refs, and the `pillar_theme` enum (add `personal-mastery`, `digital-literacy` if missing; keep old enum values around temporarily to satisfy existing rows during the rename).
- Insert Programming pillar shell (7 units).

### Frontend changes

- Rewrite pillar list + order in `src/data/courses.ts` to the canonical 7 with new ids, colours, taglines, glyphs.
- Update `src/lib/motion/pillarThemes.ts` colour/glyph map to the exact palette you specified (purple ▲, gold coin, blue </>, teal shield, emerald { }, coral ▶, navy-gold ⚖).
- Update `src/components/journey/PillarLandmark.tsx` icon set + `ProgressMap.tsx` order.
- Update `PillarHeader.tsx` theme keys + `pillarThemes` const.
- Update assessment recommendation logic in `src/lib/pathwayProfile.ts` and `src/data/pathwayIntelligence.ts` to map onto new ids.

## Part B — Fixes 2–5

**Fix 2 — Dead quick-quiz cards**
`src/components/QuickQuiz.tsx` recommendation cards become `<Link to={\`/pillar/\${pillarId}\`}>` and gain a hover state. Same audit sweep across `TrendingPicks`, `WhySection`, `Hero` CTAs — any dead button gets a route or is removed.

**Fix 3 — One funnel**
- QuickQuiz result screen gains a primary "Take the full Pathway Assessment for your personalised plan →" button routing to `/pathway-intelligence`.
- Copy on both entry points clarifies which is which (quick teaser vs full diagnostic).

**Fix 4 — Remove "Learning Paths" as navigation**
- Delete Learning Paths section + compare-paths UI from `PillarDetail.tsx`.
- The pillar page shows only: header → 7 units in sequence → "Bonus & Deep Dives" strip at the bottom (already exists as `specializedUnits`, just made visually secondary).
- Remove `/learning-paths` and `/path/:pillarId/:pathId` from top-level nav. Keep routes alive (redirect to pillar) to avoid breaking bookmarks.

**Fix 5 — Optional calibration card**
- New `PillarCalibrationCard` component shown at the top of a pillar's learning view when the learner has no `pillar_calibration` row for that pillar.
- 3 questions max, dismissible. Result stored in a lightweight `pillar_calibrations` table (`user_id`, `pillar_id`, `recommended_unit_id`, `dismissed_at`).
- On completion, one unit gets a gold "Recommended start" badge. On skip/dismiss, row inserted with `dismissed_at` so it never returns.
- Never gates content — units remain clickable throughout.

## Not in this turn (turn 3)

`learning_plans` table + generation, `/my-plan`, "Continue Learning" card, off-plan banner, auto-advance, `/learner-insights` admin dashboard, full end-to-end browser verification. Confirmed per your split.

## Confirm before I run

1. `communication-networking` units keep their UUIDs and become Cybersecurity — OK, or do you want them deleted and rebuilt from scratch?
2. Programming pillar shell with 7 empty units — OK?
3. Any users currently enrolled in old ids (`leadership-development`, `entrepreneurship-innovation`, `digital-skills`, `communication-networking`) will find their enrollments still valid under the new pillar ids — OK?

Reply "go" (with any tweaks) and I run the migration + all frontend changes in the next turn.
