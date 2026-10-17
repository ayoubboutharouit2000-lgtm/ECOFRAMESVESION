#!/usr/bin/env python3
"""Local dev server that disables browser caching entirely.

`python -m http.server` sends no Cache-Control/ETag headers, so Chrome's
heuristic freshness caching can silently serve stale HTML/CSS/JS across
devices/sessions even after files change on disk. This wrapper adds
Cache-Control: no-store to every response so what you see is always
exactly what's on disk, on every device, no hard-refresh required.
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8934


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=PORT, bind="0.0.0.0")
