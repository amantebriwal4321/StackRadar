"""Project briefs and the walkthrough-video gate.

The titles below are what production actually returned while the gate was
wrong. Each one shipped to a live project page before it was caught by hand.
"""
import pytest

from app.services import projects as P

BY_SLUG = {p["slug"]: p for p in P.PROJECTS}


def gate(slug):
    return BY_SLUG[slug]["walkthrough"]


# --- video_matches: real regressions ---------------------------------------

@pytest.mark.parametrize(
    "slug, title",
    [
        # Ranking had no relevance term, so the most-watched candidate won.
        ("rust-cli-grep", "How to Run Claude Code Completely Free forever (2026)"),
        ("fastapi-rss-aggregator", "Ultimate Web Scraping tutorial"),
        ("pytorch-transfer-learning", "PyTorch in 100 Seconds"),
        # Required term present, but negated.
        ("pytorch-mnist-classifier", "Building a neural network FROM SCRATCH (no Tensorflow/PyTorch)"),
        # Right subject, wrong stack.
        ("nextjs-url-shortener", "Build a Production-Ready MERN Stack Project | URL Shortener"),
        # Right subject, a later episode about payments rather than the build.
        ("nextjs-url-shortener", "Next.js URL Shortener: Adding Razorpay Pro Plans"),
    ],
)
def test_rejects_titles_that_reached_production(slug, title):
    assert P.video_matches(title, gate(slug)) is False


@pytest.mark.parametrize(
    "slug, title",
    [
        ("nextjs-url-shortener", "Full-Stack URL Shortener with Next.js 14, Prisma & Postgres"),
        ("docker-containerize-app", "Docker Image BEST Practices - From 1.2GB to 10MB"),
        ("react-quiz-app", "Full Stack Quiz App And Quiz Builder In React Js For Beginners"),
        ("pytorch-transfer-learning", "PyTorch Transfer Learning (taking a pretrained model)"),
        ("rust-http-server", "Implementing TCP in Rust (part 1)"),
        ("react-github-explorer", "Optimizing React Search Input: Debouncing & Abort Controller"),
    ],
)
def test_keeps_titles_that_are_about_the_project(slug, title):
    assert P.video_matches(title, gate(slug)) is True


# --- video_matches: the rules themselves ------------------------------------

@pytest.mark.parametrize("phrase", ["no pytorch", "not pytorch", "without pytorch", "instead of pytorch"])
def test_negated_required_term_is_rejected(phrase):
    w = {"must": ["pytorch"]}
    assert P.video_matches(f"A digit classifier {phrase}", w) is False


def test_word_containing_a_negation_is_not_a_negation():
    # "notebook" and "known" contain "not"/"no"; they must not trip the check.
    w = {"must": ["pytorch"]}
    assert P.video_matches("PyTorch notebook for known datasets", w) is True
    assert P.video_matches("Pytorch in a Jupyter notebook", w) is True


def test_matching_is_case_insensitive():
    assert P.video_matches("KANBAN BOARD IN REACT", {"must": ["kanban"]}) is True


def test_empty_any_accepts_on_must_alone():
    assert P.video_matches("Kanban board", {"must": ["kanban"], "any": []}) is True


def test_deny_wins_over_a_full_match():
    w = {"must": ["short"], "any": ["next"], "deny": ["razorpay"]}
    assert P.video_matches("Next.js URL shortener with Razorpay", w) is False


def test_missing_title_never_matches_a_gated_project():
    assert P.video_matches("", {"must": ["rust"]}) is False
    assert P.video_matches(None, {"must": ["rust"]}) is False


def test_every_project_has_a_search_and_a_gate():
    for p in P.PROJECTS:
        w = p["walkthrough"]
        assert w.get("search"), p["slug"]
        assert w.get("must"), f"{p['slug']} would accept any video its search returns"


# --- video_cache_slug --------------------------------------------------------

def _project(**walkthrough):
    return {"slug": "demo", "walkthrough": {"search": "q", "must": ["a"], "any": ["b"], **walkthrough}}


def test_cache_slug_is_stable():
    assert P.video_cache_slug(_project()) == P.video_cache_slug(_project())
    assert P.video_cache_slug(_project()).startswith("project:demo:")


@pytest.mark.parametrize(
    "change",
    [{"search": "other query"}, {"must": ["z"]}, {"any": ["z"]}, {"deny": ["z"]}],
)
def test_cache_slug_changes_with_every_input_the_winner_depends_on(change):
    # Each of these was once left out of the key, and a correct fix then looked
    # like it did nothing until the 24h TTL expired.
    assert P.video_cache_slug(_project()) != P.video_cache_slug(_project(**change))


def test_cache_slug_changes_when_the_gate_logic_version_changes(monkeypatch):
    before = P.video_cache_slug(_project())
    monkeypatch.setattr(P, "GATE_VERSION", P.GATE_VERSION + 1)
    assert P.video_cache_slug(_project()) != before


def test_cache_slug_prefix_cannot_collide_across_slugs():
    # The write path purges with LIKE 'project:<slug>%'. That is only safe
    # while no slug is a prefix of another, or one project's refresh would
    # delete another's cached video.
    slugs = [p["slug"] for p in P.PROJECTS]
    for a in slugs:
        for b in slugs:
            if a != b:
                assert not b.startswith(a), f"{a} is a prefix of {b}"


# --- normalise_steps ---------------------------------------------------------

def test_plain_string_step_gets_the_full_shape():
    assert P.normalise_steps(["Do the thing."]) == [
        {"do": "Do the thing.", "detail": None, "doc": None, "gotcha": None}
    ]


def test_rich_step_doc_pair_becomes_label_and_url():
    out = P.normalise_steps([{"do": "x", "doc": ["Label", "https://example.com"]}])
    assert out[0]["doc"] == {"label": "Label", "url": "https://example.com"}


def test_no_steps_is_an_empty_list():
    assert P.normalise_steps(None) == []
    assert P.normalise_steps([]) == []


def test_every_served_step_has_an_instruction():
    for p in P.PROJECTS:
        for step in P.normalise_steps(p["walkthrough"].get("steps")):
            assert step["do"].strip(), p["slug"]
