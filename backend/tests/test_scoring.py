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


# --- growth baseline across a methodology change --------------------------------

from datetime import datetime, timedelta  # noqa: E402


def test_growth_baseline_is_seven_days_back_after_the_epoch():
    now = S.SIGNAL_EPOCH + timedelta(days=30)
    assert S.growth_baseline_since(now) == now - timedelta(days=7)


def test_growth_baseline_never_reaches_before_the_epoch():
    # Two days after the Reddit fix: a 7-day window would average old-method
    # scores and read the measurement change as momentum.
    now = S.SIGNAL_EPOCH + timedelta(days=2)
    assert S.growth_baseline_since(now) == S.SIGNAL_EPOCH


def test_before_the_epoch_there_is_no_comparable_baseline():
    now = S.SIGNAL_EPOCH - timedelta(hours=3)
    assert S.growth_baseline_since(now) > now  # nothing recorded yet can qualify


def test_signal_epoch_is_naive_like_recorded_at():
    assert S.SIGNAL_EPOCH.tzinfo is None
    assert isinstance(S.SIGNAL_EPOCH, datetime)


# --- learning priority: demand before trend ----------------------------------

@pytest.mark.parametrize(
    "slug, mentions, expected",
    [
        ("react", 171, "HIGH"),        # was LOW in production: stable trend
        ("kubernetes", 72, "HIGH"),
        ("terraform", 43, "HIGH"),     # 5.7% of 756
        ("fastapi", 19, "MEDIUM"),     # 2.5%
        ("wireshark", 0, "LOW"),       # a measured zero lifts nothing
    ],
)
def test_measured_demand_sets_the_priority_floor(slug, mentions, expected):
    assert S.classify_learning_priority("stable", mentions, 756) == expected


def test_unmeasured_tools_fall_back_to_the_trend_exactly_as_before():
    for trend, want in [("rising", "HIGH"), ("growing", "MEDIUM"), ("stable", "LOW"), ("declining", "AVOID")]:
        assert S.classify_learning_priority(trend) == want
        assert S.classify_learning_priority(trend, None, None) == want


def test_demand_never_lowers_a_rising_tool():
    assert S.classify_learning_priority("rising", 1, 756) == "HIGH"


def test_a_declining_tool_employers_still_ask_for_is_not_avoid():
    assert S.classify_learning_priority("declining", 20, 756) == "MEDIUM"


# --- recommendation prose: no invented employment claims ------------------------

def test_no_job_claim_without_a_measurement():
    text = S.generate_recommendation("React", "rising", 92.8)
    assert "hiring" not in text.lower() and "job" not in text.lower()
    assert "momentum" in text.lower()


def test_a_measured_count_is_quoted_with_its_sample():
    text = S.generate_recommendation("React", "stable", 92.8, 171, 756)
    assert "171 of the 756" in text


def test_a_measured_zero_is_stated_not_hidden():
    text = S.generate_recommendation("Wireshark", "stable", 35.7, 0, 756)
    assert "None of the 756" in text
    assert "thin evidence" in text, "a small sample is not proof of no demand"


@pytest.mark.parametrize("trend", ["rising", "growing", "stable", "declining"])
def test_momentum_prose_never_asserts_the_job_market(trend):
    # The score is stars plus forum mentions; it knows nothing about hiring.
    text = S.generate_recommendation("Thing", trend, 50.0)
    for phrase in ("job market", "career investment", "steady demand", "high demand"):
        assert phrase not in text.lower()
