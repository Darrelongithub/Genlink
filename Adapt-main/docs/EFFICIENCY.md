# Model efficiency: what is merged, cached and routed

This file is **generated from the code** and checked by the suite:
`tests/test_ai_efficiency.py::test_the_docs_carry_the_same_table_the_code_does`
fails if a static head or a task is missing here, or if the number of static heads
is stated wrongly. Editing this prose by hand is fine; leaving out a row is not.

Three optimisations, each checkable rather than claimed:

1. **Fewer calls.** Questions that need the same reading of the same text are merged
   into one prompt that answers all of them in one JSON object.
2. **Cheaper calls.** The static head of a prompt (instructions, rubric, catalogue) is
   registered once as a cached prefix and referenced afterwards, instead of being
   resent on every request.
3. **The right model.** Every task belongs to a *class of work* -- `light`,
   `standard` or `deep` -- and each class resolves to a model name from configuration.

There are **10** static heads. Each one is non-empty, unique, larger than
the per-request tail it accompanies, identical for every learner, and asserted to
carry no learner text:

| static head | used by |
|---|---|
| `curator` | resource curation (`ai2_curate`) |
| `feedback` | answer feedback (`ai2_feedback`) |
| `grader` | teach-back grading (`ai2_teachback`) |
| `narrator` | scene narration (`ai3_narrate`) |
| `placement` | diagnostic placement (`subject_placement`) |
| `practice_author` | practice item authoring (`ai2_generate_practice`) |
| `proposer` | AI 1 proposal prose (`ai1_propose`) |
| `retention` | retention check design (`ai1_retention_check`) |
| `scene_author` | scene authoring and its repair (`ai2_scene_spec`, `ai2_scene_fix`) |
| `tutor` | the tutor's explanation (`ai2_explain`) |

## Routing table

`ADAPT_GEMINI_MODEL_<TIER>` says what a class *is* on a deployment;
`ADAPT_GEMINI_TASK_MODELS` can pin one task. Nothing else chooses a model.

| class | meaning | tasks |
|---|---|---|
| `light` | cheap, checked against a rule or a list; a failure nobody sees | `ai1_check_in`, `ai1_retention_check`, `ai2_curate`, `ai2_feedback`, `ai3_narrate`, `console_connection_test`, `content_item_verifier`, `curriculum_merge`, `subject_leanings`, `subject_placement`, `topic_resolve` |
| `standard` | the teaching default | `ai2_explain`, `ai2_scene_fix`, `ai2_teachback`, `ai3_explain_wrong`, `ai3_lesson_plan`, `ai3_reteach` |
| `deep` | reasoning-heavy; a weak answer costs a learner a rewrite | `ai1_propose`, `ai2_generate_practice`, `ai2_scene_spec`, `content_items`, `content_skeleton`, `test_plan` |

All 23 tasks, in table order: `ai1_propose`, `ai1_retention_check`, `ai1_check_in`, `curriculum_merge`, `ai2_explain`, `ai2_teachback`, `ai2_feedback`, `ai2_generate_practice`, `test_plan`, `ai2_curate`, `ai2_scene_spec`, `ai2_scene_fix`, `content_skeleton`, `content_items`, `content_item_verifier`, `ai3_narrate`, `ai3_lesson_plan`, `ai3_explain_wrong`, `ai3_reteach`, `subject_placement`, `topic_resolve`, `subject_leanings`, `console_connection_test`.

## Measured cost and the guards that bound it

The numbers below are *ceilings from configuration*, not measurements taken on a
live key in this environment: `adapt status` prints the real per-day counts, and
`GET /api/v1/quotas` reports them for the operator. Statement of what is not
claimed is the point -- see `docs/UNVERIFIED.md` for the same rule applied to the
rest of the build.

| guard | default | where |
|---|---|---|
| daily model calls | 120 | `gemini_daily_call_budget` |
| daily model tokens | 2,000,000 | `gemini_daily_token_budget` |
| minimum spacing between calls | 700 ms | `gemini_min_interval_ms` |
| retries per call | 2 | `gemini_max_retries` |
| request timeout | 45 s | `gemini_timeout_s` |
| provider bucket | 4/min, burst 8 | `DEFAULT_LIMITS['gemini']` |
| static-prefix floor | 1,024 tokens | `gemini_context_cache_min_tokens` |

Token counting is reconciled, not assumed: the provider's `usageMetadata` is used
when present and the local estimate when it is not, the daily reservation is
settled against the reported counts, and a failed call settles to zero rather than
spending a phantom call. A cached prefix shows up as `cached_tokens` -- a saving,
not a cost.

## Credits are not tokens

`adapt/credits/` meters **Adapt Credits** (integers, customer-facing, priced by a
plan) and nothing else. Provider tokens are metered separately in `llm_calls`.
No code converts one into the other: a token count is an operator's cost
diagnostic, and a credit is what the institution bought.
