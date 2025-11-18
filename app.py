import os
import logging
from flask import Flask, render_template, request, redirect, url_for, flash, g, session
from werkzeug.utils import secure_filename
import pandas as pd
import dj_database_url
import json
import re
from urllib.parse import urlparse
import glob
import csv
from datetime import datetime, timedelta
from extensions import db, migrate  # Import from extensions
from config import *
from models import *
import numpy as np
from urllib.parse import urlencode

app = Flask(__name__)
# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secret_key')
app.config['STRAVA_CLIENT_ID'] = os.environ.get('STRAVA_CLIENT_ID', 'default_secret_key')
app.config['STRAVA_CLIENT_SECRET'] = os.environ.get('STRAVA_CLIENT_SECRET', 'default_secret_key')
app.config['REDIRECT_URI'] = os.environ.get('REDIRECT_URI', 'default_secret_key')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
REDIRECT_URI = os.environ.get('REDIRECT_URI')


if DATABASE_URL:
    # Adjust database URL if needed (e.g., for Heroku)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # Local development database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate.init_app(app, db)

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
APP_BACKUP_ENV_KEY = 'ARCHIVAL_CSV_FOLDER'


# General constants
CALORIE_ADJUSTMENT_FACTOR = 0.65



# Import models after initializing db to avoid circular imports
from models import User, Activity


def process_backup_csv_files(source_folder: str | None = None):
    """Process archived CSVs and persist them to the SQL database."""
    backup_folder = source_folder or os.getenv(APP_BACKUP_ENV_KEY)
    if not backup_folder:
        backup_folder = os.path.join(app.static_folder, 'backup')

    backup_folder = os.path.abspath(backup_folder)
    if not os.path.isdir(backup_folder):
        logging.warning(
            "Backup folder %s does not exist. Skipping archival import.",
            backup_folder,
        )
        return []

    csv_files = glob.glob(os.path.join(backup_folder, '*.csv'))
    print(f"CSV files found: {csv_files}")

    encodings_to_try = ['utf-8', 'iso-8859-1', 'cp1252', 'latin-1']

    results = []

    for csv_file in csv_files:
        print(f"Processing file: {csv_file}")
        try:
            # Extract username and strava_id from the filename
            base_filename = os.path.basename(csv_file)
            parts = base_filename.split('_')
            if len(parts) < 2:
                logging.error(f"Filename {base_filename} does not conform to expected format.")
                print(f"Filename {base_filename} does not conform to expected format.")
                continue

            username = parts[0]
            strava_id_with_ext = parts[1]
            strava_id = os.path.splitext(strava_id_with_ext)[0]
            strava_link = f'https://www.strava.com/athletes/{strava_id}'

            for encoding in encodings_to_try:
                try:
                    print(f"Trying encoding: {encoding}")
                    df = pd.read_csv(csv_file, encoding=encoding)

                    # Normalize headers
                    df.columns = df.columns.str.replace('’', "'", regex=False)

                    df, error = process_dataframe(df)  # Ensure this function is defined
                    if error:
                        logging.error(f"Error processing {csv_file}: {error}")
                        print(f"Error processing {csv_file}: {error}")
                        continue

                    # Calculate necessary metrics
                    achievements = calculate_achievements(df)    # Ensure this function is defined
                    coins = calculate_coins(df)                  # Ensure this function is defined
                    stats = calculate_stats(df)                  # Ensure this function is defined
                    total_hours = stats.get('hours', 0)
                    user_rank = get_user_rank(total_hours)       # Ensure this function is defined
                    max_metrics = calculate_max_metrics(df)      # Ensure this function is defined

                    # Check if user already exists
                    user = User.query.filter_by(username=username).first()

                    if user:
                        # Update existing user
                        user.strava_link = strava_link
                        user.rank_name = user_rank['current_rank']['name']
                        user.rank_emoji = user_rank['current_rank']['emoji']
                        user.total_hours = total_hours
                        user.coins_everest = coins.get('everest', 0)
                        user.coins_pizza = coins.get('pizza', 0)
                        user.coins_heartbeat = coins.get('heartbeat', 0)
                        user.achievements = achievements
                        user.stats = stats
                        user.max_elevation = max_metrics.get('max_elevation', 0)
                        user.max_elevation_link = max_metrics.get('max_elevation_link', '')
                        user.max_duration = max_metrics.get('max_duration', 0)
                        user.max_duration_link = max_metrics.get('max_duration_link', '')
                        user.max_distance = max_metrics.get('max_distance', 0)
                        user.max_distance_link = max_metrics.get('max_distance_link', '')
                        user.fastest_half_marathon = max_metrics.get('fastest_half_marathon', 0)
                        user.fastest_half_marathon_link = max_metrics.get('fastest_half_marathon_link', '#')
                        user.fastest_10k = max_metrics.get('fastest_10k', 0)
                        user.fastest_10k_link = max_metrics.get('fastest_10k_link', '#')
                        user.fastest_marathon = max_metrics.get('fastest_marathon', 0)
                        user.fastest_marathon_link = max_metrics.get('fastest_marathon_link', '#')
                    else:
                        # Create new user
                        user = User(
                            username=username,
                            strava_link=strava_link,
                            rank_name=user_rank['current_rank']['name'],
                            rank_emoji=user_rank['current_rank']['emoji'],
                            total_hours=total_hours,
                            coins_everest=coins.get('everest', 0),
                            coins_pizza=coins.get('pizza', 0),
                            coins_heartbeat=coins.get('heartbeat', 0),
                            achievements=achievements,
                            stats=stats,
                            max_elevation=max_metrics.get('max_elevation', 0),
                            max_elevation_link=max_metrics.get('max_elevation_link', ''),
                            max_duration=max_metrics.get('max_duration', 0),
                            max_duration_link=max_metrics.get('max_duration_link', ''),
                            max_distance=max_metrics.get('max_distance', 0),
                            max_distance_link=max_metrics.get('max_distance_link', ''),
                            fastest_half_marathon=max_metrics.get('fastest_half_marathon', 0),
                            fastest_half_marathon_link=max_metrics.get('fastest_half_marathon_link', '#'),
                            fastest_10k=max_metrics.get('fastest_10k', 0),
                            fastest_10k_link=max_metrics.get('fastest_10k_link', '#'),
                            fastest_marathon=max_metrics.get('fastest_marathon', 0),
                            fastest_marathon_link=max_metrics.get('fastest_marathon_link', '#'),
                        )
                        db.session.add(user)

                    db.session.commit()
                    logging.info(f"Processed user data for {username}")
                    print(f"Successfully processed {csv_file}")
                    results.append({
                        'filename': base_filename,
                        'status': 'processed',
                        'encoding': encoding,
                    })
                    break  # Break the encoding loop if successful

                except Exception as e:
                    db.session.rollback()  # Rollback the session on error
                    logging.exception(f"Error processing {csv_file} with encoding {encoding}: {str(e)}")
                    print(f"Error processing {csv_file} with encoding {encoding}: {str(e)}")
                    results.append({
                        'filename': base_filename,
                        'status': 'error',
                        'encoding': encoding,
                        'error': str(e),
                    })

        except Exception as outer_e:
            logging.exception(f"Failed to process {csv_file}: {str(outer_e)}")
            print(f"Failed to process {csv_file}: {str(outer_e)}")
            results.append({
                'filename': base_filename,
                'status': 'error',
                'error': str(outer_e),
            })

    logging.info("Finished processing backup CSV files")
    print("Finished processing backup CSV files")
    return results


# Set up detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Jinja filter for formatting duration
def format_duration(hours):
    """
    Convert a duration in hours (float) to a string formatted as 'X h Y m'.
    If the duration is 0 or None, return 'N/A'.
    """
    if hours is None or hours == 0:
        return 'N/A'
    h = int(hours)
    m = int(round((hours - h) * 60))
    return f"{h} h {m} m"

app.jinja_env.filters['format_duration'] = format_duration


def convert_to_native(obj):
    """
    Recursively convert pandas and numpy data types to native Python types.
    """
    try:
        if isinstance(obj, dict):
            return {k: convert_to_native(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_native(elem) for elem in obj]
        elif isinstance(obj, (pd.Timestamp, datetime)):
            return obj.isoformat()
        elif isinstance(obj, (np.integer, int)):
            return int(obj)
        elif isinstance(obj, (np.floating, float)):
            return float(obj)
        else:
            return obj
    except Exception as e:
        logging.error(f"Error converting object: {e}")
        return obj  # Return the object as-is if conversion fails


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_valid_csv(filepath):
    """
    Validate CSV content by attempting to read it with the csv module.
    Ensures the file is a well-formed CSV.
    """
    try:
        with open(filepath, newline='', encoding='utf-8') as csvfile:
            sniffer = csv.Sniffer()
            sample = csvfile.read(1024)
            csvfile.seek(0)
            dialect = sniffer.sniff(sample)
            has_header = sniffer.has_header(sample)
            reader = csv.reader(csvfile, dialect)
            for row in reader:
                pass  # Iterate to ensure readability
        return True
    except Exception as e:
        logging.error(f"CSV validation failed: {e}")
        return False

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

def process_dataframe(df):
    """
    Validate and process the uploaded CSV dataframe with support for Italian and English headers,
    handle comma decimals, replace 'Corsa' and 'Nuotata' with English equivalents,
    and ensure 'Moving_Time' is correctly parsed.

    Parameters:
    - df: pandas DataFrame

    Returns:
    - tuple: (processed DataFrame, error message or None)
    """
    logging.info("Starting CSV processing.")

    # Define column name lists for Italian and English CSVs


    # Define expected column counts
    expected_num_columns_italian = 80
    expected_num_columns_english = 94

    # Define known header samples for language detection
    italian_headers_sample = ['ID attività', "Data dell'attività", 'Nome attività']
    english_headers_sample = ['Activity ID', 'Activity Date', 'Activity Name']

    # Define month mapping for Italian to English


    # Compile a regex pattern for Italian month abbreviations
    month_pattern = re.compile(r'\b(' + '|'.join(month_map.keys()) + r')\b', re.IGNORECASE)

    # Detect language based on headers
    first_3_headers = df.columns.tolist()[:3]
    logging.info(f"First 3 headers: {first_3_headers}")

    if first_3_headers == italian_headers_sample:
        language = 'Italian'
        expected_num_columns = expected_num_columns_italian
        column_names = italian_column_names
        logging.info("Detected Italian CSV.")
    elif first_3_headers == english_headers_sample:
        language = 'English'
        expected_num_columns = expected_num_columns_english
        column_names = english_column_names
        logging.info("Detected English CSV.")
    else:
        error_msg = "Unsupported header language. Only Italian and English headers are supported."
        logging.error(error_msg)
        return None, error_msg

    # Validate column count
    actual_num_columns = df.shape[1]
    logging.info(f"Number of columns in CSV: {actual_num_columns}")
    if actual_num_columns < expected_num_columns:
        error_msg = f'Expected at least {expected_num_columns} columns for {language} CSV, found {actual_num_columns}'
        logging.error(error_msg)
        return None, error_msg

    # Assign column names
    df = df.iloc[:, :expected_num_columns]  # Truncate to expected columns
    df.columns = column_names
    logging.info(f"Assigned column names for {language} CSV.")

    # Validate presence of required columns
    required_columns = [
        'Activity_ID', 'Activity_Name', 'Activity_Date', 'Activity_Type',
        'Distance_1', 'Moving_Time', 'Elevation_Gain', 'Calories',
        'Average_Heart_Rate'
    ]
    for col in required_columns:
        if col not in df.columns:
            error_msg = f"Missing required column: {col}"
            logging.error(error_msg)
            return None, error_msg

    # Replace 'Corsa' with 'Run' and 'Nuotata' with 'Swim' across the entire DataFrame
    replacement_dict = {
        'Corsa': 'Run',
        'Nuotata': 'Swim',
        'Ciclismo': 'Ride'
    }

    # Define a regex pattern to match exact words (case-insensitive)
    pattern = re.compile(r'\b(' + '|'.join(re.escape(key) for key in replacement_dict.keys()) + r')\b', re.IGNORECASE)

    def replace_activity_types(x):
        if isinstance(x, str):
            # Function to replace matched word with its English equivalent
            match = pattern.search(x)
            if match:
                word = match.group(0)
                return pattern.sub(replacement_dict[word.capitalize()], x)
        return x

    # Apply the replacement across the entire DataFrame
    df = df.applymap(replace_activity_types)
    logging.info("Replaced 'Corsa' with 'Run' and 'Nuotata' with 'Swim' across the DataFrame.")



    if language == 'Italian':
        # Replace comma with dot in numeric columns for Italian CSV
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Replaced commas with dots in numeric columns for Italian CSV.")
    else:
        # For English CSVs, convert numeric columns directly
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Converted numeric columns for English CSV.")

    # Parse 'Activity_Date'
    df['Activity_Date'] = df['Activity_Date'].astype(str).apply(
        lambda x: parse_date(x, month_map, month_pattern)
    )
    num_invalid_dates = df['Activity_Date'].isna().sum()
    if num_invalid_dates > 0:
        logging.warning(f"Number of invalid 'Activity_Date' entries: {num_invalid_dates}")
        df = df.dropna(subset=['Activity_Date'])
        logging.info("Dropped rows with invalid 'Activity_Date'.")

    # Check if DataFrame is empty after dropping invalid dates
    if df.empty:
        error_msg = "The processed dataframe is empty after parsing 'Activity_Date'."
        logging.error(error_msg)
        return None, error_msg

    # Replace 'Corsa' and 'Nuotata' in 'Activity_Type' column explicitly
    df['Activity_Type'] = df['Activity_Type'].replace(replacement_dict, regex=False)
    logging.info("Explicitly replaced 'Corsa' and 'Nuotata' in 'Activity_Type' column.")

    # Ensure 'Moving_Time' is integer and non-null
    df['Moving_Time'] = pd.to_numeric(df['Moving_Time'], errors='coerce').fillna(0).astype(int)
    logging.info("Processed 'Moving_Time' to ensure it's integer and non-null.")

    # Assign 'Distance_km' based on 'Activity_Type'
    def assign_distance_km(row):
        activity_type = row.get('Activity_Type', '')
        distance = row.get('Distance_1', 0)

        if pd.isnull(distance):
            distance = 0

        if activity_type.lower() in ['swim']:
            return distance / 1000  # Convert meters to kilometers
        else:
            return distance  # Already in kilometers

    df['Distance_km'] = df.apply(assign_distance_km, axis=1)
    logging.info("Assigned 'Distance_km' based on 'Activity_Type'.")

    # Optionally, drop original Distance columns to avoid confusion
    #df.drop(['Distance_1', 'Distance_2'], axis=1, inplace=True, errors='ignore')
    #logging.info("Dropped 'Distance_1' and 'Distance_2' columns.")

    # Final Validation: Ensure no required fields have NaN or inappropriate values
    for col in required_columns:
        if df[col].isnull().any():
            logging.warning(f"Column '{col}' contains NaN values. These will be filled with default values.")
            if df[col].dtype == 'object':
                df[col] = df[col].fillna('')
            elif df[col].dtype in ['int64', 'float64']:
                df[col] = df[col].fillna(0)

    logging.info("CSV processing completed successfully.")
    return df, None

def calculate_rank(total_hours):
    """Determine the user's current and next rank based on total_hours."""
    current_rank = rank_config[0]
    next_rank = rank_config[1]

    for i, rank in enumerate(rank_config):
        if total_hours >= rank['minPoints']:
            current_rank = rank
            if i + 1 < len(rank_config):
                next_rank = rank_config[i + 1]
            else:
                next_rank = rank  # If at top rank
        else:
            break

    # Calculate progress percentage
    points_into_current_rank = total_hours - current_rank['minPoints']
    points_between_ranks = next_rank['minPoints'] - current_rank['minPoints']
    progress_percent = (points_into_current_rank / points_between_ranks) * 100 if points_between_ranks > 0 else 100
    return current_rank, next_rank, progress_percent


def calculate_achievements(df):
    """
    Calculate user achievements based on activities across various timeframes.

    Parameters:
    - df (pd.DataFrame): DataFrame containing user activities.

    Returns:
    - dict: Structured achievements and medals categorized by timeframe.
    """

    # Define the current date based on the max Activity_Date in the dataframe or today
    if not df.empty:
        current_date = df['Activity_Date'].max().normalize()
    else:
        current_date = pd.Timestamp.today().normalize()

    # Define the timeframes
    timeframes = {
        'all_time': {
            'start_date': pd.Timestamp.min,
            'end_date': current_date
        },
        '7_D': {
            'start_date': current_date - pd.Timedelta(days=6),
            'end_date': current_date
        },
        '14_D': {
            'start_date': current_date - pd.Timedelta(days=13),
            'end_date': current_date
        },
        '30_D': {
            'start_date': current_date - pd.Timedelta(days=29),
            'end_date': current_date
        },
        'YTD': {
            'start_date': pd.Timestamp(year=current_date.year, month=1, day=1),
            'end_date': current_date
        },
        '365_D': {
            'start_date': current_date - pd.Timedelta(days=364),
            'end_date': current_date
        }
    }

    # Initialize the achievements dictionary
    achievements = {}

    # Iterate over each timeframe and compute achievements
    for timeframe, dates in timeframes.items():
        start_date = dates['start_date']
        end_date = dates['end_date']

        # Filter dataframe for the current timeframe
        mask = (df['Activity_Date'] >= start_date) & (df['Activity_Date'] <= end_date)
        df_tf = df.loc[mask].copy()

        # Initialize the structure for the current timeframe
        achievements[timeframe] = {
            'categories': [],
            'Medals': []  # Unified list for all medals and special achievements
        }

        # Initialize categories dictionary
        for category, intro in categories_info.items():
            achievements[timeframe]['categories'].append({
                'name': category,
                'intro': intro,
                'achievements': []
            })

        # ------------------ Achievements Calculation ------------------

        # Sort activities by date
        df_sorted = df_tf.sort_values('Activity_Date').copy()
        df_sorted['Date'] = df_sorted['Activity_Date'].dt.date

        # Unique sorted dates
        unique_dates = sorted(df_sorted['Date'].dropna().unique())

        # Calculate Longest Streak (Consecutive Days with Activities)
        max_streak = 1
        current_streak = 1
        for i in range(1, len(unique_dates)):
            if (unique_dates[i] - unique_dates[i-1]).days == 1:
                current_streak += 1
                if current_streak > max_streak:
                    max_streak = current_streak
            else:
                current_streak = 1

        # Streak Achievement
        streak_achievement = {
            'name': 'Longest Streak',
            'emoji': '🔥',
            'description': 'Longest consecutive days with activities',
            'count': int(max_streak)
        }

        # Consistency Achievements
        # Weekly Consistency
        df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
        weekly_days = df_sorted.groupby('Week')['Date'].nunique()

        # Monthly Consistency
        df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
        monthly_days = df_sorted.groupby('Month')['Date'].nunique()
        months_unique = df_sorted['Month'].unique()
        monthly_consistent = 0
        for month in months_unique:
            month_start = month.start_time
            month_end = month.end_time
            days_in_month = (month_end - month_start).days + 1
            active_days = monthly_days.get(month, 0)
            if active_days == days_in_month:
                monthly_consistent += 1

        consistency_achievements = []


        # ------------------ Categories Achievements ------------------


        for idx, threshold in enumerate(distance_run_badges['thresholds']):
            emoji = distance_run_badges['emoji_sequence'][idx] if idx < len(distance_run_badges['emoji_sequence']) else '🏅'

            if threshold >= 50:
                # Weekly threshold for Run
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_distance = df_sorted[df_sorted['Activity_Type'] == 'Run'].groupby('Week')['Distance_km'].sum()
                count = int((weekly_distance >= threshold).sum())
                name = f'{threshold}k Run/Week'
                description = f'Completed at least {threshold} km running in a week'
            else:
                # Per activity threshold for Run
                count = int(df_sorted[(df_sorted['Distance_km'] >= threshold) & (df_sorted['Activity_Type'] == 'Run')].shape[0])
                name = f'{threshold}k Run'
                description = f'Completed activities covering at least {threshold} km running'

            # Assign to 'Run' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Run':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

        # ========== Distance Ride Badges ==========


        for idx, threshold in enumerate(distance_ride_badges['thresholds']):
            emoji = distance_ride_badges['emoji_sequence'][idx] if idx < len(distance_ride_badges['emoji_sequence']) else '🚴‍♂️'

            if threshold >= 300:
                # Weekly threshold for Ride
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_distance = df_sorted[df_sorted['Activity_Type'] == 'Ride'].groupby('Week')['Distance_km'].sum()
                count = int((weekly_distance >= threshold).sum())
                name = f'{threshold}k Ride/Week'
                description = f'Completed at least {threshold} km riding in a week'
            else:
                # Per activity threshold for Ride
                count = int(df_sorted[(df_sorted['Distance_km'] >= threshold) & (df_sorted['Activity_Type'] == 'Ride')].shape[0])
                name = f'{threshold}k Ride'
                description = f'Completed activities covering at least {threshold} km riding'

            # Assign to 'Ride' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Ride':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break


        for idx, threshold in enumerate(elevation_thresholds):
            if idx < len(elevation_emojis):
                emoji = elevation_emojis[idx]
            else:
                emoji = '🏅'  # Default emoji if overflow

            if threshold == 4424:
                name = 'Half Everest'
                description = 'Completed activities with elevation gain of at least Half Everest (4424 meters)'
            elif threshold == 25000:
                name = '25k Elevation/Month'
                description = 'Achieved a total of 25,000 meters elevation gain in a month'
            elif threshold == 10000:
                name = '10k Elevation/Week'
                description = 'Achieved a total of 10,000 meters elevation gain in a week'
            else:
                name = f'{threshold}m Elevation'
                description = f'Completed activities with elevation gain of at least {threshold} meters'

            if threshold == 25000:
                # Monthly elevation threshold
                df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
                monthly_elevation = df_sorted.groupby('Month')['Elevation_Gain'].sum()
                count = int((monthly_elevation >= threshold).sum())

            elif threshold == 10000:
                # Weekly elevation threshold
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_elevation = df_sorted.groupby('Week')['Elevation_Gain'].sum()
                count = int((weekly_elevation >= threshold).sum())
            else:
                # Per activity elevation threshold
                count = int(df_sorted[df_sorted['Elevation_Gain'] >= threshold].shape[0])

            # Assign to 'Elevation' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Elevation':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

        # ========== KCal Badges ==========

        # Assign KCal Achievements to 'KCal' category
        for category in achievements[timeframe]['categories']:
            if category['name'] == 'KCal':
                # Per Activity KCal Badges
                for threshold, emoji in zip(kcal_badges['Per Activity']['thresholds'], kcal_badges['Per Activity']['emojis']):
                    count = int(df_sorted[df_sorted['Calories'] >= threshold].shape[0])
                    kcal_achievement = {
                        'name': f'{threshold}kCal Activity',
                        'emoji': emoji,
                        'description': kcal_badges['Per Activity']['description'].format(threshold),
                        'count': count
                    }
                    category['achievements'].append(kcal_achievement)

                # Weekly KCal Badges
                weekly_kcal = df_sorted.groupby('Week')['Calories'].sum()
                for threshold, emoji in zip(kcal_badges['Weekly']['thresholds'], kcal_badges['Weekly']['emojis']):
                    count = int((weekly_kcal >= threshold).sum())
                    kcal_week_achievement = {
                        'name': f'{threshold}kCal Week',
                        'emoji': emoji,
                        'description': kcal_badges['Weekly']['description'].format(threshold),
                        'count': count
                    }
                    category['achievements'].append(kcal_week_achievement)

                break

        # ------------------ Integrate All Achievements into Medals ------------------
        additional_medals = [
            {
                'name': 'Steep Climber',
                'emoji': '🧗‍♀️',
                'description': 'Logged an activity with elevation gain > 3000m and distance < 100 km',
                'count': int(df_tf[(df_tf['Elevation_Gain'] > 3000) & (df_tf['Distance_km'] < 100)].shape[0]),
            },
            {
                'name': 'Coppa Coppi Protector',
                'emoji': '🥩',
                'description': 'Logged an activity with elevation gain > 2000m and distance < 100 km',
                'count': int(df_tf[(df_tf['Elevation_Gain'] > 2000) & (df_tf['Distance_km'] < 100)].shape[0]),
            },
        {
            'name': '7-Day Caloric Champion',
            'emoji': '📅🔥',
            'description': 'Logged at least 1000 kcal consumed each day for 7 consecutive days',
            'count': int(
                (df_sorted.groupby('Date')['Calories'].sum()
                 .ge(1000)
                 .rolling(7)
                 .sum() == 7).sum())
        },
        {
            'name': 'Marathon Master',
            'emoji': '🏃‍♂️',
            'description': 'Completed a marathon (42.195 km)',
            'count': int(df_tf[
                (df_tf['Activity_Type'].str.contains('Run', case=False, na=False)) &
                (df_tf['Distance_km'] >= 42.195)
            ].shape[0]),
        },
        {
            'name': 'Half Marathon Master',
            'emoji': '👟',
            'description': 'Completed a half marathon (21.0975 km)',
            'count': int(df_tf[
                (df_tf['Activity_Type'].str.contains('Run', case=False, na=False)) &
                (df_tf['Distance_km'] >= 21.0975)
            ].shape[0]),
        },
        {
            'name': 'Climbing King',
            'emoji': '🧗‍♂️',
            'description': 'Total Elevation_Gain over 1000m',
            'count': int(df_tf['Elevation_Gain'].sum() // 1000),
        },
        {
            'name': 'Speedster',
            'emoji': '🏎️',
            'description': 'Achieved an average speed over 30 km/h',
            'count': int(df_tf['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df_tf.columns else 0,
        }
        ]



        # Assign Special Occasions Medals
        df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

        for occasion in special_occasions:
            count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
            achievements[timeframe]['Medals'].append({
                'name': occasion['name'],
                'emoji': occasion['emoji'],
                'description': occasion['description'],
                'count': count
            })

        # ------------------ Additional Medals ------------------
        # Define additional Medals with their respective emojis


        for medal in additional_medals:
            achievements[timeframe]['Medals'].append({
                'name': medal['name'],
                'emoji': medal['emoji'],
                'description': medal['description'],
                'count': medal['count']
            })
    # Convert all NumPy types to native Python types if necessary
    achievements = convert_to_native(achievements)
    return achievements


def calculate_rank_info(total_hours):
    """Determine user's rank and progress."""
    current_rank, next_rank, progress_percent = calculate_rank(total_hours)
    return {
        'current_rank': current_rank,
        'next_rank': next_rank,
        'progress_percent': round(progress_percent, 1),
        'current_points': round(total_hours, 1),
        'next_rank_minPoints': next_rank['minPoints']
    }

def calculate_rank(total_hours):
    """Determine the user's current and next rank based on total_hours."""
    current_rank = rank_config[0]
    next_rank = rank_config[1]

    for i, rank in enumerate(rank_config):
        if total_hours >= rank['minPoints']:
            current_rank = rank
            if i + 1 < len(rank_config):
                next_rank = rank_config[i + 1]
            else:
                next_rank = rank  # If at top rank
        else:
            break

    # Calculate progress percentage
    points_into_current_rank = total_hours - current_rank['minPoints']
    points_between_ranks = next_rank['minPoints'] - current_rank['minPoints']
    progress_percent = (points_into_current_rank / points_between_ranks) * 100 if points_between_ranks > 0 else 100
    return current_rank, next_rank, progress_percent



def calculate_coins(df):
    """Calculate coins based on activities."""
    elevation_gain = df['Elevation_Gain'].sum() if 'Elevation_Gain' in df else 0
    calories_series = df['Calories'] if 'Calories' in df else pd.Series(dtype=float)
    adjusted_calories = calories_series.fillna(0) * CALORIE_ADJUSTMENT_FACTOR
    average_hr_series = df['Average_Heart_Rate'] if 'Average_Heart_Rate' in df else pd.Series(dtype=float)

    coins = {
        'everest': float(round(elevation_gain / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(adjusted_calories.sum() / 1000, 2)),  # 1 Pizza = 1000 kcal
        'heartbeat': int(average_hr_series.fillna(0).sum() / 1000)  # 1 Heartbeat Coin = 1 heartbeat (adjust as needed)
    }
    coins = convert_to_native(coins)
    return coins
def calculate_stats(df):
    """Calculate user statistics, including average temperature, total likes, and most common hour."""
    adjusted_calories = 0
    if 'Calories' in df:
        adjusted_calories = float(round((df['Calories'].fillna(0) * CALORIE_ADJUSTMENT_FACTOR).sum(), 1))

    stats = {
        'hours': float(round(df['Moving_Time'].sum() / 3600, 1)),        # Convert to hours
        'distance': float(round(df['Distance_km'].sum(), 1)),           # Already in km
        'elevation': float(round(df['Elevation_Gain'].sum(), 1)),       # in meters
        'bpm': float(round(df['Average_Heart_Rate'].mean(), 1)),       # in meters
        'calories': adjusted_calories,              # in kcal
    }

    # Ensure calories are included even when the column is missing
    if 'Calories' not in df:
        stats['calories'] = 0.0

    # Compute Average Temperature
    if 'Average_Temperature' in df.columns:
        stats['average_temperature'] = float(round(df['Average_Temperature'].mean(), 1))
    else:
        stats['average_temperature'] = 0.0
        logging.warning("'Average_Temperature' column not found in DataFrame.")

    # Compute Total Likes
    if 'Likes' in df.columns:
        # Replace commas with dots and convert to numeric if necessary
        df['Likes'] = pd.to_numeric(df['Likes'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        stats['total_likes'] = int(df['Likes'].sum())
    else:
        stats['total_likes'] = 0
        logging.warning("'Likes' column not found in DataFrame. Setting 'total_likes' to 0.")

    # Compute Most Common Hour
    if 'Activity_Date' in df.columns:
        # Ensure 'Activity_Date' is datetime
        df['Activity_Date'] = pd.to_datetime(df['Activity_Date'], errors='coerce')
        df = df.dropna(subset=['Activity_Date'])  # Drop rows where date parsing failed
        if not df.empty:
            stats['most_common_hour'] = int(df['Activity_Date'].dt.hour.mode()[0])
        else:
            stats['most_common_hour'] = None
            logging.warning("No valid 'Activity_Date' entries found for computing 'most_common_hour'.")
    else:
        stats['most_common_hour'] = None
        logging.warning("'Activity_Date' column not found in DataFrame. Cannot compute 'most_common_hour'.")

    # Optional: Compute Sums of Other Relevant Metrics
    # Example: Total Steps, Total Jump Count, etc.
    sum_metrics = ['Total_Steps', 'Jump_Count']  # Add other metrics as needed
    for metric in sum_metrics:
        if metric in df.columns:
            stats[f'total_{metric.lower()}'] = int(df[metric].sum())
        else:
            stats[f'total_{metric.lower()}'] = 0
            logging.warning(f"'{metric}' column not found in DataFrame. Setting 'total_{metric.lower()}' to 0.")

    stats = convert_to_native(stats)
    return stats


def calculate_dollars(achievements, timeframe='all_time'):
    """Compute total dollars generated from achievements and medals."""
    if not achievements or timeframe not in achievements:
        return 0

    timeframe_data = achievements.get(timeframe, {}) or {}
    total_dollars = 0

    for category in timeframe_data.get('categories', []):
        for badge in category.get('achievements', []):
            total_dollars += badge.get('count', 0) * 1000

    for medal in timeframe_data.get('Medals', []):
        total_dollars += medal.get('count', 0) * 5000

    return int(total_dollars)

def get_user_rank(total_hours):
    """Determine user's rank and progress."""
    current_rank, next_rank, progress_percent = calculate_rank(total_hours)
    return {
        'current_rank': current_rank,
        'next_rank': next_rank,
        'progress_percent': round(progress_percent, 1),
        'current_points': round(total_hours, 1),
        'next_rank_minPoints': next_rank['minPoints']
    }

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

def calculate_max_metrics(df):
    """Determine the user's top activities, including fastest 10K and Marathon."""
    if df.empty:
        return {
            'max_elevation': 0,
            'max_elevation_link': '#',
            'max_duration': 0,
            'max_duration_link': '#',
            'max_distance': 0,
            'max_distance_link': '#',
            'fastest_half_marathon': 0,
            'fastest_half_marathon_link': '#',
            'fastest_10k': 0,
            'fastest_10k_link': '#',
            'fastest_marathon': 0,
            'fastest_marathon_link': '#',
        }

    df['Type'] = df['Type'].astype(str)

    # Max Elevation Gain
    max_elevation = df['Elevation_Gain'].max()
    max_elevation_activity = df.loc[df['Elevation_Gain'].idxmax()]
    max_elevation_link = f"https://www.strava.com/activities/{max_elevation_activity['Activity_ID']}"

    # Max Duration
    max_duration = df['Moving_Time'].max() / 3600  # Convert to hours
    max_duration_activity = df.loc[df['Moving_Time'].idxmax()]
    max_duration_link = f"https://www.strava.com/activities/{max_duration_activity['Activity_ID']}"

    # Max Distance
    max_distance = df['Distance_km'].max()  # Already in km
    max_distance_activity = df.loc[df['Distance_km'].idxmax()]
    max_distance_link = f"https://www.strava.com/activities/{max_distance_activity['Activity_ID']}"

    # Fastest Half Marathon (Minimum Duration for Distance >= 21.0975 km)
    half_marathons = df[df['Distance_km'] >= 21]
    half_marathons = half_marathons[half_marathons['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not half_marathons.empty:
        fastest_half_marathon_duration = half_marathons['Moving_Time'].min() / 3600  # in hours
        fastest_half_marathon_activity = half_marathons.loc[half_marathons['Moving_Time'].idxmin()]
        fastest_half_marathon_link = f"https://www.strava.com/activities/{fastest_half_marathon_activity['Activity_ID']}"
    else:
        fastest_half_marathon_duration = 0
        fastest_half_marathon_link = '#'

    # Fastest Marathon (Minimum Duration for Distance >= 42.195 km)
    marathons = df[df['Distance_km'] >= 42]
    marathons = marathons[marathons['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not marathons.empty:
        fastest_marathon_duration = marathons['Moving_Time'].min() / 3600  # in hours
        fastest_marathon_activity = marathons.loc[marathons['Moving_Time'].idxmin()]
        fastest_marathon_link = f"https://www.strava.com/activities/{fastest_marathon_activity['Activity_ID']}"
    else:
        fastest_marathon_duration = 0
        fastest_marathon_link = '#'

    # Fastest 10K (Minimum Duration for Distance >= 10 km)
    ten_k_runs = df[df['Distance_km'] >= 10]
    ten_k_runs = ten_k_runs[ten_k_runs['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not ten_k_runs.empty:
        fastest_10k_duration = ten_k_runs['Moving_Time'].min() / 3600  # in hours
        fastest_10k_activity = ten_k_runs.loc[ten_k_runs['Moving_Time'].idxmin()]
        fastest_10k_link = f"https://www.strava.com/activities/{fastest_10k_activity['Activity_ID']}"
    else:
        fastest_10k_duration = 0
        fastest_10k_link = '#'

    return {
        'max_elevation': float(max_elevation),
        'max_elevation_link': max_elevation_link,
        'max_duration': float(round(max_duration, 2)),
        'max_duration_link': max_duration_link,
        'max_distance': float(round(max_distance, 2)),
        'max_distance_link': max_distance_link,
        'fastest_half_marathon': float(round(fastest_half_marathon_duration, 2)),
        'fastest_half_marathon_link': fastest_half_marathon_link,
        'fastest_10k': float(round(fastest_10k_duration, 2)),
        'fastest_10k_link': fastest_10k_link,
        'fastest_marathon': float(round(fastest_marathon_duration, 2)),
        'fastest_marathon_link': fastest_marathon_link,
    }

# Routes

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/', methods=['GET', 'POST'])
def upload_activities():
    if request.method == 'POST':
        # Existing upload logic...
        # Handle the activities.csv upload
        username = request.form.get('username')
        link = request.form.get('link')
        file = request.files.get('file')

        if file and file.filename.endswith('.csv'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            flash('Activities.csv uploaded successfully!', 'success')
            # Process the CSV as needed
        else:
            flash('Please upload a valid CSV file.', 'danger')

    strava_connected = 'access_token' in session
    athlete = session.get('athlete', None)
    return render_template('index.html', strava_connected=strava_connected, athlete=athlete)


def fetch_last_10_activities(access_token):
    activities_url = 'https://www.strava.com/api/v3/athlete/activities'
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    params = {
        'per_page': 10,
        'page': 1
    }

    response = requests.get(activities_url, headers=headers, params=params)
    if response.status_code != 200:
        flash('Failed to fetch activities from Strava.', 'danger')
        return []

    activities = response.json()
    # Optionally, process activities to extract required fields
    processed_activities = []
    for activity in activities:
        processed_activities.append({
            'name': activity.get('name'),
            'distance': activity.get('distance') / 1000,  # Convert to kilometers
            'moving_time': str(datetime.utcfromtimestamp(activity.get('moving_time')).strftime('%H:%M:%S')),
            'type': activity.get('type'),
            'start_date': activity.get('start_date_local'),
            'average_speed': activity.get('average_speed') * 3.6,  # Convert to km/h
            'map': activity.get('map', {}).get('summary_polyline', '')
        })
    return processed_activities

@app.route('/strava/disconnect')
def disconnect_strava():
    session.pop('access_token', None)
    session.pop('refresh_token', None)
    session.pop('expires_at', None)
    session.pop('athlete', None)
    flash('Disconnected from Strava successfully.', 'success')
    return redirect(url_for('upload_activities'))

def index():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        strava_link = request.form.get('link').strip()  # New Field
        if not username or not strava_link:
            flash('Please enter both username and Strava profile link.', 'danger')
            return redirect(request.url)

        # Check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part in the request.', 'danger')
            return redirect(request.url)

        file = request.files['file']
        if file.filename == '':
            flash('No file selected.', 'danger')
            return redirect(request.url)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            try:
                df = pd.read_csv(filepath)
                df, error = process_dataframe(df)
                if error:
                    flash(error, 'danger')
                    return redirect(request.url)

                # Calculate achievements, coins, stats
                achievements = calculate_achievements(df)
                coins = calculate_coins(df)
                stats = calculate_stats(df)
                total_hours = stats['hours']
                user_rank = get_user_rank(total_hours)
                max_metrics = calculate_max_metrics(df)

                # Check if user with the same strava_link already exists
                user = User.query.filter_by(strava_link=strava_link).first()
                if user:
                    # Update existing user
                    user.username = username  # Optionally update username
                    user.rank_name = user_rank['current_rank']['name']
                    user.rank_emoji = user_rank['current_rank']['emoji']
                    user.total_hours = total_hours
                    user.coins_everest = coins['everest']
                    user.coins_pizza = coins['pizza']
                    user.coins_heartbeat = coins['heartbeat']
                    user.achievements = achievements
                    user.stats = stats
                    user.max_elevation = max_metrics['max_elevation']
                    user.max_elevation_link = max_metrics['max_elevation_link']
                    user.max_duration = max_metrics['max_duration']
                    user.max_duration_link = max_metrics['max_duration_link']
                    user.max_distance = max_metrics['max_distance']
                    user.max_distance_link = max_metrics['max_distance_link']

                    # Assign New Fields
                    user.fastest_half_marathon = max_metrics.get('fastest_half_marathon', 0)
                    user.fastest_half_marathon_link = max_metrics.get('fastest_half_marathon_link', '#')
                    user.fastest_10k = max_metrics.get('fastest_10k', 0)
                    user.fastest_10k_link = max_metrics.get('fastest_10k_link', '#')
                    user.fastest_marathon = max_metrics.get('fastest_marathon', 0)
                    user.fastest_marathon_link = max_metrics.get('fastest_marathon_link', '#')

                    # Delete existing activities
                    Activity.query.filter_by(user_id=user.id).delete()
                else:
                    # Create new user
                    user = User(
                        username=username,
                        strava_link=strava_link,  # Assign the Strava link
                        rank_name=user_rank['current_rank']['name'],
                        rank_emoji=user_rank['current_rank']['emoji'],
                        total_hours=total_hours,
                        coins_everest=coins['everest'],
                        coins_pizza=coins['pizza'],
                        coins_heartbeat=coins['heartbeat'],
                        achievements=achievements,
                        stats=stats,
                        max_elevation=max_metrics['max_elevation'],
                        max_elevation_link=max_metrics['max_elevation_link'],
                        max_duration=max_metrics['max_duration'],
                        max_duration_link=max_metrics['max_duration_link'],
                        max_distance=max_metrics['max_distance'],
                        max_distance_link=max_metrics['max_distance_link'],
                        fastest_half_marathon=max_metrics.get('fastest_half_marathon', 0),
                        fastest_half_marathon_link=max_metrics.get('fastest_half_marathon_link', '#'),
                        fastest_10k=max_metrics.get('fastest_10k', 0),
                        fastest_10k_link=max_metrics.get('fastest_10k_link', '#'),
                        fastest_marathon=max_metrics.get('fastest_marathon', 0),
                        fastest_marathon_link=max_metrics.get('fastest_marathon_link', '#'),
                    )
                    db.session.add(user)
                    db.session.flush()  # Flush to get user.id

                # Add activities
                for _, row in df.iterrows():
                    # Extract essential fields
                    activity_id = row['Activity_ID']
                    name = row['Activity_Name']
                    date = row['Activity_Date']
                    distance = row['Distance_km']  # Already in km
                    moving_time = row['Moving_Time']
                    duration = row['Moving_Time'] / 3600  # Convert to hours
                    duration_minutes = int((row['Moving_Time'] % 3600) / 60)
                    elevation_gain = row['Elevation_Gain']
                    raw_calories = pd.to_numeric(row.get('Calories', 0), errors='coerce')
                    raw_calories = 0 if pd.isna(raw_calories) else float(raw_calories)
                    calories = raw_calories * CALORIE_ADJUSTMENT_FACTOR
                    max_heart_rate = row['Max_Heart_Rate_1']  # or 'Max_Heart_Rate_2' based on your logic
                    heartbeats = int(max_heart_rate * (moving_time / 60))  # Example calculation
                    coins_everest = round(elevation_gain / 8848, 2)
                    coins_pizza = round(calories / 1000, 2)
                    coins_heartbeat = heartbeats
                    link = f"https://www.strava.com/activities/{activity_id}"

                    # Collect additional data
                    additional_data = row.to_dict()

                    # Remove already stored fields to avoid duplication
                    for key in [
                        'Activity_ID', 'Activity_Date', 'Activity_Name', 'Activity_Type', 'Activity_Description',
                        'Elapsed_Time_1', 'Distance_1', 'Max_Heart_Rate_1', 'Relative_Effort_1',
                        'Commute_1', 'Activity_Private_Note', 'Activity_Gear_1', 'Filename',
                        'Athlete_Weight', 'Bike_Weight', 'Elapsed_Time_2', 'Moving_Time',
                        'Distance_2', 'Max_Speed', 'Average_Speed', 'Elevation_Gain',
                        'Elevation_Loss', 'Elevation_Low', 'Elevation_High', 'Max_Grade',
                        'Average_Grade_1', 'Average_Positive_Grade', 'Average_Negative_Grade',
                        'Max_Cadence', 'Average_Cadence', 'Max_Heart_Rate_2', 'Average_Heart_Rate',
                        'Max_Watts', 'Average_Watts', 'Calories', 'Max_Temperature',
                        'Average_Temperature', 'Relative_Effort_2', 'Total_Work',
                        'Number_of_Runs', 'Uphill_Time', 'Downhill_Time', 'Other_Time',
                        'Perceived_Exertion_1', 'Type', 'Start_Time', 'Weighted_Average_Power',
                        'Power_Count', 'Prefer_Perceived_Exertion', 'Perceived_Relative_Effort',
                        'Commute_2', 'Total_Weight_Lifted', 'From_Upload',
                        'Grade_Adjusted_Distance', 'Weather_Observation_Time', 'Weather_Condition',
                        'Weather_Temperature', 'Apparent_Temperature', 'Dewpoint', 'Humidity',
                        'Weather_Pressure', 'Wind_Speed', 'Wind_Gust', 'Wind_Bearing',
                        'Precipitation_Intensity', 'Sunrise_Time', 'Sunset_Time', 'Moon_Phase',
                        'Bike_1', 'Gear', 'Precipitation_Probability', 'Precipitation_Type',
                        'Cloud_Cover', 'Weather_Visibility', 'UV_Index', 'Weather_Ozone',
                        'Jump_Count', 'Total_Grit', 'Average_Flow', 'Flagged',
                        'Average_Elapsed_Speed', 'Dirt_Distance', 'Newly_Explored_Distance',
                        'Newly_Explored_Dirt_Distance', 'Activity_Count', 'Total_Steps',
                        'Carbon_Saved', 'Pool_Length', 'Training_Load', 'Intensity',
                        'Average_Grade_Adjusted_Pace', 'Timer_Time', 'Total_Cycles', 'Media'
                    ]:
                        additional_data.pop(key, None)

                    activity = Activity(
                        activity_id=activity_id,
                        name=name,
                        date=date,
                        distance=distance,  # Already in km
                        duration=duration,
                        duration_minutes=duration_minutes,
                        elevation_gain=elevation_gain,
                        calories=calories,
                        heartbeats=heartbeats,
                        coins_everest=coins_everest,
                        coins_pizza=coins_pizza,
                        coins_heartbeat=coins_heartbeat,
                        link=link,
                        user_id=user.id,
                        additional_data=additional_data  # Store the remaining data
                    )
                    db.session.add(activity)

                db.session.commit()
                flash('File successfully uploaded and processed!', 'success')
                return redirect(url_for('dashboard', username=username))

            except Exception as e:
                logging.exception("Error processing the file.")
                flash(f'An error occurred during processing: {e}', 'danger')
                return redirect(request.url)
        else:
            flash('Invalid file type. Please upload a CSV file.', 'danger')
            return redirect(request.url)

    return render_template('index.html')


@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard_search():
    if request.method == 'GET':
        link = request.args.get('link', '').strip()
        username = request.args.get('username', '').strip()
        #athlete_id = request.args.get('athlete_id', '').strip()

        user = None

        if link:
            user = User.query.filter_by(strava_link=link).first()
        elif username:
            user = User.query.filter_by(username=username).first()
        else:
            flash('Please provide a search query.', 'danger')
            return redirect(url_for('index'))

        if user:
            return redirect(url_for('dashboard', username=user.username))
        else:
            flash('User not found.', 'danger')
            return redirect(url_for('index'))

    return redirect(url_for('index'))


@app.route('/dashboard/<username>')
def dashboard(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        flash('User not found. Please upload your CSV first.', 'danger')
        return redirect(url_for('index'))

    # Fetch user activities, ordered by date descending
    activities = Activity.query.filter_by(user_id=user.id).order_by(Activity.date.desc()).all()
    activities_list = []
    for activity in activities:
        activities_list.append({
            'id': activity.activity_id,
            'name': activity.name,
            'date': activity.date.strftime('%b %d, %Y'),
            'distance': activity.distance,
            'duration': activity.duration,
            'duration_minutes': activity.duration_minutes,
            'elevation_gain': activity.elevation_gain,
            'calories': activity.calories,
            'heartbeats': activity.heartbeats,
            'coins': {
                'everest': activity.coins_everest,
                'pizza': activity.coins_pizza,
                'heartbeat': activity.coins_heartbeat
            },
            'link': activity.link,
            'additional_data': activity.additional_data  # Ensure this is serializable
        })

    # Sort activities by date descending
    activities_list_sorted = sorted(activities_list, key=lambda x: datetime.strptime(x['date'], '%b %d, %Y'), reverse=True)
    activities_display = activities_list_sorted[:10]
    remaining_activities = activities_list_sorted[10:]

    # Identify Races
    matched_races = []
    for race in races:
        for activity in activities_list:
            # Check date range
            activity_date = datetime.strptime(activity['date'], '%b %d, %Y')
            if not (race['start_date'] <= activity_date <= race['end_date']):
                continue

            # Check distance within variance
            distance_lower = race['distance_km'] * (1 - race['distance_variance'])
            distance_upper = race['distance_km'] * (1 + race['distance_variance'])
            if not (distance_lower <= activity['distance'] <= distance_upper):
                continue

            # Check ascent within variance
            ascent_lower = race['ascent_m'] * (1 - race['ascent_variance'])
            ascent_upper = race['ascent_m'] * (1 + race['ascent_variance'])
            if not (ascent_lower <= activity['elevation_gain'] <= ascent_upper):
                continue

            # If all criteria met, add to matched races
            race_info = activity.copy()
            race_info['race_name'] = race['name']
            matched_races.append(race_info)

    # Determine the user's image URL
    default_image_url = '/static/cards/Gemini_Generated_Image_k1tmr9k1tmr9k1tm.jpg'  # Replace with your default image URL
    user_image_url = image_assignments.get(user.username, default_image_url)

    # Prepare user data
    user_data = {
        'username': user.username,
        'rank_name': user.rank_name,
        'rank_emoji': user.rank_emoji,
        'coins': {
            'everest': user.coins_everest,
            'pizza': user.coins_pizza,
            'heartbeat': user.coins_heartbeat
        },
        'dollars': calculate_dollars(user.achievements),
        'stats': user.stats,  # Accessing stats directly
        'achievements': user.achievements,  # Now a dict with timeframes
        'max_metrics': {
            'max_elevation': user.max_elevation,
            'max_elevation_link': user.max_elevation_link,
            'max_duration': user.max_duration,
            'max_duration_link': user.max_duration_link,
            'max_distance': user.max_distance,
            'max_distance_link': user.max_distance_link,
            'fastest_half_marathon': user.fastest_half_marathon or 0,  # Ensure it's not None
            'fastest_half_marathon_link': user.fastest_half_marathon_link or '#',  # Ensure it's not None
            'fastest_10k': user.fastest_10k or 0,
            'fastest_10k_link': user.fastest_10k_link or '#',
            'fastest_marathon': user.fastest_marathon or 0,
            'fastest_marathon_link': user.fastest_marathon_link or '#',
        },
        'activities': activities_display,
        'remaining_activities': remaining_activities,  # Add this line
        'matched_races': matched_races,  # Add matched races
        'image_url': user_image_url  # Add image_url to user_data
    }

    # Fetch rank information
    user_rank = get_user_rank(user.total_hours)

    # Define the timeframes as per calculate_achievements function

    dashboard_timeframes = ['all_time', '365_D']
    timeframe_labels = {'all_time': 'All', '365_D': 'Year'}

    return render_template('dashboard.html',
                           user=user_data,
                           achievements=user.achievements,
                           timeframes=dashboard_timeframes,
                           timeframe_labels=timeframe_labels,
                           rank_config=rank_config,
                           rank_info=user_rank)

# Route to handle submission of new achievements or medals
@app.route('/submit-achievement', methods=['GET', 'POST'])
def submit_achievement():
    if request.method == 'POST':
        achievement = {
            'name': request.form['name'],
            'emoji': request.form['emoji'],
            'description': request.form['description'],
            'type': request.form['type']  # 'Achievement' or 'Medal'
        }
        # Load existing achievements
        with open('achievements.json', 'r') as file:
            data = json.load(file)

        # Append the new achievement or medal
        if achievement['type'] == 'Achievement':
            data['Achievements'].append(achievement)
        elif achievement['type'] == 'Medal':
            data['Medals'].append(achievement)

        # Save back to the file
        with open('achievements.json', 'w') as file:
            json.dump(data, file, indent=4)

        return redirect('/')  # Redirect to a thank you page
    return render_template('submit_achievement.html')  # Render the submission form


# Route to handle contact/more info
@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        # Handle contact form submission
        # e.g., send an email or store the message
        return redirect('/')
    return render_template('contact.html')  # Render the contact form


@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '').strip()
    if not query:
        flash('Please enter a search query.', 'danger')
        return redirect(url_for('index'))

    user = None

    # Attempt to find user by exact match of strava_link
    user = User.query.filter_by(strava_link=query).first()

    if not user:
        # Attempt to find user by username
        user = User.query.filter_by(username=query).first()


    if user:
        return redirect(url_for('dashboard', username=user.username))
    else:
        flash('User not found. Please ensure the link is correct or upload the user\'s activities.', 'danger')
        return redirect(url_for('index'))



@app.route('/leaderboard')
def leaderboard():
    # Define Categories and their Achievements with Emojis

    # Define timeframes
    timeframe = request.args.get('timeframe', 'all_time')
    if timeframe not in timeframes:
        timeframe = 'all_time'

    # Retrieve all users from the database
    users = User.query.all()

    # Prepare per-category user data
    category_leaderboards = {}  # Key: category, Value: list of user data for that category
    category_achievements = {}  # Mapping category to its achievements list

    for category, achievements_str in categories_info.items():
        achievements_list = [ach for ach in achievements_str.split(' | ')]
        category_achievements[category] = achievements_list

        users_data = []
        for user in users:
            badges_counts = {}
            total_achievements_count = 0

            if user.achievements and timeframe in user.achievements:
                tf_achievements = user.achievements[timeframe]
                # Find the category in user's achievements
                user_categories = tf_achievements.get('categories', [])
                user_category_data = None
                for cat in user_categories:
                    if cat['name'] == category:
                        user_category_data = cat
                        break
                if user_category_data:
                    # Sum up achievements in this category
                    for badge in user_category_data.get('achievements', []):
                        count = badge.get('count', 0)
                        badges_counts[badge['name']] = count
                        total_achievements_count += count

            users_data.append({
                'rank': 0,  # Placeholder, will set later
                'username': user.username,
                'rank_name': user.rank_name,
                'rank_emoji': user.rank_emoji,
                'badges_counts': badges_counts,
                'total_achievements_count': total_achievements_count,
                'total_hours': user.total_hours,
            })

        # Sort users_data by total_achievements_count descending
        sorted_users_data = sorted(users_data, key=lambda x: -x['total_achievements_count'])
        # Assign ranks
        for idx, user_data in enumerate(sorted_users_data, start=1):
            user_data['rank'] = idx
        # Store in category_leaderboards
        category_leaderboards[category] = sorted_users_data

    # Process 'Other Achievements' similarly
    other_achievements_users = []
    all_other_achievements = set()
    for user in users:
        badges_counts = {}
        total_achievements_count = 0
        if user.achievements and timeframe in user.achievements:
            tf_achievements = user.achievements[timeframe]
            # Process other achievements
            for other in tf_achievements.get('other_achievements', []):
                count = other.get('count', 0)
                badges_counts[other['name']] = count
                total_achievements_count += count
                all_other_achievements.add(other['name'])
        other_achievements_users.append({
            'rank': 0,
            'username': user.username,
            'rank_name': user.rank_name,
            'rank_emoji': user.rank_emoji,
            'badges_counts': badges_counts,
            'total_achievements_count': total_achievements_count,
            'total_hours': user.total_hours,
        })
    # Sort and assign ranks
    sorted_other_achievements_users = sorted(other_achievements_users, key=lambda x: -x['total_achievements_count'])
    for idx, user_data in enumerate(sorted_other_achievements_users, start=1):
        user_data['rank'] = idx
    sorted_all_other_achievements = sorted(all_other_achievements)

    # Prepare data for Coins (if needed)
    coins_users = []
    for user in users:
        coins_users.append({
            'rank': 0,  # Placeholder, will set later if you sort them
            'username': user.username,
            'rank_name': user.rank_name,
            'rank_emoji': user.rank_emoji,
            'coins_everest': user.coins_everest,
            'coins_pizza': user.coins_pizza,
            'coins_heartbeat': user.coins_heartbeat,
            'total_coins': user.coins_everest + user.coins_pizza + user.coins_heartbeat  # Example total coins
        })
    # Optionally sort coins_users if you want



    return render_template(
        'leaderboard.html',
        categories_info=categories_info,
        category_achievements=category_achievements,
        category_leaderboards=category_leaderboards,
        other_achievements_users=sorted_other_achievements_users,
        sorted_all_other_achievements=sorted_all_other_achievements,
        badge_emoji_mapping=badge_emoji_mapping,
        coins_users=coins_users,
        timeframes=timeframes,
        selected_timeframe=timeframe
    )

@app.route('/strava/auth')
def strava_auth():
    # Scope can be adjusted based on the permissions you need
    scope = 'read,activity:read'
    auth_url = 'https://www.strava.com/oauth/authorize?' + urlencode({
        'client_id': STRAVA_CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': REDIRECT_URI,
        'approval_prompt': 'auto',
        'scope': scope
    })
    return redirect(auth_url)

@app.route('/strava/callback')
def strava_callback():
    code = request.args.get('code')
    if not code:
        flash('Authorization failed or was denied.', 'danger')
        return redirect(url_for('upload_activities'))

    # Exchange authorization code for access token
    token_url = 'https://www.strava.com/oauth/token'
    payload = {
        'client_id': STRAVA_CLIENT_ID,
        'client_secret': STRAVA_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=payload)
    if response.status_code != 200:
        flash('Failed to obtain access token from Strava.', 'danger')
        return redirect(url_for('upload_activities'))

    data = response.json()
    access_token = data.get('access_token')
    refresh_token = data.get('refresh_token')
    expires_at = data.get('expires_at')
    athlete = data.get('athlete')

    if not access_token:
        flash('No access token received from Strava.', 'danger')
        return redirect(url_for('upload_activities'))

    # Store tokens and athlete info in session or database
    session['access_token'] = access_token
    session['refresh_token'] = refresh_token
    session['expires_at'] = expires_at
    session['athlete'] = athlete

    flash(f"Successfully connected with Strava! Welcome, {athlete.get('firstname')} {athlete.get('lastname')}.", 'success')
    return redirect(url_for('upload_activities'))

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
