"""The Groq sentiment pass: model resolution and batch handling.

Its history is in the code: Groq retired the hardcoded model, every call 404ed,
the handler fell back to "neutral" on any exception, and 386 items scored
neutral with a valid key and zero reported errors - indistinguishable from the
key being absent. The resolver exists to prevent a repeat, and none of it was
tested. A fake `groq` module stands in for the SDK, so nothing here touches the
network.
"""

import asyncio
import json
import sys
from types import SimpleNamespace

import pytest

from app.services import scraper as S


class FakeGroq:
    """Just enough of the Groq SDK: models.list() and chat.completions.create()."""

    def __init__(self, api_key=None, *, models=("llama-3.3-70b-versatile",),
                 list_error=None, replies=None):
        self.api_key = api_key
        self.list_calls = 0
        self.prompts: list[str] = []
        self._models = models
        self._list_error = list_error
        self._replies = replies if replies is not None else []
        self.models = SimpleNamespace(list=self._list)
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _list(self):
        self.list_calls += 1
        if self._list_error:
            raise self._list_error
        return SimpleNamespace(data=[SimpleNamespace(id=m) for m in self._models])

    def _create(self, *, model, messages, **kwargs):
        self.prompts.append(messages[0]["content"])
        self.model_used = model
        reply = self._replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=reply))]
        )


@pytest.fixture(autouse=True)
def isolated(monkeypatch):
    monkeypatch.setattr(S, "_groq_model", None)
    monkeypatch.setattr(S.settings, "GROQ_MODEL", "")
    monkeypatch.setattr(S.settings, "GROQ_API_KEY", "gsk_test")

    async def no_sleep(seconds):
        pass

    monkeypatch.setattr(S.asyncio, "sleep", no_sleep)


@pytest.fixture
def groq(monkeypatch):
    """Install a FakeGroq as the `groq` SDK and return it."""
    holder = {}

    def install(**kwargs):
        def factory(api_key=None):
            holder["client"] = FakeGroq(api_key, **kwargs)
            return holder["client"]

        monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=factory))
        return holder

    return install


def analyse(items, **kw):
    return asyncio.run(S.batch_sentiment_analysis(items, **kw))


def verdicts(*pairs):
    return json.dumps([{"i": i, "s": s} for i, s in pairs])


# --- resolving the model --------------------------------------------------------


def test_the_first_candidate_in_preference_order_wins():
    client = FakeGroq(models=["qwen/qwen3-32b", "llama-3.3-70b-versatile"])
    assert S._resolve_groq_model(client) == "llama-3.3-70b-versatile"


def test_a_later_candidate_is_used_when_the_preferred_one_is_retired():
    client = FakeGroq(models=["openai/gpt-oss-20b", "some-other-model"])
    assert S._resolve_groq_model(client) == "openai/gpt-oss-20b"


def test_a_pinned_model_overrides_the_candidate_list(monkeypatch):
    monkeypatch.setattr(S.settings, "GROQ_MODEL", "my-pinned-model")
    client = FakeGroq(models=["llama-3.3-70b-versatile", "my-pinned-model"])
    assert S._resolve_groq_model(client) == "my-pinned-model"


def test_a_pinned_model_the_key_cannot_use_is_not_silently_swapped(monkeypatch):
    monkeypatch.setattr(S.settings, "GROQ_MODEL", "my-pinned-model")
    client = FakeGroq(models=["llama-3.3-70b-versatile"])
    assert S._resolve_groq_model(client) is None


def test_no_usable_model_resolves_to_none():
    assert S._resolve_groq_model(FakeGroq(models=["whisper-large-v3"])) is None


def test_a_resolved_model_is_remembered_so_it_is_not_probed_every_batch():
    client = FakeGroq()
    assert S._resolve_groq_model(client) == "llama-3.3-70b-versatile"
    assert S._resolve_groq_model(client) == "llama-3.3-70b-versatile"
    assert client.list_calls == 1


def test_a_failed_listing_tries_the_first_candidate():
    client = FakeGroq(list_error=ConnectionError("network blip"))
    assert S._resolve_groq_model(client) == S._GROQ_MODEL_CANDIDATES[0]


def test_a_failed_listing_is_not_remembered_as_if_it_were_an_answer():
    """One blip must not choose the model for the life of the process: the next
    call has to ask again, and may find the real one."""
    flaky = FakeGroq(list_error=ConnectionError("network blip"))
    S._resolve_groq_model(flaky)
    assert S._groq_model is None

    healthy = FakeGroq(models=["qwen/qwen3-32b"])
    assert S._resolve_groq_model(healthy) == "qwen/qwen3-32b"


# --- degrading to neutral ---------------------------------------------------------


def test_without_a_key_everything_is_neutral_and_groq_is_never_built(
    monkeypatch, groq
):
    holder = groq()
    monkeypatch.setattr(S.settings, "GROQ_API_KEY", "")
    items = [{"title": "React 19 is great"}, {"title": "Docker is slow"}]

    out = analyse(items)

    assert [i["sentiment"] for i in out] == ["neutral", "neutral"]
    assert "client" not in holder


def test_with_no_usable_model_everything_is_neutral_and_nothing_is_asked(groq):
    holder = groq(models=["whisper-large-v3"])
    out = analyse([{"title": "React 19 is great"}])
    assert out[0]["sentiment"] == "neutral"
    assert holder["client"].prompts == []


def test_an_empty_list_asks_nothing(groq):
    holder = groq()
    assert analyse([]) == []
    assert holder["client"].prompts == []


# --- a working pass -----------------------------------------------------------------


def test_grounded_verdicts_are_applied_and_ungrounded_ones_go_neutral(groq):
    groq(replies=[verdicts((0, "positive"), (1, "negative"), (2, "negative"))])
    items = [
        {"title": "React 19 is a big step forward"},
        {"title": "Weather forecast for the weekend"},  # names no tool
        {"title": "Why I stopped using Docker"},
    ]

    out = analyse(items)

    assert [i["sentiment"] for i in out] == ["positive", "neutral", "negative"]


def test_the_prompt_numbers_the_headlines_and_survives_a_missing_title(groq):
    holder = groq(replies=[verdicts()])
    analyse([{"title": "First"}, {}, {"title": "Third"}])
    prompt = holder["client"].prompts[0]
    assert "0: First" in prompt
    assert "1: (no title)" in prompt
    assert "2: Third" in prompt


def test_the_resolved_model_is_the_one_asked(groq):
    holder = groq(models=["qwen/qwen3-32b"], replies=[verdicts()])
    analyse([{"title": "x"}])
    assert holder["client"].model_used == "qwen/qwen3-32b"


def test_items_are_sent_in_batches_of_the_requested_size(groq):
    holder = groq(replies=[verdicts(), verdicts(), verdicts()])
    items = [{"title": f"item {n}"} for n in range(5)]

    analyse(items, batch_size=2)

    assert len(holder["client"].prompts) == 3  # 2 + 2 + 1
    assert "0: item 4" in holder["client"].prompts[2]  # restarts at 0 per batch


def test_a_verdict_lands_on_the_right_item_in_a_later_batch(groq):
    groq(replies=[verdicts(), verdicts((1, "negative"))])
    items = [
        {"title": "a"},
        {"title": "b"},
        {"title": "c"},
        {"title": "Why I stopped using Docker"},  # batch 2, local index 1
    ]
    out = analyse(items, batch_size=2)
    assert [i["sentiment"] for i in out] == ["neutral", "neutral", "neutral", "negative"]


# --- failures never break the pipeline -----------------------------------------------


@pytest.mark.parametrize("reply", ["", "I cannot help with that", '{"i": 0}', "[1, 2]"])
def test_an_unusable_reply_leaves_the_batch_neutral(groq, reply):
    groq(replies=[reply])
    out = analyse([{"title": "React 19 is great"}])
    assert out[0]["sentiment"] == "neutral"


def test_an_api_error_in_one_batch_does_not_stop_the_next(groq):
    groq(replies=[RuntimeError("503 from groq"), verdicts((0, "positive"))])
    items = [{"title": "a"}, {"title": "b"}, {"title": "React 19 is great"}]

    out = analyse(items, batch_size=2)

    assert [i["sentiment"] for i in out] == ["neutral", "neutral", "positive"]


def test_every_item_ends_up_with_a_sentiment_whatever_happens(groq):
    groq(replies=[RuntimeError("down"), "garbage", verdicts((0, "positive"))])
    items = [{"title": f"t{n}"} for n in range(5)]
    out = analyse(items, batch_size=2)
    assert all(i["sentiment"] in {"positive", "negative", "neutral"} for i in out)


def test_the_same_list_is_returned_enriched_in_place(groq):
    groq(replies=[verdicts()])
    items = [{"title": "x"}]
    assert analyse(items) is items
