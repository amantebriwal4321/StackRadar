"""run_scraper_loop may only stamp last_scraped_time after a clean cycle.

perform_full_scrape swallows its own errors, so before this was fixed a crashed
pipeline was recorded as a successful scrape and the site reported "Live".
"""
import asyncio

import pytest

from app.services import scheduler


class _StopLoop(Exception):
    pass


async def _one_cycle(monkeypatch, result):
    async def fake_scrape():
        if isinstance(result, Exception):
            raise result
        return result

    async def stop_after_first_sleep(_seconds):
        raise _StopLoop

    monkeypatch.setattr(scheduler, "perform_full_scrape", fake_scrape)
    monkeypatch.setattr(scheduler.asyncio, "sleep", stop_after_first_sleep)
    with pytest.raises(_StopLoop):
        await scheduler.run_scraper_loop()


@pytest.fixture(autouse=True)
def clean_status(monkeypatch):
    monkeypatch.setitem(scheduler.scrape_status, "last_scraped_time", "2026-01-01T00:00:00+00:00")
    monkeypatch.setitem(scheduler.scrape_status, "consecutive_failures", 0)
    monkeypatch.setitem(scheduler.scrape_status, "last_failure_time", None)
    monkeypatch.setitem(scheduler.scrape_status, "errors", [])


def test_successful_cycle_stamps_and_resets(monkeypatch):
    scheduler.scrape_status["consecutive_failures"] = 3
    asyncio.run(_one_cycle(monkeypatch, True))
    assert scheduler.scrape_status["last_scraped_time"] != "2026-01-01T00:00:00+00:00"
    assert scheduler.scrape_status["consecutive_failures"] == 0


def test_failed_pipeline_does_not_stamp(monkeypatch):
    asyncio.run(_one_cycle(monkeypatch, False))
    assert scheduler.scrape_status["last_scraped_time"] == "2026-01-01T00:00:00+00:00"
    assert scheduler.scrape_status["consecutive_failures"] == 1
    assert scheduler.scrape_status["last_failure_time"] is not None


def test_raising_pipeline_does_not_stamp(monkeypatch):
    asyncio.run(_one_cycle(monkeypatch, RuntimeError("boom")))
    assert scheduler.scrape_status["last_scraped_time"] == "2026-01-01T00:00:00+00:00"
    assert scheduler.scrape_status["consecutive_failures"] == 1
    assert scheduler.scrape_status["errors"][-1]["error"] == "boom"


def test_failures_accumulate_across_cycles(monkeypatch):
    asyncio.run(_one_cycle(monkeypatch, False))
    asyncio.run(_one_cycle(monkeypatch, False))
    assert scheduler.scrape_status["consecutive_failures"] == 2


def test_manual_trigger_records_its_outcome(monkeypatch):
    # POST /admin/scrape used to call perform_full_scrape directly, so a manual
    # scrape that fixed a broken pipeline never cleared the failure count.
    scheduler.scrape_status["consecutive_failures"] = 4

    async def fake_scrape():
        return True

    monkeypatch.setattr(scheduler, "perform_full_scrape", fake_scrape)
    assert asyncio.run(scheduler.run_one_cycle()) is True
    assert scheduler.scrape_status["consecutive_failures"] == 0
    assert scheduler.scrape_status["last_scraped_time"] != "2026-01-01T00:00:00+00:00"


def test_admin_endpoint_uses_the_recording_path():
    import inspect

    from app.api.endpoints import mvp

    src = inspect.getsource(mvp.trigger_manual_scrape)
    assert "run_one_cycle()" in src and "perform_full_scrape()" not in src
