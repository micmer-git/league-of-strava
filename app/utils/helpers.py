# app/utils/helpers.py

import pandas as pd
from datetime import datetime
from dateutil import parser

def convert_to_native(data):
    """
    Recursively convert pandas and numpy data types to native Python types.
    """
    if isinstance(data, dict):
        return {k: convert_to_native(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_to_native(item) for item in data]
    elif isinstance(data, (pd.Timestamp, datetime)):
        return data.isoformat()
    elif isinstance(data, (pd.Int64Dtype, int)):
        return int(data)
    elif isinstance(data, (pd.Float64Dtype, float)):
        return float(data)
    else:
        return data

def allowed_file(filename, allowed_extensions):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def extract_strava_id(link):
    """Extract Strava user ID from the link."""
    try:
        path = urlparse(link).path
        parts = path.strip('/').split('/')
        if len(parts) >= 2 and parts[0] == 'athletes':
            return parts[1]
        return None
    except Exception:
        return None

def replace_italian_month(date_str, month_map, month_pattern):
    """
    Replace Italian month abbreviations with English ones in the date string.
    """
    return month_pattern.sub(lambda match: month_map[match.group(1).lower()], date_str)

def parse_date(date_str, month_map, month_pattern):
    """
    Parse the date string, handling Italian month abbreviations.
    """
    # Replace Italian month abbreviations with English
    date_str = replace_italian_month(date_str, month_map, month_pattern)

    try:
        # First conversion attempt with inferred format
        return pd.to_datetime(date_str, errors='raise', dayfirst=False, infer_datetime_format=True)
    except:
        try:
            # Second conversion attempt with dayfirst=True
            return pd.to_datetime(date_str, errors='raise', dayfirst=True, infer_datetime_format=True)
        except:
            try:
                # As a last resort, use dateutil.parser
                return parser.parse(date_str, dayfirst=False, fuzzy=True)
            except:
                return pd.NaT
