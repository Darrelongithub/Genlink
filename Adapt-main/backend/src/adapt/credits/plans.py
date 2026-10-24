"""Plan configuration: where commercial terms live, and how they get into the database.

The rule this module exists to enforce is narrow and load-bearing:

* no KSh figure, plan name or per-action price appears in the adaptive-learning code;
* plans arrive as **configuration** (a JSON document an operator can edit) or through an
  operator API call, and are stored as rows;
* every credit quantity is an ``int``. A float in this file is a configuration error, not
  a number to be coerced -- ``1.5`` credits is how a ledger starts rounding, and the
  ledger is exactly the place where a rounding error becomes a dispute.

The shipped example file (``backend/config/credit_plans.example.json``) carries **no
prices at all**: ``currency`` and ``list_price_minor`` are absent, which is the honest
state before an operator has typed their commercial terms. Included credits and action
costs are there because the demo has to meter something; they are plan data, not truth.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

log = logging.getLogger("adapt.credits.plans")

#: The actions the engine can meter. Adding one here is the only way an action can be
#: charged: a plan that names an unknown action is rejected when it is loaded, so a typo
#: in configuration cannot silently start billing somebody for nothing.
ACTIONS: dict[str, dict[str, str]] = {
    "explain": {
        "label": "Adapt a concept",
        "detail": "A fresh explanation built from the learner's current evidence",
    },
    "generate_check": {
        "label": "Generate a check",
        "detail": "A short, targeted understanding check written for this learner",
    },
    "personalised_lesson": {
        "label": "Personalised lesson",
        "detail": "A complete lesson adapted for this learner",
    },
    "full_assessment": {
        "label": "Full assessment",
        "detail": "Diagnosis, grading and an updated learner state",
    },
}

#: Actions that are never billable by design. Standard notes, existing quizzes, stored
#: lessons, exports and deletion cost nothing and must keep working when a wallet is
#: empty -- that is the promise the console makes in the "When adapted credits reach
#: zero" panel, and it is enforced where those routes live, not by a price of zero.
FREE_ACTIONS: frozenset[str] = frozenset(
    {"notes", "existing_materials", "export", "delete", "review", "attempt"}
)

PERIODS = {"month", "quarter", "annual"}


class PlanConfigError(ValueError):
    """A plan document that cannot be trusted to price anything."""


@dataclass(frozen=True)
class PlanSpec:
    slug: str
    name: str
    included_credits: int
    period: str
    action_costs: dict[str, int]
    learner_limit: int = 0
    allow_negative: bool = False
    currency: str | None = None
    list_price_minor: int | None = None
    active: bool = True
    version: int = 1
    extra: dict[str, Any] = field(default_factory=dict, repr=False)

    def as_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "included_credits": self.included_credits,
            "period": self.period,
            "action_costs": dict(sorted(self.action_costs.items())),
            "learner_limit": self.learner_limit,
            "allow_negative": self.allow_negative,
            "currency": self.currency,
            "list_price_minor": self.list_price_minor,
            "active": self.active,
            "version": self.version,
        }


def _int(value: Any, *, where: str, minimum: int = 0, default: int | None = None) -> int:
    """Parse an integer quantity, refusing everything that is not one.

    ``bool`` is an ``int`` in Python and a JSON ``true`` is how a typo in a plan turns
    into "1 credit". ``float`` is refused even when it is ``2.0``: the point is that the
    file cannot contain money-shaped decimals anywhere, so nobody has to reason about
    where they are rounded.
    """
    if value is None and default is not None:
        return default
    if isinstance(value, bool) or not isinstance(value, int):
        raise PlanConfigError(f"{where}: expected an integer, got {type(value).__name__}")
    if value < minimum:
        raise PlanConfigError(f"{where}: must be >= {minimum}, got {value}")
    return value


def parse_plan(raw: Any, *, where: str = "plan") -> PlanSpec:
    if not isinstance(raw, dict):
        raise PlanConfigError(f"{where}: a plan must be an object")
    slug = str(raw.get("slug") or "").strip().lower()
    if not slug or len(slug) > 48 or not slug.replace("-", "").replace("_", "").isalnum():
        raise PlanConfigError(f"{where}: slug must be 1-48 letters, digits, '-' or '_'")
    name = str(raw.get("name") or slug).strip()[:120]
    period = str(raw.get("period") or "annual").strip().lower()
    if period not in PERIODS:
        raise PlanConfigError(f"{where}: period must be one of {sorted(PERIODS)}")
    costs_raw = raw.get("action_costs") or {}
    if not isinstance(costs_raw, dict):
        raise PlanConfigError(f"{where}: action_costs must be an object")
    unknown = sorted(set(costs_raw) - set(ACTIONS))
    if unknown:
        raise PlanConfigError(
            f"{where}: unknown action(s) {unknown}; known actions are {sorted(ACTIONS)}"
        )
    costs = {str(k): _int(v, where=f"{where}.action_costs.{k}") for k, v in costs_raw.items()}
    currency = raw.get("currency")
    if currency is not None:
        currency = str(currency).strip().upper()
        if len(currency) != 3 or not currency.isalpha():
            raise PlanConfigError(f"{where}: currency must be a 3-letter ISO-4217 code")
    price = raw.get("list_price_minor")
    price = None if price is None else _int(price, where=f"{where}.list_price_minor")
    return PlanSpec(
        slug=slug,
        name=name,
        included_credits=_int(
            raw.get("included_credits"), where=f"{where}.included_credits", default=0
        ),
        period=period,
        action_costs=costs,
        learner_limit=_int(raw.get("learner_limit"), where=f"{where}.learner_limit", default=0),
        allow_negative=bool(raw.get("allow_negative", False)),
        currency=currency,
        list_price_minor=price,
        active=bool(raw.get("active", True)),
        version=_int(raw.get("version"), where=f"{where}.version", minimum=1, default=1),
    )


def load_plan_config(path: Path) -> list[PlanSpec]:
    """Read and validate a plan document. Raises rather than guessing."""
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError as exc:
        raise PlanConfigError(f"cannot read plan config {path}: {exc.strerror}") from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise PlanConfigError(f"{path} is not valid JSON: {exc.msg} (line {exc.lineno})") from exc
    plans_raw = data.get("plans") if isinstance(data, dict) else data
    if not isinstance(plans_raw, list) or not plans_raw:
        raise PlanConfigError(f"{path}: expected a non-empty 'plans' list")
    plans = [parse_plan(item, where=f"{path.name}.plans[{i}]") for i, item in enumerate(plans_raw)]
    slugs = [p.slug for p in plans]
    duplicates = sorted({s for s in slugs if slugs.count(s) > 1})
    if duplicates:
        raise PlanConfigError(f"{path}: duplicate plan slug(s) {duplicates}")
    return plans


def default_config_path() -> Path:
    """``backend/config/credit_plans.example.json`` resolved from the source tree.

    Deliberately ``example`` in the name: an operator copies it, edits it, and points
    ``ADAPT_CREDIT_PLANS_PATH`` at the copy. Seeding from the example is the documented
    default so a fresh clone has metering that works out of the box; nothing in the file
    claims to be a commercial offer.
    """
    return Path(__file__).resolve().parents[3] / "config" / "credit_plans.example.json"


__all__ = [
    "ACTIONS",
    "FREE_ACTIONS",
    "PERIODS",
    "PlanConfigError",
    "PlanSpec",
    "default_config_path",
    "load_plan_config",
    "parse_plan",
]
