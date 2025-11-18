"""Utility entrypoint for running the legacy SQL-based CSV importer."""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from flask import Flask

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Importing app config lazily keeps Flask isolated from deployments that never
# invoke the importer. The script still relies on app.py for models and helper
# functions.
from app import app as flask_app, process_backup_csv_files  # type: ignore


def configure_app(database_url: Optional[str]) -> Flask:
    app = flask_app
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    return app


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            'Run the archival CSV importer. This is only required when a new '
            'set of historical Strava exports must be synced into the SQL '
            'database.'
        )
    )
    parser.add_argument(
        '--backup-folder',
        dest='backup_folder',
        default=None,
        help=(
            'Path to the folder that contains the exported CSV files. '
            'Defaults to static/backup relative to the Flask app.'
        ),
    )
    parser.add_argument(
        '--database-url',
        dest='database_url',
        default=os.getenv('DATABASE_URL'),
        help='Optional SQLAlchemy database URL to override app configuration.',
    )
    parser.add_argument(
        '--log-level',
        dest='log_level',
        default=os.getenv('LOG_LEVEL', 'INFO'),
        help='Logging level (DEBUG, INFO, WARNING, ERROR).',
    )

    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))

    app = configure_app(args.database_url)

    with app.app_context():
        summary = process_backup_csv_files(source_folder=args.backup_folder)

    processed = [entry for entry in summary if entry['status'] == 'processed']
    errored = [entry for entry in summary if entry['status'] == 'error']

    print(f"Imported {len(processed)} file(s). {len(errored)} file(s) failed.")
    if errored:
        print('Failures:')
        for entry in errored:
            print(f" - {entry['filename']}: {entry.get('error', 'Unknown error')}")


if __name__ == '__main__':
    main()

