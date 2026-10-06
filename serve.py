import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        # Route root requests for favicons/manifest to assets/favicons
        clean_path = path.split('?', 1)[0].split('#', 1)[0]
        if clean_path in [
            '/favicon.ico', '/favicon.svg', '/site.webmanifest',
            '/apple-touch-icon.png', '/favicon-16x16.png', '/favicon-32x32.png',
            '/android-chrome-192x192.png', '/android-chrome-512x512.png'
        ]:
            path = '/assets/favicons' + clean_path
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128

def run():
    os.chdir(DIRECTORY)
    for port in [8080, 8081, 8082, 3000]:
        try:
            with ThreadingServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 60)
                print("  [*] FPS STRIKER // 3D FAST-PACED VOXEL FPS [*]")
                print("=" * 60)
                print(f"  Server running at: {url}")
                print("  Press Ctrl+C to stop.")
                print("=" * 60)
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        sys.exit(0)
