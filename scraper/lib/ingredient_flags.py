"""Match dining-hall ingredient text against the local flag datasets.

The datasets under ``scraper/data/ingredient-flags/`` are derived files.
``scan_ingredients`` does not use the network.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "ingredient-flags"

_CONCERN_RANK = {"high": 3, "moderate": 2, "low": 1, "unknown": 0}

# E250, E-250, E 250, E150c, E170ii, E170(ii), E440a(ii), E14XX.
# Digits must not continue into a longer number (E250 does not match E2500).
_E_NUMBER_RE = re.compile(
    r"(?<![A-Za-z0-9])"
    r"[eE](?:\s*[-–—]?\s*)(\d{2,4})([A-Za-z]{1,5})?"
    r"(?:\s*\(\s*([ivxIVX]{1,5})\s*\))?"
    r"(?!\s*(?:mg|mcg|µg|ug|iu|kcal|ml)\b)"
    r"(?![A-Za-z0-9])"
)

_INDEX = None


def normalize_ingredient_phrase(text: str) -> str:
    """Lowercase phrase with punctuation folded the same way names are stored."""
    normalized, _, _ = _normalize_with_spans(text or "")
    return normalized


def scan_ingredients(text: str) -> list[dict]:
    """Return non-overlapping ingredient hits, ordered by start index.

    Name matching is case-insensitive and uses word boundaries, so a short
    name does not fire inside a longer token. E-numbers match ``E250``,
    ``E-250``, ``E 250``, and ``e250``, including letter and roman suffixes.
    When several entries cover the same span, the longest name wins.
    """
    if text is None:
        return []
    if not isinstance(text, str):
        raise TypeError("scan_ingredients expects a string")
    if not text.strip():
        return []

    index = _load_index()
    normalized, starts, ends = _normalize_with_spans(text)
    hits = []

    if normalized:
        for pattern, entry, name in index["names"]:
            for match in pattern.finditer(normalized):
                start, end = _span(match.start(), match.end(), starts, ends)
                hits.append(
                    _hit(entry, name=name, matched=text[start:end], start=start, end=end)
                )

    for match in _E_NUMBER_RE.finditer(text):
        key = f"{match.group(1)}{(match.group(2) or '').lower()}{(match.group(3) or '').lower()}"
        entry = index["by_ekey"].get(key)
        if entry is None:
            continue
        hits.append(
            _hit(
                entry,
                name=entry["e_number"],
                matched=text[match.start() : match.end()],
                start=match.start(),
                end=match.end(),
            )
        )

    kept = _resolve_overlaps(hits)
    kept.sort(key=lambda item: (item["start"], item["end"], item["id"], item["name"]))
    return kept


def _hit(entry: dict, name: str, matched: str, start: int, end: int) -> dict:
    return {
        "id": entry["id"],
        "kind": entry["kind"],
        "name": name,
        "matched": matched,
        "start": start,
        "end": end,
        "flags": list(entry.get("flags") or []),
        "concern": entry.get("concern") or "unknown",
        "concern_reasons": list(entry.get("concern_reasons") or []),
        "classes": list(entry.get("classes") or []),
        "_span": end - start,
        "_ekey_len": len(entry.get("e_number") or ""),
    }


def _resolve_overlaps(hits: list[dict]) -> list[dict]:
    ordered = sorted(
        hits,
        key=lambda item: (
            -item["_span"],
            -_CONCERN_RANK.get(item["concern"], 0),
            -item["_ekey_len"],
            item["start"],
            item["id"],
            item["name"],
        ),
    )
    accepted = []
    for hit in ordered:
        if any(hit["start"] < kept["end"] and kept["start"] < hit["end"] for kept in accepted):
            continue
        accepted.append(hit)
    for hit in accepted:
        hit.pop("_span", None)
        hit.pop("_ekey_len", None)
    return accepted


def _span(norm_start: int, norm_end: int, starts: list[int], ends: list[int]) -> tuple[int, int]:
    return starts[norm_start], ends[norm_end - 1]


def _normalize_with_spans(text: str) -> tuple[str, list[int], list[int]]:
    chars: list[str] = []
    starts: list[int] = []
    ends: list[int] = []

    def emit(value: str, start: int, end: int) -> None:
        for char in value:
            if char == " " and chars and chars[-1] == " ":
                ends[-1] = end
                continue
            chars.append(char)
            starts.append(start)
            ends.append(end)

    index = 0
    length = len(text)
    while index < length:
        char = text[index]
        if char == "&":
            emit(" and ", index, index + 1)
            index += 1
            continue
        folded = _fold_char(char)
        if folded and all(piece.isalnum() for piece in folded):
            emit(folded, index, index + 1)
            index += 1
            continue
        next_index = index + 1
        while next_index < length and text[next_index] != "&":
            nxt = _fold_char(text[next_index])
            if nxt and all(piece.isalnum() for piece in nxt):
                break
            next_index += 1
        if chars and chars[-1] != " ":
            emit(" ", index, next_index)
        elif chars:
            ends[-1] = next_index
        index = next_index

    while chars and chars[0] == " ":
        chars.pop(0)
        starts.pop(0)
        ends.pop(0)
    while chars and chars[-1] == " ":
        chars.pop()
        starts.pop()
        ends.pop()
    return "".join(chars), starts, ends


def _fold_char(char: str) -> str:
    decomposed = unicodedata.normalize("NFKD", char)
    return "".join(piece for piece in decomposed if not unicodedata.combining(piece)).lower()


def _load_index() -> dict:
    global _INDEX
    if _INDEX is None:
        _INDEX = _build_index()
    return _INDEX


def _build_index() -> dict:
    additives = _read_json("additives.json")
    watch = _read_json("ingredient-watch.json")
    entries = list(additives.get("entries") or []) + list(watch.get("entries") or [])
    names = []
    by_ekey = {}
    for entry in entries:
        e_number = entry.get("e_number")
        if e_number:
            key = _ekey(e_number)
            if key and key not in by_ekey:
                by_ekey[key] = entry
        for name in entry.get("names") or []:
            phrase = normalize_ingredient_phrase(name)
            if not phrase:
                continue
            pattern = _phrase_pattern(phrase)
            names.append((pattern, entry, phrase))
    return {"names": names, "by_ekey": by_ekey}


def _phrase_pattern(phrase: str) -> re.Pattern:
    tokens = [re.escape(token) for token in phrase.split()]
    body = r"\s+".join(tokens)
    return re.compile(rf"(?<![a-z0-9]){body}(?![a-z0-9])")


def _ekey(e_number: str) -> str:
    match = re.fullmatch(r"E(\d+)([A-Za-z]+)?", e_number or "")
    if not match:
        return ""
    return f"{match.group(1)}{(match.group(2) or '').lower()}"


def _read_json(filename: str) -> dict:
    path = _DATA_DIR / filename
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)
