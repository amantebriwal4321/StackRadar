"""The guardrail between the Groq sentiment call and the score.

Every model response passes through validate_sentiment_batch, and the contract
is fail-closed: anything it cannot vouch for is absent from the returned map,
and the caller treats absent as neutral. Until now none of that was tested.
"""

import json

import pytest

from app.services.guardrails import (
    GuardrailReport,
    SentimentVerdict,
    _strip_code_fence,
    traced,
)
from app.services.guardrails import validate_sentiment_batch as validate

# Item 0 and 2 name tracked tools; item 1 names none.
BATCH = [
    {"title": "React 19 is a big step forward"},
    {"title": "Weather forecast for the weekend"},
    {"title": "Docker versus Podman in 2026"},
]

FENCE = "`" * 3


def rows(*pairs):
    return json.dumps([{"i": i, "s": s} for i, s in pairs])


# --- the happy path -----------------------------------------------------------


def test_grounded_verdicts_are_kept():
    got, report = validate(rows((0, "positive"), (2, "negative")), BATCH)
    assert got == {0: "positive", 2: "negative"}
    assert report.accepted == 2
    assert (report.dropped, report.hallucinated_index, report.quarantined) == (0, 0, 0)
    assert report.batch_rejected is False


def test_labels_are_normalised():
    got, _ = validate('[{"i": 0, "s": "  Positive "}]', BATCH)
    assert got == {0: "positive"}


def test_the_alternate_key_names_the_old_parser_accepted_still_work():
    got, _ = validate('[{"index": 0, "sentiment": "negative"}]', BATCH)
    assert got == {0: "negative"}


# --- the whole response is unusable -------------------------------------------


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "not json at all",
        'Sure! Here you go: [{"i": 0, "s": "positive"}]',  # prose, no fence
        '{"i": 0, "s": "positive"}',  # an object, not an array
        "42",
        "null",
        '"positive"',
    ],
)
def test_an_unparseable_or_wrongly_shaped_response_rejects_the_batch(raw):
    got, report = validate(raw, BATCH)
    assert got == {}
    assert report.batch_rejected is True
    assert report.dropped == len(BATCH)


def test_a_code_fence_is_unwrapped():
    raw = f'{FENCE}json\n[{{"i": 0, "s": "positive"}}]\n{FENCE}'
    assert validate(raw, BATCH)[0] == {0: "positive"}


def test_prose_around_a_fence_is_ignored():
    body = '[{"i": 0, "s": "positive"}]'
    raw = f"Here you go:\n{FENCE}json\n{body}\n{FENCE}\nHope that helps!"
    assert validate(raw, BATCH)[0] == {0: "positive"}


def test_a_fence_without_a_language_tag_is_unwrapped():
    assert _strip_code_fence(f"{FENCE}\n[1]\n{FENCE}") == "[1]"


# --- single rows that fail the schema -----------------------------------------


@pytest.mark.parametrize(
    "row",
    [
        {"i": 0, "s": "ecstatic"},  # a label we do not use
        {"i": 0},  # no verdict
        {"s": "positive"},  # no index
        {"i": -1, "s": "positive"},  # negative index
        {"i": "first", "s": "positive"},  # not a number
        {"i": True, "s": "positive"},  # JSON true must not coerce to index 1
        {"i": None, "s": "positive"},
        "positive",  # not an object
        7,
        None,
    ],
)
def test_a_malformed_row_is_dropped_and_the_rest_survive(row):
    raw = json.dumps([row, {"i": 2, "s": "positive"}])
    got, report = validate(raw, BATCH)
    assert got == {2: "positive"}
    assert report.dropped == 1
    assert report.accepted == 1


def test_a_boolean_index_does_not_land_on_a_real_item():
    """`true` coerces to 1 under pydantic's lax int; it must not."""
    got, report = validate('[{"i": true, "s": "negative"}]', BATCH)
    assert got == {}
    assert report.dropped == 1


# --- index check --------------------------------------------------------------


def test_an_index_outside_the_batch_is_discarded_as_hallucinated():
    got, report = validate(
        rows((0, "positive"), (3, "positive"), (99, "negative")), BATCH
    )
    assert got == {0: "positive"}
    assert report.hallucinated_index == 2
    assert report.accepted == 1


# --- grounding check ----------------------------------------------------------


def test_a_strong_verdict_on_a_headline_naming_no_tool_is_forced_neutral():
    got, report = validate(rows((1, "negative")), BATCH)
    assert got == {1: "neutral"}
    assert report.quarantined == 1
    assert report.accepted == 1


def test_a_neutral_verdict_needs_no_grounding():
    got, report = validate(rows((1, "neutral")), BATCH)
    assert got == {1: "neutral"}
    assert report.quarantined == 0


@pytest.mark.parametrize("item", [{}, {"title": ""}, {"title": "(no title)"}])
def test_an_item_with_no_text_cannot_ground_anything(item):
    got, report = validate(rows((0, "positive")), [item])
    assert got == {0: "neutral"}
    assert report.quarantined == 1


# --- repeated indices ---------------------------------------------------------


def test_the_same_verdict_repeated_counts_once():
    got, report = validate(rows((0, "positive"), (0, "positive")), BATCH)
    assert got == {0: "positive"}
    assert report.accepted == 1
    assert report.dropped == 1


def test_a_contradiction_on_one_item_keeps_neither_answer():
    """Last-one-wins let a model flip an item's sentiment by repeating it."""
    got, report = validate(rows((0, "positive"), (0, "negative")), BATCH)
    assert 0 not in got
    assert report.accepted == 0
    assert report.dropped == 2


def test_once_an_item_is_contradicted_a_third_answer_cannot_revive_it():
    got, _ = validate(rows((0, "positive"), (0, "negative"), (0, "positive")), BATCH)
    assert 0 not in got


def test_a_contradiction_on_one_item_leaves_the_others_alone():
    got, _ = validate(rows((0, "positive"), (0, "negative"), (2, "negative")), BATCH)
    assert got == {2: "negative"}


# --- report and tracing -------------------------------------------------------


def test_the_report_summarises_and_serialises():
    _, report = validate(rows((0, "positive"), (7, "positive")), BATCH)
    assert report.as_dict() == {
        "accepted": 1,
        "dropped": 0,
        "hallucinated_index": 1,
        "quarantined": 0,
        "batch_rejected": False,
    }
    assert report.summary() == "1 accepted, 0 dropped, 1 bad-index, 0 quarantined"
    assert "rejected" in validate("nope", BATCH)[1].summary()
    assert GuardrailReport().accepted == 0


def test_sentiment_verdict_rejects_an_unknown_label_directly():
    with pytest.raises(ValueError):
        SentimentVerdict(i=0, s="furious")


def test_traced_does_not_swallow_errors():
    with traced("ok.span"):
        pass
    with pytest.raises(RuntimeError), traced("failing.span"):
        raise RuntimeError("boom")
