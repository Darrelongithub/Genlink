# The Genlink ↔ Adapt integration contract (frozen 2026-10-23)

These files are the *contract*, not the implementation. `request.schema.json` and
`response.schema.json` are ordinary draft-07 JSON so a caller written in TypeScript,
Python or anything else can generate types from them. `validate.py` implements only the
keywords those two schemas use; it is dependency-free on purpose, and it raises on a
schema keyword it does not understand rather than quietly accepting a bad document.

Fixtures:

| File | Purpose |
| --- | --- |
| `valid_request.json` | The smallest realistic Genlink-shaped call. Its response was captured into `captured_response.json` from the real FastAPI app (only `request_id` and `elapsed_ms` normalised). Tests replay the request and compare `adapted_content` byte-for-byte. |
| `captured_response.json` | A real 200 response from `POST /api/v1/integration/adapt`. It is evidence, not a mock. |
| `malformed_requests.json` | Requests that MUST be refused, with the exact status and error key expected. `activity: "TOO_MANY"` is expanded to 501 events by the harness. |
| `standard_content_fallback.json` | The un-adapted material a caller serves when Adapt cannot answer. Explicitly labelled `adapted: false`. |

`reference_client.py` and `test_reference_client.py` sit one directory up. They are a
**test-only reference caller**: they document timeout, bounded retry, duplicate-key and
fallback behaviour for whoever wires Genlink to Adapt. They are not a shipped Genlink
integration, and no browser code imports them.

Contract facts that are easy to misread:

* The route is `POST /api/v1/integration/adapt` on the Adapt API. It is stateless: no
  cookie, no DB read/write, no learner account. `learner.id` is opaque and echoed.
* There is **no institution identifier** in the request schema. An `institution_id`
  sent by a caller is ignored, not validated and not stored. Any institution scoping
  therefore has to be enforced by the caller or by a future explicit contract change.
* Auth is open unless the operator exports `ADAPT_INTEGRATION_TOKEN`; then a bearer
  token or `X-Adapt-Integration-Token` is required. On a public tunnel with a demo
  passphrase, `X-ADAPT-Demo-Passphrase` is honoured instead.
* The route never calls an AI model. `engine.local_only` is `true` by construction, so
  provider outage, missing key and retired model ID cannot fail this call. Callers must
  still handle Adapt being down at the HTTP level.
* No Adapt Credits are debited by this route. The credit rules in the `/engine` console
  are presentation-only examples (see `RELEASE_READINESS.md`).
