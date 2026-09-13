"""The momentum score - the number the whole product is built on.

A silent bug here is the worst kind: the output is still a plausible 0-100.
"""
import pytest

from app.services import scoring as S

REACT_LIKE = {"stars": 230_000, "forks": 47_000, "hn_count": 3, "devto_count": 4, "reddit_count": 2, "news_count": 1}
SMALL = {"stars": 2_000, "forks": 120}


# --- calculate_all_tool_scores ----------------------------------------------

def test_scores_are_absolute_not_relative():
    # A tool's score must not move because an unrelated tool moved. That is
    # what makes "this score rose" mean the tool actually grew.
    alone = S.calculate_all_tool_scores([SMALL])[0]
    beside_giant = S.calculate_all_tool_scores([SMALL, REACT_LIKE])[0]
    beside_nothing = S.calculate_all_tool_scores([SMALL, {"stars": 0}])[0]
    assert alone == beside_giant == beside_nothing


def test_output_order_matches_input_order():
    a, b = S.calculate_all_tool_scores([SMALL, REACT_LIKE])
    assert b > a


def test_no_signal_scores_zero_with_no_flat_base():
    assert S.calculate_all_tool_scores([{}]) == [0.0]


def test_maximum_signal_is_capped_at_100():
    huge = {"stars": 10**9, "forks": 10**9, "hn_count": 1000}
    assert S.calculate_all_tool_scores([huge]) == [100.0]


def test_every_score_is_within_bounds():
    rows = [{}, SMALL, REACT_LIKE, {"stars": 499}, {"hn_count": 10**6}]
    assert all(0.0 <= s <= 100.0 for s in S.calculate_all_tool_scores(rows))


def test_more_stars_never_lowers_the_score():
    scores = S.calculate_all_tool_scores([{"stars": n} for n in (100, 1_000, 10_000, 100_000, 1_000_000)])
    assert scores == sorted(scores)


def test_community_activity_saturates_at_25_mentions_and_weighs_25_percent():
    at_cap = S.calculate_all_tool_scores([{"hn_count": 25}])[0]
    past_cap = S.calculate_all_tool_scores([{"hn_count": 250}])[0]
    assert at_cap == past_cap == 25.0


def test_a_single_mention_registers():
    # The old pipeline weighted a neutral mention 0.5 and round()-ed it to 0.
    assert S.calculate_all_tool_scores([{"devto_count": 1}])[0] > 0


def test_empty_input():
    assert S.calculate_all_tool_scores([]) == []


# --- _norm_log ----------------------------------------------------------------

def test_norm_log_floor_and_ceiling():
    assert S._norm_log(500, 500, 300_000) == 0.0
    assert S._norm_log(0, 500, 300_000) == 0.0
    assert S._norm_log(300_000, 500, 300_000) == pytest.approx(100.0)
    assert S._norm_log(10**9, 500, 300_000) == 100.0


def test_norm_log_is_logarithmic():
    mid = (500 * 300_000) ** 0.5  # geometric midpoint
    assert S._norm_log(mid, 500, 300_000) == pytest.approx(50.0)


# --- mention matching -----------------------------------------------------------

def test_keywords_match_on_word_boundaries():
    assert S.classify_text_to_tools("I love React hooks") == {"react"}
    assert S.classify_text_to_tools("going to the store") == set()
    assert S.classify_text_to_tools("") == set()


def test_count_mentions_is_one_per_item_not_per_occurrence():
    items = [{"title": "React React React"}, {"title": "react vs everything"}]
    counts = S.count_mentions(items, {"react", "rust"})
    assert counts["react"] == 2
    assert counts["rust"] == 0


def test_count_mentions_returns_integers():
    counts = S.count_mentions([{"title": "Rust"}], {"rust"})
    assert counts == {"rust": 1} and isinstance(counts["rust"], int)


def test_count_mentions_ignores_slugs_it_was_not_asked_about():
    assert S.count_mentions([{"title": "React and Rust"}], {"rust"}) == {"rust": 1}


def test_devto_description_and_tags_are_searched():
    # Most matches come from Dev.to descriptions; they used to be ignored.
    assert S.count_mentions([{"title": "My week", "description": "Moved our API to FastAPI"}], {"fastapi"})["fastapi"] == 1
    assert S.count_mentions([{"title": "My week", "tag_list": ["docker"]}], {"docker"})["docker"] == 1


# --- classifiers --------------------------------------------------------------------

@pytest.mark.parametrize("score, stage", [(0, "Declining"), (19.9, "Declining"), (20, "Emerging"),
                                          (39.9, "Emerging"), (40, "Growing"), (69.9, "Growing"), (70, "Mature"), (100, "Mature")])
def test_growth_stage_boundaries(score, stage):
    assert S.classify_growth_stage(score) == stage


@pytest.mark.parametrize("pct, trend", [(15.1, "rising"), (15, "growing"), (5.1, "growing"), (5, "stable"),
                                        (-5, "stable"), (-5.1, "declining")])
def test_trend_boundaries(pct, trend):
    assert S.classify_trend(pct) == trend
