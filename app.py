import os
import logging
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
import dj_database_url  # Add this import
import json
import re
from urllib.parse import urlparse
import pandas as pd
from datetime import timedelta
import numpy as np


# Strava API Credentials
STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
STRAVA_REDIRECT_URI = os.environ.get('BASE_URL')  # e.g., 'https://yourdomain.com/strava/callback'



# Initialize Flask app

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    app.config['SQLALCHEMY_DATABASE_URI'] = dj_database_url.parse(DATABASE_URL)
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Fallback to SQLite for local development
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

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

# Rank System Configuration
rank_config = [
    {'name': 'Bronze 3', 'emoji': '🥉', 'minPoints': 0},
    {'name': 'Bronze 2', 'emoji': '🥉', 'minPoints': 150},
    {'name': 'Bronze 1', 'emoji': '🥉', 'minPoints': 300},
    {'name': 'Silver 3', 'emoji': '🥈', 'minPoints': 450},
    {'name': 'Silver 2', 'emoji': '🥈', 'minPoints': 600},
    {'name': 'Silver 1', 'emoji': '🥈', 'minPoints': 750},
    {'name': 'Gold 3', 'emoji': '🥇', 'minPoints': 900},
    {'name': 'Gold 2', 'emoji': '🥇', 'minPoints': 1050},
    {'name': 'Gold 1', 'emoji': '🥇', 'minPoints': 1200},
    {'name': 'Platinum 3', 'emoji': '🏆', 'minPoints': 1350},
    {'name': 'Platinum 2', 'emoji': '🏆', 'minPoints': 1500},
    {'name': 'Platinum 1', 'emoji': '🏆', 'minPoints': 1650},
    {'name': 'Diamond 3', 'emoji': '💎', 'minPoints': 1800},
    {'name': 'Diamond 2', 'emoji': '💎', 'minPoints': 1950},
    {'name': 'Diamond 1', 'emoji': '💎', 'minPoints': 2100},
    {'name': 'Master 3', 'emoji': '🔥', 'minPoints': 2250},
    {'name': 'Master 2', 'emoji': '🔥', 'minPoints': 2400},
    {'name': 'Master 1', 'emoji': '🔥', 'minPoints': 2550},
    {'name': 'Grandmaster 3', 'emoji': '🚀', 'minPoints': 2700},
    {'name': 'Grandmaster 2', 'emoji': '🚀', 'minPoints': 2850},
    {'name': 'Grandmaster 1', 'emoji': '🚀', 'minPoints': 3000},
    {'name': 'Challenger', 'emoji': '🌟', 'minPoints': 3150},
]

# Dynamically add Master Prestige levels
for i in range(2, 101):
    rank_config.append({
        'name': f'Master Prestige {i}',
        'emoji': '⭐',
        'minPoints': 3150 + (i - 1) * 75,  # Each level requires 75 additional points
    })

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    strava_link = db.Column(db.String(200), unique=True, nullable=False)
    rank_name = db.Column(db.String(50), nullable=False)
    rank_emoji = db.Column(db.String(10), nullable=False)
    total_hours = db.Column(db.Float, nullable=False, default=0.0)
    coins_everest = db.Column(db.Float, nullable=False, default=0.0)
    coins_pizza = db.Column(db.Float, nullable=False, default=0.0)
    coins_heartbeat = db.Column(db.Integer, nullable=False, default=0)
    achievements = db.Column(db.JSON, nullable=False, default={})
    stats = db.Column(db.JSON, nullable=False, default={})
    max_elevation = db.Column(db.Float, nullable=True, default=0.0)
    max_elevation_link = db.Column(db.String(200), nullable=True, default='#')
    max_duration = db.Column(db.Float, nullable=True, default=0.0)
    max_duration_link = db.Column(db.String(200), nullable=True, default='#')
    max_distance = db.Column(db.Float, nullable=True, default=0.0)
    max_distance_link = db.Column(db.String(200), nullable=True, default='#')

    # New Fields for Fastest 10K and Marathon
    fastest_10k = db.Column(db.Float, nullable=True, default=0.0)  # Duration in hours
    fastest_10k_link = db.Column(db.String(200), nullable=True, default='#')

    fastest_marathon = db.Column(db.Float, nullable=True, default=0.0)  # Duration in hours
    fastest_marathon_link = db.Column(db.String(200), nullable=True, default='#')

    # Fastest Half Marathon Fields
    fastest_half_marathon = db.Column(db.Float, nullable=True, default=0.0)  # Duration in hours
    fastest_half_marathon_link = db.Column(db.String(200), nullable=True, default='#')

    activities = db.relationship('Activity', backref='user', lazy=True)

class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    distance = db.Column(db.Float, nullable=False)  # in km
    duration = db.Column(db.Float, nullable=False)  # in hours
    duration_minutes = db.Column(db.Integer, nullable=False)  # Remaining minutes
    elevation_gain = db.Column(db.Float, nullable=False)  # in meters
    calories = db.Column(db.Float, nullable=False)  # in kcal
    heartbeats = db.Column(db.Integer, nullable=False)
    coins_everest = db.Column(db.Float, nullable=False)
    coins_pizza = db.Column(db.Float, nullable=False)
    coins_heartbeat = db.Column(db.Integer, nullable=False)
    link = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # New Field to Store Additional Data
    additional_data = db.Column(db.JSON, nullable=True)

# Initialize the database
with app.app_context():
    db.create_all()

# Helper Functions
def convert_to_native(obj):
    """
    Recursively convert NumPy data types in a dictionary or list to native Python types.
    """
    if isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(element) for element in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

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
    italian_column_names = [
        'Activity_ID',               # 0
        'Activity_Date',             # 1
        'Activity_Name',             # 2
        'Activity_Type',             # 3
        'Activity_Description',      # 4
        'Elapsed_Time_1',            # 5
        'Distance_1',                # 6
        'Max_Heart_Rate_1',          # 7
        'Relative_Effort_1',         # 8
        'Commute_1',                 # 9
        'Activity_Private_Note',     # 10
        'Activity_Gear_1',           # 11
        'Filename',                  # 12
        'Athlete_Weight',            # 13
        'Bike_Weight',               # 14
        'Elapsed_Time_2',            # 15
        'Moving_Time',               # 16
        'Distance_2',                # 17
        'Max_Speed',                 # 18
        'Average_Speed',             # 19
        'Elevation_Gain',            # 20
        'Elevation_Loss',            # 21
        'Elevation_Low',             # 22
        'Elevation_High',            # 23
        'Max_Grade',                 # 24
        'Average_Grade_1',           # 25
        'Average_Positive_Grade',    # 26
        'Average_Negative_Grade',    # 27
        'Max_Cadence',               # 28
        'Average_Cadence',           # 29
        'Max_Heart_Rate_2',          # 30
        'Average_Heart_Rate',        # 31
        'Max_Watts',                 # 32
        'Average_Watts',             # 33
        'Calories',                  # 34
        'Max_Temperature',           # 35
        'Average_Temperature',       # 36
        'Relative_Effort_2',         # 37
        'Total_Work',                # 38
        'Number_of_Runs',            # 39
        'Uphill_Time',               # 40
        'Downhill_Time',             # 41
        'Other_Time',                # 42
        'Perceived_Exertion_1',      # 43
        'Type',                      # 44
        'Start_Time',                # 45
        'Weighted_Average_Power',    # 46
        'Power_Count',               # 47
        'Prefer_Perceived_Exertion', # 48
        'Perceived_Relative_Effort', # 49
        'Commute_2',                 # 50
        'Total_Weight_Lifted',       # 51
        'From_Upload',               # 52
        'Grade_Adjusted_Distance',   # 53
        'Weather_Observation_Time',  # 54
        'Weather_Condition',         # 55
        'Weather_Temperature',       # 56
        'Apparent_Temperature',      # 57
        'Dewpoint',                  # 58
        'Humidity',                  # 59
        'Weather_Pressure',          # 60
        'Wind_Speed',                # 61
        'Wind_Gust',                 # 62
        'Wind_Bearing',              # 63
        'Precipitation_Intensity',   # 64
        'Sunrise_Time',              # 65
        'Sunset_Time',               # 66
        'Moon_Phase',                # 67
        'Bike_1',                    # 68
        'Gear',                      # 69
        'Precipitation_Probability', # 70
        'Precipitation_Type',        # 71
        'Cloud_Cover',               # 72
        'Weather_Visibility',        # 73
        'UV_Index',                  # 74
        'Weather_Ozone',             # 75
        'Jump_Count',                # 76
        'Total_Grit',                # 77
        'Average_Flow',              # 78
        'Flagged',                   # 79
    ]

    english_column_names = [
        'Activity_ID',               # 0
        'Activity_Date',             # 1
        'Activity_Name',             # 2
        'Activity_Type',             # 3
        'Activity_Description',      # 4
        'Elapsed_Time_1',            # 5
        'Distance_1',                # 6
        'Max_Heart_Rate_1',          # 7
        'Relative_Effort_1',         # 8
        'Commute_1',                 # 9
        'Activity_Private_Note',     # 10
        'Activity_Gear_1',           # 11
        'Filename',                  # 12
        'Athlete_Weight',            # 13
        'Bike_Weight',               # 14
        'Elapsed_Time_2',            # 15
        'Moving_Time',               # 16
        'Distance_2',                # 17
        'Max_Speed',                 # 18
        'Average_Speed',             # 19
        'Elevation_Gain',            # 20
        'Elevation_Loss',            # 21
        'Elevation_Low',             # 22
        'Elevation_High',            # 23
        'Max_Grade',                 # 24
        'Average_Grade_1',           # 25
        'Average_Positive_Grade',    # 26
        'Average_Negative_Grade',    # 27
        'Max_Cadence',               # 28
        'Average_Cadence',           # 29
        'Max_Heart_Rate_2',          # 30
        'Average_Heart_Rate',        # 31
        'Max_Watts',                 # 32
        'Average_Watts',             # 33
        'Calories',                  # 34
        'Max_Temperature',           # 35
        'Average_Temperature',       # 36
        'Relative_Effort_2',         # 37
        'Total_Work',                # 38
        'Number_of_Runs',            # 39
        'Uphill_Time',               # 40
        'Downhill_Time',             # 41
        'Other_Time',                # 42
        'Perceived_Exertion_1',      # 43
        'Type',                      # 44
        'Start_Time',                # 45
        'Weighted_Average_Power',    # 46
        'Power_Count',               # 47
        'Prefer_Perceived_Exertion', # 48
        'Perceived_Relative_Effort', # 49
        'Commute_2',                 # 50
        'Total_Weight_Lifted',       # 51
        'From_Upload',               # 52
        'Grade_Adjusted_Distance',   # 53
        'Weather_Observation_Time',  # 54
        'Weather_Condition',         # 55
        'Weather_Temperature',       # 56
        'Apparent_Temperature',      # 57
        'Dewpoint',                  # 58
        'Humidity',                  # 59
        'Weather_Pressure',          # 60
        'Wind_Speed',                # 61
        'Wind_Gust',                 # 62
        'Wind_Bearing',              # 63
        'Precipitation_Intensity',   # 64
        'Sunrise_Time',              # 65
        'Sunset_Time',               # 66
        'Moon_Phase',                # 67
        'Bike_1',                    # 68
        'Gear',                      # 69
        'Precipitation_Probability', # 70
        'Precipitation_Type',        # 71
        'Cloud_Cover',               # 72
        'Weather_Visibility',        # 73
        'UV_Index',                  # 74
        'Weather_Ozone',             # 75
        'Jump_Count',                # 76
        'Total_Grit',                # 77
        'Average_Flow',              # 78
        'Flagged',                   # 79,
        # Assuming columns 80 to 93 are additional in English CSVs
        'Additional_Column_80',      # 80
        'Additional_Column_81',      # 81
        'Additional_Column_82',      # 82
        'Additional_Column_83',      # 83
        'Additional_Column_84',      # 84
        'Additional_Column_85',      # 85
        'Additional_Column_86',      # 86
        'Additional_Column_87',      # 87
        'Additional_Column_88',      # 88
        'Additional_Column_89',      # 89
        'Additional_Column_90',      # 90
        'Additional_Column_91',      # 91
        'Additional_Column_92',      # 92
        'Additional_Column_93',      # 93
    ]

    # Define expected column counts
    expected_num_columns_italian = 80
    expected_num_columns_english = 94

    # Define known header samples for language detection
    italian_headers_sample = ['ID attività', "Data dell’attività", 'Nome attività']
    english_headers_sample = ['Activity ID', 'Activity Date', 'Activity Name']

    # Define month mapping for Italian to English
    month_map = {
        'gen': 'Jan',
        'feb': 'Feb',
        'mar': 'Mar',
        'apr': 'Apr',
        'mag': 'May',
        'giu': 'Jun',
        'lug': 'Jul',
        'ago': 'Aug',
        'set': 'Sep',
        'ott': 'Oct',
        'nov': 'Nov',
        'dic': 'Dec'
    }

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

    # Handle numeric parsing based on language
    numeric_columns = [
        'Elapsed_Time_1', 'Distance_1', 'Max_Heart_Rate_1', 'Relative_Effort_1',
        'Moving_Time', 'Distance_2', 'Max_Speed', 'Average_Speed', 'Elevation_Gain',
        'Elevation_Loss', 'Elevation_Low', 'Elevation_High', 'Max_Grade',
        'Average_Grade_1', 'Average_Positive_Grade', 'Average_Negative_Grade',
        'Max_Cadence', 'Average_Cadence', 'Max_Heart_Rate_2', 'Average_Heart_Rate',
        'Max_Watts', 'Average_Watts', 'Calories', 'Max_Temperature',
        'Average_Temperature', 'Total_Work', 'Number_of_Runs', 'Uphill_Time',
        'Downhill_Time', 'Other_Time', 'Perceived_Exertion_1', 'Weighted_Average_Power',
        'Power_Count', 'Precipitation_Intensity', 'Total_Weight_Lifted',
        'Grade_Adjusted_Distance', 'Humidity', 'Weather_Pressure', 'Wind_Speed',
        'Wind_Gust', 'Wind_Bearing', 'Precipitation_Intensity', 'UV_Index',
        'Jump_Count', 'Total_Grit', 'Average_Flow', 'Average_Elapsed_Speed', 'Total_Steps'
    ]

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

def calculate_achievements(df):
    """
    Calculate user achievements based on activities.

    Parameters:
    - df (pd.DataFrame): DataFrame containing user activities.

    Returns:
    - dict: Structured achievements and medals categorized appropriately.
    """
    achievements = {
        'categories': [],
        'other_achievements': [],
        'Medals': []
    }

    # Define Categories and their Introductions
    categories_info = {
        'Distance Run': '💲 Run 10 km | 💰 Run 21 km | 🧈 Run 42 km | 💎 Run 50 km/week | 👑 Run 100 km/week',
        'Distance Ride': '💲 Ride 100 km | 💰 Ride 150 km | 🧈 Ride 200 km | 💎 Ride 300 km/week | 👑 Ride 600 km/week',
        'Elevation': '💲 1000m Elevation | 💰 2000m Elevation | 🧈 Half Everest | 💎 25k Elevation/Month, 👑 25k Elevation/Month',
        'KCal': '💲 1000kCal Activity | 💰 2000kCal Activity | 🧈 4000kCal Activity | 💰 12000kCal Week | 👑 24000kCal Week '
    }
    # Initialize categories dictionary
    for category, intro in categories_info.items():
        achievements['categories'].append({
            'name': category,
            'intro': intro,
            'achievements': {
                'Run': [],
                'Ride': [],
                'Swim': []
            }
        })

    # ------------------ Achievements Calculation ------------------

    # Sort activities by date
    df_sorted = df.sort_values('Activity_Date').copy()
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

    # Assign Longest Streak to '👑 Streaks' category
    for category in achievements['categories']:
        if category['name'] == '👑 Streaks':
            streak_achievement = {
                'name': 'Longest Streak',
                'emoji': '🔥',
                'description': 'Longest consecutive days with activities',
                'count': int(max_streak)
            }
            for activity_type in ['Run', 'Ride', 'Swim']:
                category['achievements'][activity_type].append(streak_achievement.copy())
            break

    # ========== Distance Badges ==========
    distance_badges = {
        'Run': {
            'thresholds': [10, 21, 42, 50, 100],  # in km or km/week
            'unit': 'km',
            'emoji_sequence': ['💲', '💰', '🧈', '💎', '👑']
        },
        'Ride': {
            'thresholds': [100, 150, 200, 300, 600],  # in km or km/week
            'unit': 'km',
            'emoji_sequence': ['💲', '💰', '🧈', '💎', '👑']
        },
        'Swim': {
            'thresholds': [1, 5, 10, 15, 20],  # in km or km/week
            'unit': 'km',
            'emoji_sequence': ['💲', '💰', '🧈', '💎', '👑']
        }
    }

    for activity_type, info in distance_badges.items():
        thresholds = info['thresholds']
        unit = info['unit']
        emojis = info['emoji_sequence']
        for idx, threshold in enumerate(thresholds):
            emoji = emojis[idx] if idx < len(emojis) else '🏅'  # Default emoji if overflow

            if (activity_type == 'Run' and threshold >= 50) or \
               (activity_type == 'Ride' and threshold >= 300) or \
               (activity_type == 'Swim' and threshold >= 10):
                # Weekly threshold
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_distance = df_sorted[df_sorted['Activity_Type'] == activity_type].groupby('Week')['Distance_km'].sum()
                count = int((weekly_distance >= threshold).sum())
                name = f'{threshold}k {activity_type}/week'
                description = f'Completed at least {threshold} km in a week ({activity_type})'
            else:
                # Per activity threshold
                count = int(df_sorted[(df_sorted['Distance_km'] >= threshold) &
                                      (df_sorted['Activity_Type'] == activity_type)].shape[0])
                name = f'{threshold}k {activity_type}'
                description = f'Completed activities covering at least {threshold} km ({activity_type})'

            # Assign to '💲 Distance' category
            category_name = '💲 Distance'
            for category in achievements['categories']:
                if category['name'] == category_name:
                    category['achievements'][activity_type].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

    # ========== Elevation Badges ==========
    elevation_thresholds = [1000, 2000, 4424, 8868, 25000]  # in meters (Half Everest ~4424m, 30k/month)
    elevation_emojis = ['💲', '💰', '🧈', '💎', '👑']  # Using only specified emojis

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
            description = 'Achieved a total of 30,000 meters elevation gain in a month'
        elif threshold == 8868:
            name = 'Everest/Week'
            description = 'Achieved a total of an Everest elevation gain in a week'
        else:
            name = f'{threshold}m Elevation'
            description = f'Completed activities with elevation gain of at least {threshold} meters'

        if threshold == 25000:
            # Monthly elevation threshold
            df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
            monthly_elevation = df_sorted.groupby('Month')['Elevation_Gain'].sum()
            count = int((monthly_elevation >= threshold).sum())
        elif threshold == 8868:
            # Monthly elevation threshold
            df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
            monthly_elevation = df_sorted.groupby('Week')['Elevation_Gain'].sum()
            count = int((monthly_elevation >= threshold).sum())
        else:
            # Per activity elevation threshold
            count = int(df_sorted[df_sorted['Elevation_Gain'] >= threshold].shape[0])

        # Assign to '💰 Elevation' category
        category_name = '💰 Elevation'
        for category in achievements['categories']:
            if category['name'] == category_name:
                category['achievements']['Run'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                category['achievements']['Ride'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                category['achievements']['Swim'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                break

    # ========== Consistency Badges ==========
    # Weekly Consistency
    df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
    weekly_days = df_sorted.groupby('Week')['Date'].nunique()
    weekly_consistent = int((weekly_days == 7).sum())

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

    # Assign Consistency Achievements to '🧈 Consistency' category
    category_name = '🧈 Consistency'
    for category in achievements['categories']:
        if category['name'] == category_name:
            consistency_achievements = [
                {
                    'name': 'Weekly Consistency',
                    'emoji': '💲',
                    'description': 'Logged activities every day of a week',
                    'count': weekly_consistent
                },
                {
                    'name': 'Monthly Consistency',
                    'emoji': '💰',
                    'description': 'Logged activities every day of a month',
                    'count': monthly_consistent
                }
            ]
            for achievement in consistency_achievements:
                for activity_type in ['Run', 'Ride', 'Swim']:
                    category['achievements'][activity_type].append(achievement.copy())
            break

    # ========== KCal Badges ==========
    kcal_badges = {
        'Per Activity': {
            'thresholds': [1000, 2000, 4000],
            'emojis': ['💲', '💰', '🧈'],
            'description': 'Burned at least {} kcal in an activity'
        },
        'Weekly': {
            'thresholds': [12000, 24000],  # Adjusted to realistic weekly kcal
            'emojis': ['💰', '👑'],
            'description': 'Burned at least {} kcal in a week'
        }
    }

    # Assign KCal Achievements to '💎 KCal' category
    category_name = '💎 KCal'
    for category in achievements['categories']:
        if category['name'] == category_name:
            # Per Activity KCal Badges
            for threshold, emoji in zip(kcal_badges['Per Activity']['thresholds'], kcal_badges['Per Activity']['emojis']):
                count = int(df_sorted[df_sorted['Calories'] >= threshold].shape[0])
                kcal_achievement = {
                    'name': f'{threshold}kCal Activity',
                    'emoji': emoji,
                    'description': kcal_badges['Per Activity']['description'].format(threshold),
                    'count': count
                }
                for activity_type in ['Run', 'Ride', 'Swim']:
                    category['achievements'][activity_type].append(kcal_achievement.copy())

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
                for activity_type in ['Run', 'Ride', 'Swim']:
                    category['achievements'][activity_type].append(kcal_week_achievement.copy())

            # Daily kcal Burner
            total_calories = df_sorted['Calories'].sum()
            daily_kcal_burner = int(total_calories // 2000)
            kcal_burner_achievement = {
                'name': 'Daily kcal Burner',
                'emoji': '🔥',
                'description': 'Burned over 2000 kcal',
                'count': daily_kcal_burner
            }
            for activity_type in ['Run', 'Ride', 'Swim']:
                category['achievements'][activity_type].append(kcal_burner_achievement.copy())
            break

    # ------------------ Other Achievements ------------------
    # Define new Achievements that don't fit into main categories
    other_achievements = [
        {
            'name': 'Everesting Ascent',
            'emoji': '💎',
            'description': 'Logged an activity with Everesting ascension (8848m)',
            'count': int(df[df['Elevation_Gain'] >= 8848].shape[0]),
            'type': 'Run'  # Assuming Everesting is a Run activity
        },
        {
            'name': '2000m Ascent',
            'emoji': '🧈',
            'description': 'Logged an activity with 2000m of ascension',
            'count': int(df[df['Elevation_Gain'] >= 2000].shape[0]),
            'type': 'Run'  # Adjust if necessary
        },
        {
            'name': 'Half Everesting',
            'emoji': '💰',
            'description': 'Logged an activity with 1/2 Everesting ascension (~4424m)',
            'count': int(df[df['Elevation_Gain'] >= 4424].shape[0]),
            'type': 'Run'
        },
        {
            'name': '2000 km Month',
            'emoji': '💰',
            'description': 'Month with 2000 km of total distance',
            'count': int(df.groupby(df['Activity_Date'].dt.to_period('M'))['Distance_km'].sum().ge(2000).sum()),
            'type': 'Ride'
        },
        {
            'name': '10,000 km Year',
            'emoji': '🧈',
            'description': 'Year with 10,000 km total distance',
            'count': int(df.groupby(df['Activity_Date'].dt.year)['Distance_km'].sum().ge(10000).sum()),
            'type': 'Ride'
        },
        {
            'name': '100,000 Elevation Year',
            'emoji': '💎',
            'description': 'Year with 100,000 total elevation gain',
            'count': int(df.groupby(df['Activity_Date'].dt.year)['Elevation_Gain'].sum().ge(100000).sum()),
            'type': 'Run'
        },
        {
            'name': '150,000 Elevation Year',
            'emoji': '👑',
            'description': 'Year with 150,000 total elevation gain',
            'count': int(df.groupby(df['Activity_Date'].dt.year)['Elevation_Gain'].sum().ge(150000).sum()),
            'type': 'Run'
        },
        {
            'name': '200,000 Elevation Year',
            'emoji': '👑',
            'description': 'Year with 200,000 total elevation gain',
            'count': int(df.groupby(df['Activity_Date'].dt.year)['Elevation_Gain'].sum().ge(200000).sum()),
            'type': 'Run'
        },
    ]

    for achievement in other_achievements:
        achievements['other_achievements'].append({
            'name': achievement['name'],
            'emoji': achievement['emoji'],
            'description': achievement['description'],
            'count': achievement['count'],
            'type': achievement['type']
        })

    # ------------------ Medals (Special Achievements) ------------------
    # Define special occasion medals
    df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

    special_occasions = [
        { 'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01'] },
        { 'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25'] },
        { 'name': 'Valentine\'s Day', 'emoji': '❤️', 'dates': ['02-14'] },
        { 'name': 'Easter', 'emoji': '🐣', 'dates': ['04-04'] },  # Adjust as needed
        { 'name': 'Halloween', 'emoji': '🎃', 'dates': ['10-31'] },
        { 'name': 'Thanksgiving', 'emoji': '🦃', 'dates': ['11-25'] },  # Adjust date as needed
        { 'name': 'Diwali', 'emoji': '🪔', 'dates': ['11-04'] },  # Adjust date as needed
        { 'name': 'Hanukkah', 'emoji': '🕎', 'dates': ['12-18'] },  # Adjust date as needed
        { 'name': 'Chinese New Year', 'emoji': '🐉', 'dates': ['02-01'] },  # Adjust date as needed
        { 'name': 'International Workers\' Day', 'emoji': '✊', 'dates': ['05-01'] }
    ]

    for occasion in special_occasions:
        count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
        achievements['Medals'].append({
            'name': occasion['name'],
            'emoji': occasion['emoji'],
            'description': occasion['name'],
            'count': count
        })

    # ------------------ Additional Medals ------------------
    # Define additional Medals with their respective emojis
    additional_medals = [
        {
            'name': 'Steep Climber',
            'emoji': '🧗‍♀️',
            'description': 'Logged an activity with elevation gain > 3000m and distance < 100 km',
            'count': int(df[(df['Elevation_Gain'] > 3000) & (df['Distance_km'] < 100)].shape[0]),
        },
        {
            'name': 'Coppa Coppi Protector',
            'emoji': '🥩',
            'description': 'Logged an activity with elevation gain > 2000m and distance < 100 km',
            'count': int(df[(df['Elevation_Gain'] > 2000) & (df['Distance_km'] < 100)].shape[0]),
        },
        {
            'name': 'Marathon Master',
            'emoji': '🏃‍♂️',
            'description': 'Completed a marathon (42.195 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 42.195)].shape[0]),
        },
        {
            'name': 'Half Marathon Master',
            'emoji': '👟',
            'description': 'Completed a half marathon (21.0975 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 21.0975)].shape[0]),
        },
        {
            'name': 'Climbing King',
            'emoji': '🧗‍♂️',
            'description': 'Total Elevation_Gain over 1000m',
            'count': int(df['Elevation_Gain'].sum() // 1000),
        },
        {
            'name': 'Speedster',
            'emoji': '🏎️',
            'description': 'Achieved an average speed over 30 km/h',
            'count': int(df['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df.columns else 0,
        },
        # Add more as needed
    ]

    for medal in additional_medals:
        achievements['Medals'].append({
            'name': medal['name'],
            'emoji': medal['emoji'],
            'description': medal['description'],
            'count': medal['count']
        })

    # Convert all NumPy types to native Python types if necessary
    achievements = convert_to_native(achievements)

    return achievements

def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation_Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['Average_Heart_Rate'].sum() / 1000000)     # Adjust as needed
    }
    coins = convert_to_native(coins)
    return coins

def calculate_stats(df):
    """Calculate user statistics, including average temperature, total likes, and most common hour."""
    stats = {
        'hours': float(round(df['Moving_Time'].sum() / 3600, 1)),        # Convert to hours
        'distance': float(round(df['Distance_km'].sum(), 1)),           # Already in km
        'elevation': float(round(df['Elevation_Gain'].sum(), 1)),       # in meters
        'calories': float(round(df['Calories'].sum(), 1)),              # in kcal
    }

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

    df['Type'] = df['Activity_Type'].astype(str)

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
    half_marathons = df[df['Distance_km'] >= 21.0975]
    half_marathons = half_marathons[half_marathons['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not half_marathons.empty:
        fastest_half_marathon_duration = half_marathons['Moving_Time'].min() / 3600  # in hours
        fastest_half_marathon_activity = half_marathons.loc[half_marathons['Moving_Time'].idxmin()]
        fastest_half_marathon_link = f"https://www.strava.com/activities/{fastest_half_marathon_activity['Activity_ID']}"
    else:
        fastest_half_marathon_duration = 0
        fastest_half_marathon_link = '#'

    # Fastest Marathon (Minimum Duration for Distance >= 42.195 km)
    marathons = df[df['Distance_km'] >= 42.195]
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

from datetime import timedelta

def convert_to_native(data):
    """Convert all items in the dictionary to native Python types."""
    if isinstance(data, dict):
        return {k: convert_to_native(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_to_native(item) for item in data]
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()
    else:
        return data


def convert_to_native(data):
    """
    Placeholder function to convert data to native types.
    Implement as needed based on your application's requirements.
    """
    return data


def convert_to_native(obj):
    """
    Recursively convert NumPy data types in a dictionary or list to native Python types.
    """
    if isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(element) for element in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj


def convert_to_native(obj):
    """
    Recursively convert NumPy types to native Python types.
    """
    if isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(item) for item in obj]
    elif isinstance(obj, (pd.Timestamp, pd.Period)):
        return str(obj)
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    else:
        return obj

def calculate_achievements(df):
    """
    Calculate user achievements based on activities.

    Parameters:
    - df (pd.DataFrame): DataFrame containing user activities.

    Returns:
    - dict: Structured achievements and medals categorized appropriately.
    """
    achievements = {
        'categories': [],
        'other_achievements': [],
        'Medals': []
    }

    categories_info = {
        'Distance Run': '💲 Run 10 km | 💰 Run 21 km | 🧈 Run 42 km | 💎 Run 50 km/week | 👑 Run 100 km/week',
        'Distance Ride': '💲 Ride 100 km | 💰 Ride 150 km | 🧈 Ride 200 km | 💎 Ride 300 km/week | 👑 Ride 600 km/week',
        'Elevation': '💲 1000m Elevation | 💰 2000m Elevation | 🧈 Half Everest | 💎 Everest/Week | 👑 25k Elevation/Month',
        'KCal': '💲 1000kCal Activity | 💰 2000kCal Activity | 🧈 4000kCal Activity | 💰 12000kCal Week | 👑 24000kCal Week '
    }

    # Initialize categories dictionary
    for category, intro in categories_info.items():
        if category in ['Distance Run', 'Distance Ride']:
            achievements['categories'].append({
                'name': category,
                'intro': intro,
                'achievements': []
            })
        else:
            achievements['categories'].append({
                'name': category,
                'intro': intro,
                'achievements': []
            })

    # ------------------ Achievements Calculation ------------------

    # Sort activities by date
    df_sorted = df.sort_values('Activity_Date').copy()
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

    # Assign Longest Streak to 'Other Achievements'
    streak_achievement = {
        'name': 'Longest Streak',
        'emoji': '🔥',
        'description': 'Longest consecutive days with activities',
        'count': int(max_streak)
    }
    achievements['other_achievements'].append(streak_achievement)

    # ========== Distance Run Badges ==========
    distance_run_badges = {
        'thresholds': [10, 21, 50, 42, 100],  # in km or km/week
        'unit': 'km',
        'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
    }

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

        # Assign to 'Distance Run' category
        for category in achievements['categories']:
            if category['name'] == 'Distance Run':
                category['achievements'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                break

    # ========== Distance Ride Badges ==========
    distance_ride_badges = {
        'thresholds': [100, 150, 200, 300, 600],  # in km or km/week
        'unit': 'km',
        'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
    }

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

        # Assign to 'Distance Ride' category
        for category in achievements['categories']:
            if category['name'] == 'Distance Ride':
                category['achievements'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                break

    # ========== Elevation Badges ==========
    elevation_thresholds = [1000, 2000, 4424, 8868, 25000]  # in meters (Half Everest ~4424m, 30k/month)
    elevation_emojis = ['💲', '💰', '🧈', '💎','👑']  # Distinct emojis for Elevation

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
            description = 'Achieved a total of 30,000 meters elevation gain in a month'
        elif threshold == 8868:
            name = 'Everest/Week'
            description = 'Achieved a total of 8868 meters elevation gain in a week'
        else:
            name = f'{threshold}m Elevation'
            description = f'Completed activities with elevation gain of at least {threshold} meters'

        if threshold == 25000:
            # Monthly elevation threshold
            df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
            monthly_elevation = df_sorted.groupby('Month')['Elevation_Gain'].sum()
            count = int((monthly_elevation >= threshold).sum())

        if threshold == 8868:
            # Monthly elevation threshold
            df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
            monthly_elevation = df_sorted.groupby('Week')['Elevation_Gain'].sum()
            count = int((monthly_elevation >= threshold).sum())


        else:
            # Per activity elevation threshold
            count = int(df_sorted[df_sorted['Elevation_Gain'] >= threshold].shape[0])

        # Assign to 'Elevation' category
        for category in achievements['categories']:
            if category['name'] == 'Elevation':
                category['achievements'].append({
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'count': count
                })
                break

    # ========== Consistency Badges ==========
    # Weekly Consistency
    df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
    weekly_days = df_sorted.groupby('Week')['Date'].nunique()
    weekly_consistent = int((weekly_days == 7).sum())

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

    # Assign Consistency Achievements to 'Consistency' category
    consistency_achievements = [
        {
            'name': 'Weekly Consistency',
            'emoji': '📅',
            'description': 'Logged activities every day of a week',
            'count': weekly_consistent
        },
        {
            'name': 'Monthly Consistency',
            'emoji': '🗓️',
            'description': 'Logged activities every day of a month',
            'count': monthly_consistent
        }
    ]


    # ========== KCal Badges ==========
    kcal_badges = {
        'Per Activity': {
            'thresholds': [1000, 2000, 4000],
            'emojis': ['💲', '💰', '🧈'],
            'description': 'Burned at least {} kcal in an activity'
        },
        'Weekly': {
            'thresholds': [12000, 24000],  # Adjusted to realistic weekly kcal
            'emojis': ['💎','👑'],
            'description': 'Burned at least {} kcal in a week'
        }
    }

    # Assign KCal Achievements to 'KCal' category
    for category in achievements['categories']:
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

    # ------------------ Other Achievements ------------------
    # Additional Achievements with distinct emojis
    additional_achievements = [
            {
                'name': 'Weekly Consistency',
                'emoji': '📅',
                'description': 'Logged activities every day of a week',
                'count': weekly_consistent
            },
            {
                'name': 'Monthly Consistency',
                'emoji': '🗓️',
                'description': 'Logged activities every day of a month',
                'count': monthly_consistent
            },
        {
            'name': 'Marathon Master',
            'emoji': '🏃‍♂️',
            'description': 'Completed a marathon (42.195 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 42.195)].shape[0]),
        },
        {
            'name': 'Half Marathon Master',
            'emoji': '👟',
            'description': 'Completed a half marathon (21.0975 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 21.0975)].shape[0]),
        },
        {
            'name': 'Climbing King',
            'emoji': '🧗‍♂️',
            'description': 'Total Elevation_Gain over 1000m',
            'count': int(df['Elevation_Gain'].sum() // 1000),
        },
        {
            'name': 'Speedster',
            'emoji': '🏎️',
            'description': 'Achieved an average speed over 30 km/h',
            'count': int(df['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df.columns else 0,
        },
        # Add more as needed
    ]

    for achievement in additional_achievements:
        achievements['other_achievements'].append({
            'name': achievement['name'],
            'emoji': achievement['emoji'],
            'description': achievement['description'],
            'count': achievement['count']
        })

    # ------------------ Medals (Special Achievements) ------------------
    # Define special occasion medals
    df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

    special_occasions = [
        { 'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01'] },
        { 'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25'] },
        { 'name': 'Valentine\'s Day', 'emoji': '❤️', 'dates': ['02-14'] },
        { 'name': 'Easter', 'emoji': '🐣', 'dates': ['04-04'] },  # Adjust as needed
        { 'name': 'Halloween', 'emoji': '🎃', 'dates': ['10-31'] },
        { 'name': 'Thanksgiving', 'emoji': '🦃', 'dates': ['11-25'] },  # Adjust date as needed
        { 'name': 'Diwali', 'emoji': '🪔', 'dates': ['11-04'] },  # Adjust date as needed
        { 'name': 'Hanukkah', 'emoji': '🕎', 'dates': ['12-18'] },  # Adjust date as needed
        { 'name': 'Chinese New Year', 'emoji': '🐉', 'dates': ['02-01'] },  # Adjust date as needed
        { 'name': 'International Workers\' Day', 'emoji': '✊', 'dates': ['05-01'] }
    ]

    for occasion in special_occasions:
        count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
        achievements['Medals'].append({
            'name': occasion['name'],
            'emoji': occasion['emoji'],
            'description': occasion['name'],
            'count': count
        })

    # ------------------ Additional Medals ------------------
    # Define additional Medals with their respective emojis
    additional_medals = [
        {
            'name': 'Steep Climber',
            'emoji': '🧗‍♀️',
            'description': 'Logged an activity with elevation gain > 3000m and distance < 100 km',
            'count': int(df[(df['Elevation_Gain'] > 3000) & (df['Distance_km'] < 100)].shape[0]),
        },
        {
            'name': 'Coppa Coppi Protector',
            'emoji': '🥩',
            'description': 'Logged an activity with elevation gain > 2000m and distance < 100 km',
            'count': int(df[(df['Elevation_Gain'] > 2000) & (df['Distance_km'] < 100)].shape[0]),
        },
        {
            'name': 'Marathon Master',
            'emoji': '🏃‍♂️',
            'description': 'Completed a marathon (42.195 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 42.195)].shape[0]),
        },
        {
            'name': 'Half Marathon Master',
            'emoji': '👟',
            'description': 'Completed a half marathon (21.0975 km)',
            'count': int(df[(df['Activity_Type'].str.contains('Run', case=False, na=False)) &
                          (df['Distance_km'] >= 21.0975)].shape[0]),
        },
        {
            'name': 'Climbing King',
            'emoji': '🧗‍♂️',
            'description': 'Total Elevation_Gain over 1000m',
            'count': int(df['Elevation_Gain'].sum() // 1000),
        },
        {
            'name': 'Speedster',
            'emoji': '🏎️',
            'description': 'Achieved an average speed over 30 km/h',
            'count': int(df['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df.columns else 0,
        },
        # Add more as needed
    ]

    for medal in additional_medals:
        achievements['Medals'].append({
            'name': medal['name'],
            'emoji': medal['emoji'],
            'description': medal['description'],
            'count': medal['count']
        })

    # Convert all NumPy types to native Python types if necessary
    achievements = convert_to_native(achievements)

    return achievements


def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation_Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['Average_Heart_Rate'].sum()/1000)                   # 1 Heartbeat Coin = 1 heartbeat (adjust as needed)
    }
    coins = convert_to_native(coins)
    return coins
def calculate_stats(df):
    """Calculate user statistics, including average temperature, total likes, and most common hour."""
    stats = {
        'hours': float(round(df['Moving_Time'].sum() / 3600, 1)),        # Convert to hours
        'distance': float(round(df['Distance_km'].sum(), 1)),           # Already in km
        'elevation': float(round(df['Elevation_Gain'].sum(), 1)),       # in meters
        'calories': float(round(df['Calories'].sum(), 1)),              # in kcal
    }

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


@app.route('/about')
def about():
    return render_template('about.html')

# Routes
@app.route('/', methods=['GET', 'POST'])
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
                    calories = row['Calories']
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

    # Fetch user activities
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
            'additional_data': activity.additional_data  # Access additional data
        })

    # Collect all unique achievements and medals
    all_achievements = set()
    all_medals = set()
    if user.achievements:
        for category, badges in user.achievements.items():
            for badge in badges:
                if 'name' in badge:
                    if category.lower() == 'achievements':
                        all_achievements.add(badge['name'])
                    elif category.lower() == 'medals':
                        all_medals.add(badge['name'])

    # Sort them for consistent display
    all_achievements = sorted(all_achievements)
    all_medals = sorted(all_medals)

    # Prepare data for rendering
    user_data = {
        'username': user.username,
        'rank_name': user.rank_name,
        'rank_emoji': user.rank_emoji,
        'coins': {
            'everest': user.coins_everest,
            'pizza': user.coins_pizza,
            'heartbeat': user.coins_heartbeat
        },
        'stats': user.stats,  # Accessing stats directly
        'achievements': user.achievements,
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
        'activities': activities_list,
    }

    # Fetch rank information
    user_rank = get_user_rank(user.total_hours)

    return render_template('dashboard.html',
                           user=user_data,
                           all_achievements=all_achievements,
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

'''

@app.route('/leaderboard_backup')
def leaderboard():
    # Retrieve all users from the database
    users = User.query.all()

    # Collect all unique achievements and medals
    all_achievements = set()
    all_medals = set()
    for user in users:
        if user.achievements:
            for category, badges in user.achievements.items():
                for badge in badges:
                    if 'name' in badge:
                        if category.lower() == 'achievements':
                            all_achievements.add(badge['name'])
                        elif category.lower() == 'medals':
                            all_medals.add(badge['name'])

    # Sort them for consistent display
    all_achievements = sorted(all_achievements)
    all_medals = sorted(all_medals)

    # Prepare leaderboard data
    leaderboard_data = []
    for user in users:
        badges_counts = {}
        if user.achievements:
            for category, badges in user.achievements.items():
                for badge in badges:
                    if 'name' in badge:
                        badges_counts[badge['name']] = badge.get('count', 0)

        leaderboard_data.append({
            'rank': 0,  # Placeholder, will set later
            'username': user.username,
            'total_hours': user.total_hours,
            'rank_name': user.rank_name,
            'rank_emoji': user.rank_emoji,
            'coins_everest': user.coins_everest,
            'coins_pizza': user.coins_pizza,
            'coins_heartbeat': user.coins_heartbeat,
            'badges_counts': badges_counts
        })

    # Sort the users based on rank and total_hours
    rank_order = {rank['name']: index for index, rank in enumerate(rank_config)}
    sorted_users = sorted(
        leaderboard_data,
        key=lambda x: (
            rank_order.get(x['rank_name'], len(rank_order)),
            -x['total_hours']
        )
    )

    # Assign ranks
    for idx, user_data in enumerate(sorted_users, start=1):
        user_data['rank'] = idx


    # badge_emoji_mapping.py or within your Flask view
    badge_emoji_mapping = {
        # Achievements
        'Longest Streak': '🔥',
        '100 km': '💯',
        '200 km': '🔱',
        '300 km': '⚜️',
        '3 Hours': '⌛',
        '6 Hours': '⏱️',
        '12 Hours': '🌇',
        '5 Hours Week': '💰',
        '10 Hours Week': '🧈',
        '20 Hours Week': '💎',
        'Consistency Champion': '🔁',
        'Daily kcal Burner': '🔥',
        'Everesting Ascent': '🏔️',
        '2000m Ascent': '⬆️',
        'Half Everesting': '🌄',
        '2000 km Month': '📅',
        '10,000 km Year': '🌍',
        '100,000 Elevation Year': '🧗',
        '150,000 Elevation Year': '🚀',
        '200,000 Elevation Year': '🏔️🏔️',
        'Marathon Master': '🏃‍♂️',
        'Half Marathon Master': '👟',
        'Climbing King': '🧗‍♂️',
        'Speedster': '🏎️',

        # Medals
        'New Year Run': '🎉',
        'Christmas Run': '🎄',
        "Valentine's Day": '❤️',
        'Easter': '🐣',
        'Halloween': '🎃',
        'Thanksgiving': '🦃',
        'Diwali': '🪔',
        'Hanukkah': '🕎',
        'Chinese New Year': '🐉',
        "International Workers' Day": '✊',
        '20 km Challenge': '🏅',
        'Steep Climber': '🧗‍♀️',
        'Coppa Coppi Protector': '🥩',

        # Master Prestige Levels (using a generic star emoji)
        'Master Prestige 2': '⭐',
        'Master Prestige 3': '⭐',
        'Master Prestige 4': '⭐',
        # ...
        # Continue up to 'Master Prestige 100' as needed
        'Master Prestige 100': '⭐',

        # Add more mappings as needed
    }

    # Pass this mapping to the template in the /leaderboard route
    return render_template('leaderboard.html',
                           users=sorted_users,
                           all_achievements=all_achievements,
                           all_medals=all_medals,
                           badge_emoji_mapping=badge_emoji_mapping)
'''

@app.route('/leaderboard')
def leaderboard():
    # Define Categories and their Achievements with Emojis
    categories_info = {
        'Distance Run': '💲 Run 10 km | 💰 Run 21 km | 🧈 Run 42 km | 💎 Run 50 km/week | 👑 Run 100 km/week',
        'Distance Ride': '💲 Ride 100 km | 💰 Ride 150 km | 🧈 Ride 200 km | 💎 Ride 300 km/week | 👑 Ride 600 km/week',
        'Elevation': '💲 1000m Elevation | 💰 2000m Elevation | 🧈 Half Everest | 💎 25k Elevation/Month',
        'KCal': '💲 1000kCal Activity | 💰 2000kCal Activity | 🧈 4000kCal Activity | 💰 12000kCal Week | 👑 24000kCal Week'
    }

    # Retrieve all users from the database
    users = User.query.all()

    # Collect all unique achievements and medals
    all_achievements = set()
    all_medals = set()
    for user in users:
        if user.achievements:
            for category, badges in user.achievements.items():
                for badge in badges:
                    if 'name' in badge:
                        if category.lower() == 'achievements':
                            all_achievements.add(badge['name'])
                        elif category.lower() == 'medals':
                            all_medals.add(badge['name'])


    # Sort them for consistent display
    sorted_all_achievements = sorted(all_achievements)
    sorted_all_medals = sorted(all_medals)

    # Prepare leaderboard data
    leaderboard_data = []
    for user in users:
        badges_counts = {}
        if user.achievements:
            for category, badges in user.achievements.items():
                for badge in badges:
                    if 'name' in badge:
                        if 'achievements' in badge.keys():
                            for achievements_badge in badge['achievements']:
                                badges_counts[achievements_badge['name']] = achievements_badge.get('count', 0)
                                for sub_achievement in badges_counts:
                                    badges_counts[achievements_badge['name']] = achievements_badge.get('count', 0)




                        else:
                            badges_counts[badge['name']] = badge.get('count', 0)

        # print(badges_counts) in theory it is loaded but not shown?

        leaderboard_data.append({
            'rank': 0,  # Placeholder, will set later
            'username': user.username,
            'total_hours': user.total_hours,
            'rank_name': user.rank_name,
            'rank_emoji': user.rank_emoji,
            'coins_everest': user.coins_everest,
            'coins_pizza': user.coins_pizza,
            'coins_heartbeat': user.coins_heartbeat,
            'badges_counts': badges_counts
        })

    # Sort the users based on rank and total_hours
    rank_order = {rank['name']: index for index, rank in enumerate(rank_config)}
    sorted_users = sorted(
        leaderboard_data,
        key=lambda x: (
            rank_order.get(x['rank_name'], len(rank_order)),
            -x['total_hours']
        )
    )

    # Assign ranks
    for idx, user_data in enumerate(sorted_users, start=1):
        user_data['rank'] = idx

    # Define badge emoji mapping
    badge_emoji_mapping = {
            # -------------------- Distance Run Badges --------------------
        'run 10 km': '💲',
        'run 21 km': '💰',
        'run 42 km': '🧈',
        'run 50 km/week': '💎',
        'run 100 km/week': '👑',

        # -------------------- Distance Ride Badges --------------------
        'ride 100 km': '💲',
        'ride 150 km': '💰',
        'ride 200 km': '🧈',
        'ride 300 km/week': '💎',
        'ride 600 km/week': '👑',

        # -------------------- Elevation Badges --------------------
        '1000m elevation': '💲',
        '2000m elevation': '💰',
        'half everest': '🧈',
        'Everest/Week': '💎',
        '25k elevation/month': '👑',

        # -------------------- KCal Badges --------------------
        '1000kcal activity': '💲',
        '2000kcal activity': '💰',
        '4000kcal activity': '🧈',
        '12000kcal week': '💰',
        '24000kcal week': '👑',

        # -------------------- Other Achievements --------------------
        'everesting ascent': '💎',
        '2000m ascent': '🧈',
        'half everesting': '💰',
        '2000 km month': '💰',
        '10,000 km year': '🧈',
        '100,000 elevation year': '💎',
        '150,000 elevation year': '👑',
        '200,000 elevation year': '👑',
        # Achievements
        'Run 10 km': '💲',
        'Run 21 km': '💰',
        'Run 42 km': '🧈',
        'Run 50 km/week': '💎',
        'Run 100 km/week': '👑',
        'Ride 100 km': '💲',
        'Ride 150 km': '💰',
        'Ride 200 km': '🧈',
        'Ride 300 km/week': '💎',
        'Ride 600 km/week': '👑',
        '1000m Elevation': '💲',
        '2000m Elevation': '💰',
        'Half Everest': '🧈',
        '25k Elevation/Month': '💎',
        '1000kCal Activity': '💲',
        '2000kCal Activity': '💰',
        '4000kCal Activity': '🧈',
        '12000kCal Week': '💰',
        '24000kCal Week': '👑',
        # Medals
        'New Year Run': '🎉',
        'Christmas Run': '🎄',
        "Valentine's Day": '❤️',
        'Easter': '🐣',
        'Halloween': '🎃',
        'Thanksgiving': '🦃',
        'Diwali': '🪔',
        'Hanukkah': '🕎',
        'Chinese New Year': '🐉',
        "International Workers' Day": '✊',
        '20 km Challenge': '🏅',
        'Steep Climber': '🧗‍♀️',
        'Coppa Coppi Protector': '🥩',
        # Master Prestige Levels
        'Master Prestige 2': '⭐',
        'Master Prestige 3': '⭐',
        'Master Prestige 4': '⭐',
        'Master Prestige 100': '⭐',
        # Add more mappings as needed
    }

    # Prepare data for Coins
    coins_users = []
    for user in sorted_users:
        coins_users.append({
            'rank': user['rank'],
            'username': user['username'],
            'coins_everest': user['coins_everest'],
            'coins_pizza': user['coins_pizza'],
            'coins_heartbeat': user['coins_heartbeat'],
            'badges_counts': user['badges_counts']  # Added badges_counts
        })

    # Prepare data for Other Achievements (if any)
    # Assuming 'Other Achievements' are achievements not in categories_info
    other_achievements_users = []
    other_achievements = all_achievements.copy()
    # Remove achievements that are part of categories_info
    for category, achievements_str in categories_info.items():
        achievements_list = [ach.split(' ', 1)[1] for ach in achievements_str.split(' | ')]
        other_achievements -= set(achievements_list)
    # Sort the remaining achievements
    sorted_other_achievements = sorted(other_achievements)

    for user in sorted_users:
        other_achievements_counts = {}
        for ach in sorted_other_achievements:
            other_achievements_counts[ach] = user['badges_counts'].get(ach, 0)
        other_achievements_users.append({
            'rank': user['rank'],
            'username': user['username'],
            'other_achievements': other_achievements_counts,
            'badges_counts': user['badges_counts']  # Added badges_counts
        })


    return render_template('leaderboard.html',
                           categories_info=categories_info,
                           users=sorted_users,
                           all_medals=sorted_all_medals,
                           badge_emoji_mapping=badge_emoji_mapping,
                           coins_users=coins_users,
                           other_achievements_users=other_achievements_users)


@app.route('/migrate_achievements')
def migrate_achievements():
    users = User.query.all()
    for user in users:
        if user.achievements:
            achievements = user.achievements
            for category, badges in achievements.items():
                new_badges = []
                for badge in badges:
                    if isinstance(badge, str):
                        # Convert string badge to dict with default values
                        new_badges.append({
                            'name': badge,
                            'emoji': '🏅',  # Assign a default or appropriate emoji
                            'description': badge,
                            'count': 1  # Assign a default count
                        })
                    elif isinstance(badge, dict):
                        new_badges.append(badge)
                achievements[category] = new_badges
            user.achievements = achievements
    db.session.commit()
    return "Achievements migration completed."


# Run the app
if __name__ == '__main__':
    app.run(debug=True)
