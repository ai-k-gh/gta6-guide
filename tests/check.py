#!/usr/bin/env python3
"""Viewport overflow, topic filters, search, and closed spoiler checks."""
from __future__ import annotations

import http.server
import os
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):  # noqa: A003
        pass


def start_server():
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    port = httpd.server_address[1]
    return httpd, f"http://127.0.0.1:{port}/"


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def overflow(page, width: int):
    page.set_viewport_size({"width": width, "height": 800})
    data = page.evaluate(
        """() => {
      const doc = document.documentElement;
      const offenders = [];
      const limit = doc.clientWidth;
      if (doc.scrollWidth > limit + 1) {
        offenders.push({ sel: "html", sw: doc.scrollWidth, cw: limit });
      }
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > limit + 1 || r.left < -1) {
          const style = getComputedStyle(el);
          if (style.position === "fixed" || style.position === "sticky") return;
          if (style.overflowX === "auto" || style.overflowX === "scroll") return;
          offenders.push({
            sel: el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""),
            right: Math.round(r.right),
            left: Math.round(r.left),
            limit,
          });
        }
      });
      return offenders.slice(0, 8);
    }"""
    )
    assert_true(not data, f"horizontal overflow at {width}px: {data}")


def main():
    httpd, url = start_server()
    chrome = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page()
        try:
            page.goto(url, wait_until="networkidle")
            title = page.title()
            assert_true("非官方" in title, f"title should be unofficial, got: {title}")

            spoilers_open = page.eval_on_selector_all(
                "details.spoiler", "els => els.filter(e => e.open).length"
            )
            # eval_on_selector_all with expression returning number may not work that way
            spoilers_open = page.evaluate(
                "() => [...document.querySelectorAll('details.spoiler')].filter(e => e.open).length"
            )
            assert_true(spoilers_open == 0, f"spoilers should start closed, open={spoilers_open}")

            map_href = page.get_attribute("a.btn-link", "href")
            assert_true(
                map_href == "https://oplay.cc/gta6/map",
                f"map link should be external, got {map_href}",
            )

            visible_money = page.evaluate(
                "() => document.querySelectorAll('article[data-topic=\"money\"]:not(.hidden)').length"
            )
            assert_true(visible_money == 6, f"default money articles expected 6, got {visible_money}")

            page.select_option("#topic", "tips")
            tips = page.evaluate(
                "() => [...document.querySelectorAll('article.card:not(.hidden)')].map(e => e.getAttribute('data-topic'))"
            )
            assert_true(len(tips) == 4 and all(t == "tips" for t in tips), f"tips filter failed: {tips}")

            page.select_option("#topic", "hidden")
            hidden_all = page.evaluate(
                "() => document.querySelectorAll('article[data-topic=\"hidden\"]:not(.hidden)').length"
            )
            assert_true(hidden_all == 7, f"hidden all expected 7, got {hidden_all}")
            page.select_option("#hidden-filter", "egg")
            eggs = page.evaluate(
                "() => [...document.querySelectorAll('article[data-topic=\"hidden\"]:not(.hidden)')].map(e => e.getAttribute('data-kind'))"
            )
            assert_true(eggs == ["egg"], f"egg filter failed: {eggs}")

            page.select_option("#topic", "money")
            page.select_option("#money-filter", "ch2")
            ch2 = page.evaluate(
                "() => document.querySelectorAll('article[data-topic=\"money\"]:not(.hidden)').length"
            )
            assert_true(ch2 == 1, f"ch2 filter expected 1, got {ch2}")

            page.select_option("#money-filter", "all")
            page.fill("#search", "珠寶")
            jewels = page.evaluate(
                "() => [...document.querySelectorAll('article.card:not(.hidden)')].map(e => e.querySelector('h2')?.textContent)"
            )
            assert_true(any(t and "珠寶" in t for t in jewels), f"search for 珠寶 failed: {jewels}")

            page.fill("#search", "zzz-no-such-guide-term")
            empty_hidden = page.get_attribute("#empty", "hidden")
            none_visible = page.evaluate(
                "() => document.querySelectorAll('article.card:not(.hidden)').length"
            )
            assert_true(
                none_visible == 0 and empty_hidden is None,
                f"empty state failed visible={none_visible} hiddenAttr={empty_hidden}",
            )

            page.fill("#search", "")
            page.select_option("#topic", "money")
            for width in (320, 375, 390, 768):
                overflow(page, width)

            page.click('[data-mark="money-moses"]')
            pressed = page.get_attribute('[data-mark="money-moses"]', "aria-pressed")
            assert_true(pressed == "true", "mark toggle failed")
            page.reload(wait_until="networkidle")
            pressed2 = page.get_attribute('[data-mark="money-moses"]', "aria-pressed")
            assert_true(pressed2 == "true", "mark did not persist")

            print(
                "OK: filters, search, spoilers, map link, mobile widths 320/375/390/768, local marks"
            )
        finally:
            browser.close()
            httpd.shutdown()


if __name__ == "__main__":
    main()
