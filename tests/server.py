import http.server
import socketserver


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    with ThreadingHTTPServer(('127.0.0.1', 8080), http.server.SimpleHTTPRequestHandler) as httpd:
        print('Classroom CRM test server: http://127.0.0.1:8080/reference/index.html')
        httpd.serve_forever()
