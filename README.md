# League of Strava

This repository now treats the **Express + Google Sheets** stack as the canonical
backend for users, activities, and cached Strava payloads. The historical
Flask/SQL stack is retained only for one-off archival imports of CSV exports
that pre-date the OAuth workflow.

## Canonical backend
- `server.js` serves the dashboard, leaderboard, and OAuth redirect endpoints.
- Google Sheets (see `services/googleSheets.js`) is the source of truth for
  leaderboard rows and user progression snapshots.
- Persistent caches on disk (configured through `CACHE_STORAGE_DIR`) are used to
  avoid hitting Strava and Google APIs unnecessarily. The directory is created
  automatically by `services/cache.js`, but deployments should mount a
  writeable directory and pass its path through `CACHE_STORAGE_DIR` so cache
  files survive restarts.
- Deployments should run `npm start` (see the `Procfile`). All Python-related
  startup hooks have been removed.

## Archival CSV imports
When a legacy CSV export must be re-imported into SQL for posterity, run the
isolated importer script:

```bash
python scripts/import_archival_csv.py \
  --backup-folder path/to/static/backup \
  --database-url postgresql://user:pass@host/dbname
```

Key notes:
- The importer only runs when explicitly invoked; Express deployments never load
  Flask.
- CSVs default to `static/backup` relative to the repository. Set the
  `ARCHIVAL_CSV_FOLDER` environment variable or pass `--backup-folder` to point
  elsewhere.
- The script relies on the same models and processing helpers as the legacy app,
  so a SQL database (local SQLite or remote Postgres) must be reachable.

## Deployment checklist
1. Provision environment variables for Strava OAuth and Google Sheets
   (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `BASE_URL`, `SPREADSHEET_ID`,
   service-account credentials, etc.).
2. Set `CACHE_STORAGE_DIR` to a persistent location if the filesystem is
   ephemeral.
3. Run `npm install` followed by `npm start` (or use the provided `Procfile`).

With these changes, the dashboard always talks to a single backend, and the
archival importer remains available for the rare cases where SQL snapshots must
be updated.
