# classroom-crm
A digital homeroom teacher's cabinet (Classroom CRM). Static site: HTML5, CSS3, Vanilla JS, Tailwind; backend and DB mocked on the client. Five roles: admin, homeroom teacher, subject teacher, parent, student.

## Project structure

- `src/` — application source (ES modules: views, router, mock dataset and services)
- `scripts/` — build and code-generation scripts
- `reference/` — built self-contained site (generated, do not edit by hand)
- `tests/` — Playwright suite (specs, page-objects, fixtures, helpers, test server)
- `deploy/` — Dockerfile, docker-compose files and nginx configuration

## Build and run

```bash
npm ci                # install dependencies
npm run build:site    # build the site into reference/ (bundle + CSS + route pages)
```

Serve the built site locally (path-based routing: /login/, /journal/, ...):

```bash
python -m http.server 8080 -d reference
```

## Tests

```bash
npx playwright test   # webServer (tests/server.py) starts automatically
```

## Deploy

Docker image build, docker-compose files and nginx config live in `deploy/`;
see `.github/workflows/deploy.yml`.
