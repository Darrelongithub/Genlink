"""A small, dependency-free JSON Schema validator for the integration contract.

Why not ``jsonschema``: the release gate has to run on a machine with only the
backend's declared dependencies and the standard library. Adding an unversioned
package to a release gate is how a gate becomes flaky for reasons that have
nothing to do with the contract. This module implements exactly the draft-07
keywords the two contract schemas use, and *refuses* a schema keyword it does not
implement instead of silently passing a document it never checked.

Schemas live beside this file as ordinary JSON, so a caller in another language
can read the same contract without importing Python.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent

IMPLEMENTED = {
    "$schema", "title", "description", "type", "required", "properties",
    "items", "additionalProperties", "enum", "const", "minimum", "maximum",
    "minLength", "maxLength", "minItems", "maxItems", "anyOf", "oneOf",
    "pattern", "nullable",
}


class ContractError(AssertionError):
    """The document does not match the contract. The message names the path."""

    def __init__(self, path: str, problem: str) -> None:
        super().__init__(f"{path or '$'}: {problem}")
        self.path = path
        self.problem = problem


_TYPES: dict[str, type | tuple[type, ...]] = {
    "object": dict,
    "array": list,
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "null": type(None),
}


def _is_type(value: Any, name: str) -> bool:
    expected = _TYPES[name]
    if name in ("integer", "number"):
        # bool is an int in Python; a JSON boolean is not a JSON number.
        return isinstance(value, expected) and not isinstance(value, bool)
    return isinstance(value, expected)


def _check_keywords(schema: dict[str, Any]) -> None:
    unknown = set(schema) - IMPLEMENTED
    # Definitions/annotations are deliberately not used by these schemas.
    if unknown:
        raise ContractError("$", f"validator does not implement schema keywords {sorted(unknown)}")


def validate(value: Any, schema: dict[str, Any], path: str = "$") -> None:
    """Raise :class:`ContractError` on the first mismatch; return ``None`` when valid."""
    _check_keywords(schema)

    wanted = schema.get("type")
    if "nullable" in schema and value is None and schema["nullable"] is True:
        return
    if wanted is not None:
        names = wanted if isinstance(wanted, list) else [wanted]
        for name in names:
            if name not in _TYPES:
                raise ContractError(path, f"schema names unknown type {name!r}")
        if not any(_is_type(value, name) for name in names):
            got = type(value).__name__
            raise ContractError(path, f"expected {' or '.join(names)}, got {got}")

    if "const" in schema and value != schema["const"]:
        raise ContractError(path, f"expected constant {schema['const']!r}, got {value!r}")
    if "enum" in schema and value not in schema["enum"]:
        raise ContractError(path, f"value {value!r} is not in the allowed enum")

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            raise ContractError(path, f"string shorter than {schema['minLength']}")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            raise ContractError(path, f"string longer than {schema['maxLength']}")
        if "pattern" in schema:
            import re

            if not re.search(schema["pattern"], value):
                raise ContractError(path, "string does not match the required pattern")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            raise ContractError(path, f"value {value} is below the minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            raise ContractError(path, f"value {value} is above the maximum {schema['maximum']}")

    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                raise ContractError(path, f"missing required key {key!r}")
        props = schema.get("properties", {})
        for key, child in value.items():
            if key in props:
                validate(child, props[key], f"{path}.{key}")
            elif schema.get("additionalProperties") is False:
                raise ContractError(path, f"unexpected key {key!r}")
        for key, subschema in props.items():
            if key in value:
                continue
            if "nullable" not in subschema and "type" in subschema and "const" not in subschema:
                # Optional unless listed in `required`: enforced above.
                continue

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            raise ContractError(path, f"array shorter than {schema['minItems']} item(s)")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            raise ContractError(path, f"array longer than {schema['maxItems']} item(s)")
        item_schema = schema.get("items")
        if item_schema:
            for i, item in enumerate(value):
                validate(item, item_schema, f"{path}[{i}]")

    if "anyOf" in schema:
        errors = []
        for sub in schema["anyOf"]:
            try:
                validate(value, sub, path)
                break
            except ContractError as exc:
                errors.append(str(exc))
        else:
            raise ContractError(path, "matched none of anyOf: " + " | ".join(errors[:3]))

    if "oneOf" in schema:
        matched = 0
        for sub in schema["oneOf"]:
            try:
                validate(value, sub, path)
                matched += 1
            except ContractError:
                continue
        if matched != 1:
            raise ContractError(path, f"matched {matched} of oneOf, expected exactly 1")


def load_schema(name: str) -> dict[str, Any]:
    """Load one of the two frozen schemas by filename."""
    path = HERE / name
    with path.open(encoding="utf-8") as handle:
        schema = json.load(handle)
    if not isinstance(schema, dict):
        raise ValueError(f"{path} does not contain a JSON object")
    return schema


def validate_request(body: Any) -> None:
    validate(body, load_schema("request.schema.json"))


def validate_response(body: Any) -> None:
    validate(body, load_schema("response.schema.json"))


def assert_valid_response(body: Any) -> dict[str, Any]:
    """Used by both the pytest contract suite and the reference caller."""
    validate_response(body)
    return body
