# Efficiency: fewer calls, cheaper calls, the right model

Generated from `adapt.ai.static_context`, `adapt.ai.routing` and
`adapt.security.ratelimit` by `scripts/write_efficiency_doc.py` on 2026-10-23.
The backend suite asserts that every name below stays in this file.

**Honesty boundary.** These are the *configured* ceilings and the *estimated* size of
static prompt heads (`estimate_tokens`, a character-based estimate, not a provider
bill). No live provider latency, token spend or cost has been measured on this build:
no Gemini key has ever been configured here. Measured local-call timings are recorded
in `RELEASE_READINESS.md` and are labelled with what exactly was measured.

## Static prompt heads: 10

Each head is identical for every learner and must never carry learner text. A head
large enough to be worth caching is reused across calls; the tail stays per request.

| head | chars | estimated tokens |
| --- | ---: | ---: |
| `curator` | 709 | 196 |
| `feedback` | 2718 | 755 |
| `grader` | 1233 | 342 |
| `narrator` | 2688 | 746 |
| `placement` | 5042 | 1400 |
| `practice_author` | 3299 | 916 |
| `proposer` | 2480 | 688 |
| `retention` | 636 | 176 |
| `scene_author` | 4339 | 1205 |
| `tutor` | 2864 | 795 |

The estimator in use is `estimate_tokens`; sanity value for a 40-character string: 11 estimated token(s).

## Task routing: 23 registered purposes

| purpose | class | one call | joins | shared static head | why |
| --- | --- | :---: | --- | :---: | --- |
| `ai1_check_in` | light | yes | — | yes | phrases a 10-second check-in from the learner's tiles and practice numbers code already computed; every field is re-validated against fixed enums and the action is re-derived by a code rule, so a wrong answer is a replaced field |
| `ai1_propose` | deep | yes | — | yes | writes a proposal about a learner's own learning, in five parts, with a hedged hypothesis and a rival explanation: the wording is the product and a bad one is read as a diagnosis |
| `ai1_retention_check` | light | yes | — | yes | one question plus a rationale about a topic the learner already passed; the question is shown for approval and the schedule is decided by code |
| `ai2_curate` | light | yes | — | yes | picks from search results it was handed; a pick whose URL was not in the input is refused |
| `ai2_explain` | standard | yes | — | yes | the teaching reply itself; every sentence is checked against the grounded local answer before it is used, so the model extends rather than replaces it |
| `ai2_feedback` | light | yes | — | yes | two or three sentences over a grade that rules already computed |
| `ai2_generate_practice` | deep | yes | — | yes | writes new questions; each one is held to the item contract and calibrated or retired from real answers afterwards |
| `ai2_scene_fix` | standard | yes | — | yes | the one retry, with the validator's reasons in the prompt; a repair pass, not a rewrite from nothing |
| `ai2_scene_spec` | deep | yes | — | yes | authors a scene specification for a simulation the server already implements; the validator decides whether it may be shown |
| `ai2_teachback` | standard | yes | — | yes | second-opinion checklist judgement over a learner's explanation; quotes must be verbatim or the rule grader stands |
| `ai3_explain_wrong` | standard | yes | — | yes | a misconception-specific reply to an answer the learner already gave; it is checked against that item's key and matched misconception before it is shown, and the deterministic misconception reply stands when it is refused |
| `ai3_lesson_plan` | standard | yes | — | yes | authors a whole lesson plan against the frozen Pack; the proposal is only shown after strict whole-plan validation (block contract, cited facts, length budgets, no answer leakage) and any rejection falls back to the deterministic lesson, so the wording is the product but never unchecked |
| `ai3_narrate` | light | yes | — | yes | three sentences about frames a simulation already produced, using its numbers; the deterministic path is checked first and this only fills the gap |
| `ai3_reteach` | standard | yes | — | yes | re-teaches one concept by a method code chose (simpler words, smaller step, example or visual) with the attempts so far as context; validated like the lesson plan, with the deterministic re-teach as the fallback |
| `console_connection_test` | light | yes | — | no | the operator's one-word connectivity probe; shares no context with anything |
| `content_item_verifier` | light | yes | — | yes | independently re-answers one item from the skeleton's facts alone; a verdict that disagrees with the declared key rejects the item, so being wrong is safe |
| `content_items` | deep | yes | — | yes | writes one concept's matched A/B practice pair with graded hints and misconception-tied distractors; an item reaches a learner only after computational re-checking or an independent verifier pass, never on the author's word |
| `content_skeleton` | deep | yes | — | yes | authors a topic's knowledge skeleton (concepts, prerequisites, key facts, misconceptions); every field is schema- and code-validated (acyclic graph, bounded text, real fact references) and a rejected skeleton falls back to an authored or simple pack |
| `curriculum_merge` | light | yes | — | yes | trims and orders a scanned syllabus objective list (or proposes one when no source answered); code owns provenance, so anything the model adds is marked suggested and can never be labelled as coming from a syllabus |
| `subject_leanings` | light | yes | — | yes | numbers about a topic against a fixed skill list, clamped and rejected when degenerate |
| `subject_placement` | light | yes | `topic_resolve`, `subject_leanings` | yes | ONE call that both places free text in a subject family and rates that family's skills: two decisions that need the same reading of the same words |
| `test_plan` | deep | yes | — | yes | authors a starting-check plan of interactive items; every item is validated against the local registry and dropped if it does not fit, so the plan is a proposal the code has the final word on |
| `topic_resolve` | light | yes | — | yes | places free text into one of five families; code holds the decision, so a wrong family is a fallback rather than a wrong answer |

Class meanings: **light** — checked against a fixed list or a rule; cheap to redo, safe to lose; **standard** — teaching and judgement, where the wording is the product; **deep** — open-ended authoring, where a weak answer costs a rewrite.

A join is two decisions that need the same reading of the same words. It is one call,
never an extra call. `subject_placement` joins `topic_resolve` and `subject_leanings`;
the separate purposes still exist for callers that need only one half.

## Per-minute ceilings actually configured

| scope | rate/min | burst |
| --- | ---: | ---: |
| `arxiv` | 20 | 2 |
| `auth_fail` | 5 | 5 |
| `baseline_trial` | 240 | 360 |
| `gemini` | 4 | 8 |
| `guest_create` | 6 | 6 |
| `ip` | 120 | 240 |
| `lesson_author` | 4 | 6 |
| `lesson_explain` | 12 | 20 |
| `lesson_play` | 60 | 120 |
| `lesson_predict` | 40 | 80 |
| `llm` | 8 | 12 |
| `mutation` | 90 | 180 |
| `numbas_export` | 6 | 10 |
| `openalex` | 50 | 100 |
| `openlibrary` | 8 | 20 |
| `voice_frame` | 6000 | 12000 |
| `ws_control` | 60 | 12 |
| `ws_turn` | 20 | 6 |
| `youtube` | 6 | 10 |

These are guards, not measurements of throughput. A load test's measured p50/p95 and
error counts live in `RELEASE_READINESS.md`; a table of ceilings is not evidence that
the service sustained them.
