"""Local dev server for Newton: serves the repo root with caching disabled.

python -m http.server sends no cache headers, so browsers heuristically cache
old ES modules and keep running stale scene files after an edit.

Usage: python tools/serve.py [port]   (default 8080)
"""

import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"Serving {ROOT} on http://localhost:{port} (no-store)")
        server.serve_forever()


if __name__ == "__main__":
    main()
