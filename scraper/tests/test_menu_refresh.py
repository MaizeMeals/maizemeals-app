import io
import json
import os
import sys
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

SCRAPER_ROOT = Path(__file__).resolve().parents[1]
if str(SCRAPER_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRAPER_ROOT))

os.environ.setdefault("MDINING_API_KEY", "test-key")
os.environ.setdefault("MDINING_BASE_URL", "https://example.invalid/")
os.environ.setdefault("SUPABASE_URL", "https://example.invalid/")
os.environ.setdefault("SUPABASE_KEY", "test-service-key")

from lib.api import (  # noqa: E402
    APIHTTPError,
    RetryableHTTPStatus,
    backoff_seconds,
    call_with_retries,
    fetch_meal_hours,
    fetch_menu_data,
    is_retryable_exception,
    is_retryable_status,
)
from lib.db import upsert_items  # noqa: E402
from main import (  # noqa: E402
    _scrape_location,
    finish_run,
    menu_refresh_plan,
    post_failure_alert,
    run_scraper,
)

LUNCH_WINDOW = {
    "meal": "LUNCH",
    "start_time": "2026-02-09T11:00:00-05:00",
    "end_time": "2026-02-09T14:00:00-05:00",
}
BREAKFAST_WINDOW = {
    "meal": "BREAKFAST",
    "start_time": "2026-02-09T07:00:00-05:00",
    "end_time": "2026-02-09T10:00:00-05:00",
}
LOCATION = {
    "name": "Bursley Dining Hall",
    "official_id": 1,
    "type": "DINING HALLS",
    "display_name": "Bursley",
}


class RetryPolicyTest(unittest.TestCase):
    def test_status_policy(self):
        self.assertTrue(is_retryable_status(429))
        self.assertTrue(is_retryable_status(500))
        self.assertTrue(is_retryable_status(503))
        self.assertTrue(is_retryable_status(599))
        self.assertFalse(is_retryable_status(200))
        self.assertFalse(is_retryable_status(400))
        self.assertFalse(is_retryable_status(404))
        self.assertFalse(is_retryable_status(408))

    def test_backoff_series(self):
        self.assertEqual(backoff_seconds(0), 1)
        self.assertEqual(backoff_seconds(1), 2)
        self.assertEqual(backoff_seconds(2), 4)

    def test_three_attempts_sleep_between_tries_only(self):
        calls = {"n": 0}
        sleeps = []

        def fn():
            calls["n"] += 1
            if calls["n"] < 3:
                raise TimeoutError("slow")
            return {"ok": True}

        result = call_with_retries(fn, sleep=sleeps.append)
        self.assertEqual(result, {"ok": True})
        self.assertEqual(calls["n"], 3)
        self.assertEqual(sleeps, [1, 2])

    def test_persistent_429_and_5xx_try_three_times(self):
        codes = [429, 500, 503]
        calls = {"n": 0}
        sleeps = []

        def fn():
            status = codes[calls["n"]]
            calls["n"] += 1
            raise RetryableHTTPStatus(status)

        with self.assertRaises(RetryableHTTPStatus):
            call_with_retries(fn, sleep=sleeps.append)
        self.assertEqual(calls["n"], 3)
        self.assertEqual(sleeps, [1, 2])

    def test_other_4xx_is_not_retried(self):
        calls = {"n": 0}

        def fn():
            calls["n"] += 1
            error = APIHTTPError(404)
            self.assertFalse(is_retryable_exception(error))
            raise error

        with self.assertRaises(APIHTTPError):
            call_with_retries(fn, sleep=lambda _delay: self.fail("slept on 404"))
        self.assertEqual(calls["n"], 1)

    def test_requests_style_http_error_uses_response_status(self):
        class Response:
            status_code = 400

        class HTTPError(Exception):
            def __init__(self):
                super().__init__("HTTP 400 for https://example.invalid/?key=test-key")
                self.response = Response()

        calls = {"n": 0}

        def fn():
            calls["n"] += 1
            raise HTTPError()

        with self.assertRaises(HTTPError):
            call_with_retries(fn, sleep=lambda _delay: self.fail("slept on 400"))
        self.assertEqual(calls["n"], 1)
        self.assertFalse(is_retryable_exception(HTTPError()))

    def test_retry_log_omits_url_and_key(self):
        class HTTPError(Exception):
            def __init__(self):
                super().__init__("GET https://example.invalid/?key=test-key failed")
                self.status_code = 503

        buf = io.StringIO()
        with redirect_stdout(buf):
            with self.assertRaises(HTTPError):
                call_with_retries(lambda: (_ for _ in ()).throw(HTTPError()), sleep=lambda _d: None)
        logged = buf.getvalue()
        self.assertNotIn("test-key", logged)
        self.assertNotIn("https://", logged)
        self.assertIn("HTTP 503", logged)


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self.payload = payload

    def json(self):
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class RequestJsonTest(unittest.TestCase):
    def test_fetch_menu_data_raises_on_404(self):
        with patch("lib.api.scraper.get", return_value=FakeResponse(404, {})):
            with self.assertRaises(APIHTTPError):
                fetch_menu_data("Bursley Dining Hall", "09-02-2026", "LUNCH")

    def test_fetch_menu_data_empty_menu_is_success(self):
        response = FakeResponse(200, {"menu": None})
        with patch("lib.api.scraper.get", return_value=response):
            self.assertEqual(
                fetch_menu_data("Bursley Dining Hall", "09-02-2026", "LUNCH"),
                [],
            )

    def test_fetch_meal_hours_retries_then_raises(self):
        calls = {"n": 0}

        def get(endpoint, params=None):
            calls["n"] += 1
            return FakeResponse(503, {})

        with patch("lib.api.scraper.get", get), patch("lib.api.time.sleep") as sleeper:
            with self.assertRaises(RetryableHTTPStatus):
                fetch_meal_hours("Bursley Dining Hall", "09-02-2026")
        self.assertEqual(calls["n"], 3)
        self.assertEqual([call.args[0] for call in sleeper.call_args_list], [1, 2])

    def test_fetch_meal_hours_empty_schedule_is_closed(self):
        response = FakeResponse(200, {"hours": []})
        with patch("lib.api.scraper.get", return_value=response):
            self.assertEqual(fetch_meal_hours("Bursley Dining Hall", "09-02-2026"), [])

    def test_date_docstrings_are_dd_mm_yyyy(self):
        for fn in (fetch_meal_hours, fetch_menu_data):
            self.assertIn("DD-MM-YYYY", fn.__doc__)
            self.assertIn("9 February 2026", fn.__doc__)
            self.assertNotIn("MM-DD-YYYY", fn.__doc__)


class MenuRefreshPlanTest(unittest.TestCase):
    def test_failure_is_not_an_empty_menu(self):
        self.assertEqual(menu_refresh_plan([(False, [])]), "keep_failed")
        self.assertEqual(menu_refresh_plan([(True, [])]), "keep_empty")

    def test_any_failure_keeps_even_when_other_meals_have_items(self):
        self.assertEqual(
            menu_refresh_plan([(True, [{"name": "Oats"}]), (False, [])]),
            "keep_failed",
        )

    def test_all_empty_successes_keep(self):
        self.assertEqual(menu_refresh_plan([(True, []), (True, [])]), "keep_empty")

    def test_replace_when_any_meal_has_items(self):
        self.assertEqual(
            menu_refresh_plan([(True, []), (True, [{"name": "Soup"}])]),
            "replace",
        )


class LocationRefreshTest(unittest.TestCase):
    def _scrape(self, schedule, menu_side_effect, upsert_return=1):
        errors = []
        with patch("main.fetch_meal_hours", return_value=schedule), \
             patch("main.fetch_menu_data", side_effect=menu_side_effect) as menus, \
             patch("main.upsert_operating_hours") as hours, \
             patch("main.delete_events_for_date") as delete, \
             patch("main.upsert_items", return_value=upsert_return) as upsert, \
             patch("main.time.sleep"):
            saved = _scrape_location(
                object(),
                LOCATION,
                "hall-uuid",
                "09-02-2026",
                "2026-02-09",
                errors,
            )
        return saved, errors, hours, delete, upsert, menus

    def test_meal_failure_keeps_menu_and_still_saves_hours(self):
        def menu(_location, _date, meal):
            if meal == "BREAKFAST":
                return [{"name": "Oats"}]
            raise RuntimeError("timeout talking to dining")

        saved, errors, hours, delete, upsert, menus = self._scrape(
            [BREAKFAST_WINDOW, LUNCH_WINDOW],
            menu,
        )
        self.assertEqual(saved, 0)
        hours.assert_called_once()
        delete.assert_not_called()
        upsert.assert_not_called()
        self.assertEqual(menus.call_count, 2)
        self.assertEqual(len(errors), 1)
        self.assertIn("kept existing menu", errors[0])
        self.assertIn("LUNCH", errors[0])

    def test_fetches_every_meal_but_does_not_insert_after_a_failure(self):
        def menu(_location, _date, meal):
            if meal == "BREAKFAST":
                raise RuntimeError("down")
            return [{"name": "Soup"}]

        saved, errors, _hours, delete, upsert, menus = self._scrape(
            [BREAKFAST_WINDOW, LUNCH_WINDOW],
            menu,
        )
        self.assertEqual(saved, 0)
        delete.assert_not_called()
        upsert.assert_not_called()
        self.assertEqual(menus.call_count, 2)
        self.assertIn("BREAKFAST", errors[0])
        self.assertIn("kept existing menu", errors[0])

    def test_all_empty_meals_do_not_delete(self):
        saved, errors, hours, delete, upsert, _menus = self._scrape(
            [BREAKFAST_WINDOW, LUNCH_WINDOW],
            lambda *_args: [],
        )
        self.assertEqual(saved, 0)
        self.assertEqual(errors, [])
        hours.assert_called_once()
        delete.assert_not_called()
        upsert.assert_not_called()

    def test_replace_deletes_once_and_skips_empty_meals(self):
        def menu(_location, _date, meal):
            if meal == "BREAKFAST":
                return []
            return [{"name": "Soup"}, {"name": "Soup"}]

        saved, errors, _hours, delete, upsert, _menus = self._scrape(
            [BREAKFAST_WINDOW, LUNCH_WINDOW],
            menu,
            upsert_return=1,
        )
        self.assertEqual(saved, 1)
        self.assertEqual(errors, [])
        delete.assert_called_once()
        upsert.assert_called_once()
        items = upsert.call_args.args[1]
        self.assertEqual([item["name"] for item in items], ["Soup", "Soup"])
        self.assertEqual(upsert.call_args.args[3]["meal"], "LUNCH")

    def test_open_is_queried_as_lunch_and_stored_as_all_day(self):
        schedule = [{
            "meal": "OPEN",
            "start_time": "2026-02-09T08:00:00-05:00",
            "end_time": "2026-02-09T20:00:00-05:00",
        }]

        def menu(_location, _date, meal):
            self.assertEqual(meal, "LUNCH")
            return [{"name": "Coffee"}]

        _saved, _errors, _hours, delete, upsert, _menus = self._scrape(
            schedule,
            menu,
        )
        delete.assert_called_once()
        self.assertEqual(upsert.call_args.args[3]["meal"], "All Day")

    def test_kiosk_uses_the_same_all_day_mapping(self):
        schedule = [{
            "meal": "24/7 KIOSK",
            "start_time": "2026-02-09T00:00:00-05:00",
            "end_time": "2026-02-09T23:59:00-05:00",
        }]
        seen = {}

        def menu(_location, _date, meal):
            seen["meal"] = meal
            return [{"name": "Bar"}]

        self._scrape(schedule, menu)
        self.assertEqual(seen["meal"], "LUNCH")

    def test_hours_failure_does_not_delete_menu(self):
        errors = []
        with patch("main.fetch_meal_hours", side_effect=RetryableHTTPStatus(503)), \
             patch("main.upsert_operating_hours") as hours, \
             patch("main.delete_events_for_date") as delete, \
             patch("main.fetch_menu_data") as menus:
            saved = _scrape_location(
                object(), LOCATION, "hall-uuid", "09-02-2026", "2026-02-09", errors
            )
        self.assertEqual(saved, 0)
        hours.assert_not_called()
        delete.assert_not_called()
        menus.assert_not_called()
        self.assertEqual(len(errors), 1)
        self.assertIn("hours request failed", errors[0])
        self.assertIn("kept existing menu", errors[0])

    def test_closed_location_is_not_an_error(self):
        errors = []
        with patch("main.fetch_meal_hours", return_value=[]), \
             patch("main.delete_events_for_date") as delete, \
             patch("main.upsert_operating_hours") as hours:
            saved = _scrape_location(
                object(), LOCATION, "hall-uuid", "09-02-2026", "2026-02-09", errors
            )
        self.assertEqual(saved, 0)
        self.assertEqual(errors, [])
        delete.assert_not_called()
        hours.assert_not_called()

    def test_upsert_reporting_zero_is_a_location_error(self):
        saved, errors, _hours, delete, _upsert, _menus = self._scrape(
            [LUNCH_WINDOW],
            lambda *_args: [{"name": "Soup"}],
            upsert_return=0,
        )
        self.assertEqual(saved, 0)
        delete.assert_called_once()
        self.assertEqual(len(errors), 1)
        self.assertIn("was not saved", errors[0])


class SavedCountTest(unittest.TestCase):
    def test_upsert_items_reports_deduped_rows(self):
        class Result:
            def __init__(self, data):
                self.data = data

        class Query:
            def __init__(self, table, client):
                self.table = table
                self.client = client
                self.payload = None

            def upsert(self, payload, on_conflict=None):
                self.payload = payload
                return self

            def execute(self):
                if self.table == "items":
                    rows = []
                    for index, row in enumerate(self.payload):
                        rows.append({"id": f"item-{index}", **row})
                    self.client.items_payload = self.payload
                    return Result(rows)
                return Result(self.payload)

        class Client:
            def __init__(self):
                self.items_payload = None

            def table(self, name):
                return Query(name, self)

        client = Client()
        saved = upsert_items(
            client,
            [
                _item("Soup"),
                _item("Soup"),
                _item("Salad"),
            ],
            "hall-uuid",
            {
                "meal": "LUNCH",
                "date": "2026-02-09",
                "start_time": "11:00:00",
                "end_time": "14:00:00",
            },
        )
        self.assertEqual(saved, 2)
        self.assertEqual(len(client.items_payload), 2)

    def test_upsert_items_returns_zero_when_write_fails(self):
        class Query:
            def upsert(self, payload, on_conflict=None):
                return self

            def execute(self):
                raise RuntimeError("db down")

        class Client:
            def table(self, name):
                return Query()

        saved = upsert_items(
            Client(),
            [_item("Soup")],
            "hall-uuid",
            {
                "meal": "LUNCH",
                "date": "2026-02-09",
                "start_time": "11:00:00",
                "end_time": "14:00:00",
            },
        )
        self.assertEqual(saved, 0)


def _item(name):
    return {
        "name": name,
        "station": "Grill",
        "nutrition_score": None,
        "macronutrients": {"Calories": 10},
        "is_mhealthy": False,
        "dietary_tags": [],
        "serving_size": "1 each",
        "item_type": "food",
    }


class AlertTest(unittest.TestCase):
    def setUp(self):
        self._previous = os.environ.get("DISCORD_WEBHOOK_URL")
        os.environ.pop("DISCORD_WEBHOOK_URL", None)

    def tearDown(self):
        if self._previous is None:
            os.environ.pop("DISCORD_WEBHOOK_URL", None)
        else:
            os.environ["DISCORD_WEBHOOK_URL"] = self._previous

    def test_success_does_not_post(self):
        with patch("main.post_failure_alert") as alert:
            code = finish_run(4, [])
        self.assertEqual(code, 0)
        alert.assert_not_called()

    def test_zero_saved_posts_and_returns_one(self):
        with patch("main.post_failure_alert") as alert:
            code = finish_run(0, [])
        self.assertEqual(code, 1)
        alert.assert_called_once()
        self.assertIn("Items saved: 0", alert.call_args.args[0])

    def test_location_error_posts_even_when_items_were_saved(self):
        with patch("main.post_failure_alert") as alert:
            code = finish_run(3, ["Bursley on 2026-02-09: LUNCH request failed"])
        self.assertEqual(code, 1)
        alert.assert_called_once()

    def test_missing_webhook_does_not_raise_or_post(self):
        with patch("main.urllib.request.urlopen") as urlopen:
            post_failure_alert("MaizeMeals scraper failed.")
        urlopen.assert_not_called()

    def test_webhook_post_failure_is_logged_without_the_url(self):
        webhook = "https://discord.example/api/webhooks/123/super-secret-token"
        os.environ["DISCORD_WEBHOOK_URL"] = webhook

        def boom(request, timeout=0):
            raise urllib.error.URLError(f"timed out for {request.full_url}")

        buf = io.StringIO()
        with patch("main.urllib.request.urlopen", boom), redirect_stdout(buf):
            post_failure_alert("MaizeMeals scraper failed.")
        logged = buf.getvalue()
        self.assertIn("could not be delivered", logged)
        self.assertNotIn(webhook, logged)
        self.assertNotIn("super-secret-token", logged)

    def test_webhook_post_sends_summary_and_does_not_log_url(self):
        webhook = "https://discord.example/api/webhooks/123/super-secret-token"
        os.environ["DISCORD_WEBHOOK_URL"] = webhook
        captured = {}

        class Response:
            def read(self):
                return b""

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        def fake_open(request, timeout=0):
            captured["url"] = request.full_url
            captured["body"] = request.data
            return Response()

        buf = io.StringIO()
        with patch("main.urllib.request.urlopen", fake_open), redirect_stdout(buf):
            post_failure_alert("Items saved: 0.")
        self.assertEqual(captured["url"], webhook)
        self.assertEqual(json.loads(captured["body"])["content"], "Items saved: 0.")
        self.assertNotIn(webhook, buf.getvalue())
        self.assertNotIn("super-secret-token", buf.getvalue())


class RunScraperTest(unittest.TestCase):
    def _patches(self, menu, hours=None):
        locations = [LOCATION]
        schedule = hours if hours is not None else [LUNCH_WINDOW]
        return (
            patch("main.get_supabase_client", return_value=object()),
            patch("main.fetch_locations", return_value=locations),
            patch("main.upsert_dining_hall"),
            patch("main.get_hall_id_map", return_value={(1, "DINING HALLS"): "hall-uuid"}),
            patch("main.fetch_meal_hours", return_value=schedule),
            patch("main.upsert_operating_hours"),
            patch("main.fetch_menu_data", side_effect=menu),
            patch("main.time.sleep"),
        )

    def test_successful_run_exits_zero_without_alert(self):
        patches = self._patches(lambda *_args: [{"name": "Soup"}])
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], patches[7], \
             patch("main.delete_events_for_date") as delete, \
             patch("main.upsert_items", return_value=2), \
             patch("main.post_failure_alert") as alert:
            code = run_scraper(days_ahead=1)
        self.assertEqual(code, 0)
        alert.assert_not_called()
        delete.assert_called_once()

    def test_meal_failure_exits_one_keeps_rows_and_alerts(self):
        def menu(*_args):
            raise RuntimeError("dining api down")

        patches = self._patches(menu)
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], patches[7], \
             patch("main.delete_events_for_date") as delete, \
             patch("main.upsert_items") as upsert, \
             patch("main.post_failure_alert") as alert:
            code = run_scraper(days_ahead=1)
        self.assertEqual(code, 1)
        delete.assert_not_called()
        upsert.assert_not_called()
        alert.assert_called_once()
        summary = alert.call_args.args[0]
        self.assertIn("Items saved: 0", summary)
        self.assertIn("kept existing menu", summary)

    def test_location_fetch_failure_exits_one_and_alerts(self):
        with patch("main.get_supabase_client", return_value=object()), \
             patch("main.fetch_locations", side_effect=APIHTTPError(503)), \
             patch("main.delete_events_for_date") as delete, \
             patch("main.post_failure_alert") as alert:
            code = run_scraper(days_ahead=1)
        self.assertEqual(code, 1)
        delete.assert_not_called()
        alert.assert_called_once()
        self.assertIn("Scraper error", alert.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
