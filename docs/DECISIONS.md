# AJN Professional Player — Architecture Decisions

## Phase 0 — Rebuild Foundation

### D-001 Runtime port contract
The application listens on `process.env.PORT` when supplied, defaulting to `3000` for local development. Cloud Run deployment must supply its injected `PORT`.

### D-002 Development-only Vite loading
Vite is dynamically imported only in the development branch so production runtime does not require a dev-only Vite installation.

### D-003 Runtime proxy trust
Express is configured with `trust proxy = 1` for Cloud Run's reverse-proxy deployment topology.

### D-004 Node runtime
The application targets Node.js 22 or newer. The package contract declares `engines.node = >=22`.

### D-005 GitHub Pages deployment
The legacy Jekyll GitHub Pages workflow is removed from the rebuild path. Cloud Run is the intended application runtime. GitHub Pages may be restored later only as an explicitly separate static deployment.
