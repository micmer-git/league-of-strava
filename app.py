import os
import logging
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
import dj_database_url  # Add this import

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
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Fallback to SQLite for local development
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Set up logging
logging.basicConfig(level=logging.INFO)

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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
    strava_link = db.Column(db.String(200), unique=True, nullable=False)  # New Field Added
    rank_name = db.Column(db.String(50), nullable=False)
    rank_emoji = db.Column(db.String(10), nullable=False)
    total_hours = db.Column(db.Float, nullable=False)
    coins_everest = db.Column(db.Float, nullable=False)
    coins_pizza = db.Column(db.Float, nullable=False)
    coins_heartbeat = db.Column(db.Integer, nullable=False)
    achievements = db.Column(db.JSON, nullable=False)
    stats = db.Column(db.JSON, nullable=False)  # Added Field
    max_elevation = db.Column(db.Float, nullable=True)
    max_elevation_link = db.Column(db.String(200), nullable=True)
    max_duration = db.Column(db.Float, nullable=True)
    max_duration_link = db.Column(db.String(200), nullable=True)
    max_distance = db.Column(db.Float, nullable=True)
    max_distance_link = db.Column(db.String(200), nullable=True)
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
    elif isinstance(obj, (np.int64, np.int32, np.int16)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.float16)):
        return float(obj)
    else:
        return obj

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

from dateutil import parser

def process_dataframe(df):
    """Validate and process the uploaded CSV dataframe with support for Italian and English headers, handle comma decimals, and conditional distance units."""
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
        'Flagged',                   # 79
        # Add more column names up to 94 as per English CSV structure
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

    # Get actual number of columns and first 3 headers
    actual_num_columns = df.shape[1]
    headers = df.columns.tolist()
    first_3_headers = headers[:3]
    logging.info(f"Number of columns in CSV: {actual_num_columns}")
    logging.info(f"First 3 headers: {first_3_headers}")

    # Define known header patterns
    italian_headers_sample = ['ID attività', "Data dell’attività", 'Nome attività']
    english_headers_sample = ['Activity ID', 'Activity Date', 'Activity Name']

    # Detect language
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
    if actual_num_columns < expected_num_columns:
        error_msg = f'Expected at least {expected_num_columns} columns for {language} CSV, found {actual_num_columns}'
        logging.error(error_msg)
        return None, error_msg

    # Assign column names
    df = df.iloc[:, :expected_num_columns]  # Truncate to expected columns
    df.columns = column_names
    logging.info(f"Assigned column names for {language} CSV.")

    # Log the new column names for verification
    logging.info(f"New column names: {df.columns.tolist()}")

    # Define numeric columns (common in both languages)
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

    # Handle numeric parsing based on language
    if language == 'Italian':
        # Replace comma with dot in numeric columns for Italian CSV
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.').astype(float).fillna(0)
        logging.info("Replaced commas with dots in numeric columns for Italian CSV.")
    else:
        # For English CSVs, convert numeric columns directly
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Converted numeric columns for English CSV.")

    # Convert numeric columns
    # (Already handled above)

    # Parse 'Activity_Date'
    def parse_date(date_str):
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

    df['Activity_Date'] = df['Activity_Date'].astype(str).apply(parse_date)

    # Drop rows with invalid 'Activity_Date'
    num_invalid_dates = df['Activity_Date'].isna().sum()
    if num_invalid_dates > 0:
        logging.warning(f"Number of invalid 'Activity_Date' entries: {num_invalid_dates}")
        df = df.dropna(subset=['Activity_Date'])

    # Additional validation
    if df.empty:
        error_msg = "The processed dataframe is empty after parsing."
        logging.error(error_msg)
        return None, error_msg

    # Check if 'Activity_ID' exists
    if 'Activity_ID' not in df.columns:
        error_msg = "'Activity_ID' column is missing after processing."
        logging.error(error_msg)
        return None, error_msg

    # Drop duplicates
    if df['Activity_ID'].duplicated().any():
        logging.warning("Duplicate Activity IDs found. Dropping duplicates.")
        df = df.drop_duplicates(subset=['Activity_ID'])

    # Handle 'Distance' based on 'Activity_Type'
    def assign_distance_km(row):
        activity_type = row['Activity_Type']
        if language == 'Italian':
            if isinstance(activity_type, str) and activity_type.lower() == 'nuoto':  # 'nuoto' means 'swimming'
                return row.get('Distance_1', 0) / 1000  # Convert meters to kilometers
            else:
                return row.get('Distance_1', 0)  # Already in kilometers
        else:  # English
            if isinstance(activity_type, str) and activity_type.lower() == 'swimming':
                return row.get('Distance_1', 0) / 1000  # Convert meters to kilometers
            else:
                return row.get('Distance_1', 0)  # Already in kilometers

    df['Distance_km'] = df.apply(assign_distance_km, axis=1)
    logging.info("Assigned 'Distance_km' based on 'Activity_Type'.")

    # Optionally, drop original Distance columns to avoid confusion
    df.drop(['Distance_1', 'Distance_2'], axis=1, inplace=True, errors='ignore')

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
    """Calculate user achievements based on activities."""
    achievements = {
        'Achievements': [],
        'Medals': []
    }

    # ------------------ Achievements ------------------
    # Longest Streak
    df_sorted = df.sort_values('Activity_Date')
    df_sorted['Date'] = df_sorted['Activity_Date'].dt.date
    unique_dates = sorted(df_sorted['Date'].dropna().unique())
    max_streak = 1
    current_streak = 1
    for i in range(1, len(unique_dates)):
        if (unique_dates[i] - unique_dates[i-1]).days == 1:
            current_streak += 1
            if current_streak > max_streak:
                max_streak = current_streak
        else:
            current_streak = 1
    achievements['Achievements'].append({
        'name': 'Longest Streak',
        'emoji': '🔥',
        'description': 'Longest consecutive days with activities',
        'count': max_streak
    })

    # Distance Badges
    distance_thresholds = [100, 200, 300]  # in km
    for threshold in distance_thresholds:
        count = int(df[df['Distance_km'] >= threshold].shape[0])
        achievements['Achievements'].append({
            'name': f'{threshold} km',
            'emoji': '💯' if threshold == 100 else ('🔱' if threshold == 200 else '⚜️'),
            'description': f'Completed activities covering at least {threshold} km',
            'count': count
        })

    # Duration Badges
    duration_thresholds = [3, 6, 12]  # in hours
    for threshold in duration_thresholds:
        count = int(df[df['Moving_Time']/60 >= threshold * 60].shape[0])
        achievements['Achievements'].append({
            'name': f'{threshold} Hours',
            'emoji': '⌛' if threshold == 3 else ('⏱️' if threshold == 6 else '🌇'),
            'description': f'Activities with duration of at least {threshold} hours',
            'count': count
        })

    # Weekly Badges
    df_sorted['Week Start'] = df_sorted['Activity_Date'].apply(lambda x: (x - timedelta(days=x.weekday())).date())
    weekly_hours = df_sorted.groupby('Week Start')['Moving_Time'].sum() / 3600  # Convert to hours
    weekly_thresholds = [5, 10, 20]  # in hours
    for threshold in weekly_thresholds:
        count = int(weekly_hours[weekly_hours >= threshold].count())
        achievements['Achievements'].append({
            'name': f'{threshold} Hours Week',
            'emoji': '💰' if threshold == 5 else ('🧈' if threshold == 10 else '💎'),
            'description': f'Logged at least {threshold} hours in a week',
            'count': count
        })

    # Consistency Champion
    df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
    months = df_sorted['Month'].dropna().unique()
    consistency_count = 0
    for month in months:
        month_start = month.start_time
        month_end = month.end_time
        days_in_month = (month_end - month_start).days + 1
        activities_in_month = df_sorted[df_sorted['Month'] == month]
        active_days = activities_in_month['Date'].nunique()
        if active_days == days_in_month:
            consistency_count += 1
    achievements['Achievements'].append({
        'name': 'Consistency Champion',
        'emoji': '🔁',
        'description': 'Logged activities every day for a month',
        'count': consistency_count
    })

    # Daily kcal Burner
    total_calories = df['Calories'].sum()
    achievements['Achievements'].append({
        'name': 'Daily kcal Burner',
        'emoji': '🔥',
        'description': 'Burned over 2000 kcal',
        'count': int(total_calories // 2000)
    })

    # ------------------ Medals ------------------
    # Special Occasion Badges
    df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

    # Debugging: Check 'Month-Day' column
    print("Month-Day Column:")
    print(df_sorted[['Activity_Date', 'Month-Day']].head())

    special_occasions = [
        {'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01']},
        {'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25']},
        # Add more special occasions as needed
    ]
    for occasion in special_occasions:
        count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
        achievements['Medals'].append({
            'name': occasion['name'],
            'emoji': occasion['emoji'],
            'description': occasion['name'],
            'count': count
        })

    # Additional Achievements (could be Medals or Achievements based on your design)
    additional_achievements = [
        {
            'name': 'Marathon Master',
            'emoji': '🏃‍♂️',
            'description': 'Completed a marathon (42.195 km)',
            'count': int(df[df['Activity_Type'].str.contains('Run', case=False, na=False) & (df['Distance_km'] >= 42.195)].shape[0])
        },
        {
            'name': 'Half Marathon Master',
            'emoji': '️2️⃣1️⃣🏃',
            'description': 'Completed a half marathon (21.0975 km)',
            'count': int(df[df['Activity_Type'].str.contains('Run', case=False, na=False) & (df['Distance_km'] >= 21.0975)].shape[0])
        },
        {
            'name': 'Climbing King',
            'emoji': '🧗‍♂️',
            'description': 'Total Elevation_Gain over 1000m',
            'count': int(df['Elevation_Gain'].sum() // 1000)
        },
        {
            'name': 'Speedster',
            'emoji': '🏎️',
            'description': 'Achieved an average speed over 30 km/h',
            'count': int(df['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df.columns else 0
        },
        # Add more as needed
    ]

    for badge in additional_achievements:
        if badge['name'] in ['Climbing King', 'Speedster']:
            # Assuming these are Medals
            achievements['Medals'].append(badge)
        else:
            # Assuming these are Achievements
            achievements['Achievements'].append(badge)

    # Convert to native types
    achievements = convert_to_native(achievements)

    return achievements


def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation_Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['Average_Heart_Rate'].sum())                   # 1 Heartbeat Coin = 1 heartbeat (adjust as needed)
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
    """Determine the user's top activities."""
    if df.empty:
        return {
            'max_elevation': 0,
            'max_elevation_link': '#',
            'max_duration': 0,
            'max_duration_link': '#',
            'max_distance': 0,
            'max_distance_link': '#',
        }

    max_elevation = df['Elevation_Gain'].max()
    max_elevation_activity = df.loc[df['Elevation_Gain'].idxmax()]
    max_duration = df['Moving_Time'].max() / 3600  # Convert to hours
    max_duration_activity = df.loc[df['Moving_Time'].idxmax()]
    max_distance = df['Distance_km'].max()  # Convert to km
    max_distance_activity = df.loc[df['Distance_km'].idxmax()]

    return {
        'max_elevation': float(max_elevation),
        'max_elevation_link': f"https://www.strava.com/activities/{max_elevation_activity['Activity_ID']}",
        'max_duration': float(round(max_duration, 2)),
        'max_duration_link': f"https://www.strava.com/activities/{max_duration_activity['Activity_ID']}",
        'max_distance': float(round(max_distance, 2)),
        'max_distance_link': f"https://www.strava.com/activities/{max_distance_activity['Activity_ID']}",
    }

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

                    # Delete existing activities
                    Activity.query.filter_by(user_id=user.id).delete()
                else:
                    #athlete_id = extract_strava_id(strava_link)

                    # Create new user
                    user = User(
                        username=username,
                        strava_link=strava_link,  # Assign the Strava link
                        #athlete_id=athlete_id,  # Store the extracted athlete_id

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
                    )
                    db.session.add(user)
                    db.session.flush()  # Flush to get user.id

                    # Add activities
                    import json

                    for _, row in df.iterrows():
                        # Extract essential fields
                        activity_id = row['Activity_ID']
                        name = row['Activity_Name']
                        date = row['Activity_Date']
                        distance = row['Distance_km']  # or 'Distance_2' based on your logic
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
                            distance=distance,  # Adjust based on which 'Distance' column you prefer
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


from urllib.parse import urlparse

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
        },
        'activities': activities_list,
    }

    # Fetch rank information
    user_rank = get_user_rank(user.total_hours)

    return render_template('dashboard.html',
                           user=user_data,
                           rank_config=rank_config,
                           rank_info=user_rank)
                           
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
    # Retrieve all users from the database
    users = User.query.all()

    # Collect key achievements to display
    key_achievements = [
        {'name': 'Marathon Master', 'sort_key': 'marathon_master', 'emoji': '🏃‍♂️'},
        {'name': 'Climbing King', 'sort_key': 'climbing_king', 'emoji': '🧗‍♂️'},
        {'name': 'Speedster', 'sort_key': 'speedster', 'emoji': '🏎️'},
        {'name': 'Consistency Champion', 'sort_key': 'consistency_champion', 'emoji': '🔁'}
    ]

    # Sort users by rank and total_hours within the same rank
    rank_order = {rank['name']: index for index, rank in enumerate(rank_config)}
    sorted_users = sorted(
        users,
        key=lambda x: (
            rank_order.get(x.rank_name, len(rank_order)),
            -x.total_hours
        )
    )

    leaderboard_data = []
    for index, user in enumerate(sorted_users, start=1):
        # Initialize achievement counts
        badges_counts = {}
        if user.achievements:
            for category, badges in user.achievements.items():
                for badge in badges:
                    if isinstance(badge, dict):
                        badge_name = badge.get('name')
                        badge_count = badge.get('count', 0)
                        badges_counts[badge_name] = badge_count

        # Prepare data for key achievements
        user_achievements = {}
        for achievement in key_achievements:
            badge_name = achievement['name']
            user_achievements[achievement['sort_key']] = badges_counts.get(badge_name, 0)

        leaderboard_data.append({
            'rank': index,
            'username': user.username,
            'total_hours': user.total_hours,
            'rank_name': user.rank_name,
            'rank_emoji': user.rank_emoji,
            'coins_everest': user.coins_everest,
            'coins_pizza': user.coins_pizza,
            'coins_heartbeat': user.coins_heartbeat,
            'badges_counts': user_achievements
        })

    return render_template('leaderboard.html', users=leaderboard_data)




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
