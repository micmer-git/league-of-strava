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

def process_dataframe(df):
    """Validate and process the uploaded CSV dataframe."""
    required_columns = [
        'Activity ID', 'Activity Date', 'Activity Name', 'Activity Type', 'Activity Description',
        'Moving Time', 'Distance', 'Max Heart Rate', 'Calories', 'Elevation Gain'
    ]

    # Handle duplicate columns by renaming
    # This renames 'Distance.1' to 'Distance_m' for meters
    # Similarly, rename other duplicates as needed
    new_columns = {}
    for col in df.columns:
        if col.endswith('.1'):
            if 'Distance' in col:
                new_columns[col] = 'Distance_m'  # Distance in meters
            elif 'Moving Time' in col:
                new_columns[col] = 'Moving Time'
            else:
                new_columns[col] = col  # Keep other duplicates as is
        else:
            new_columns[col] = col
    df = df.rename(columns=new_columns)

    # Check required columns
    for col in required_columns:
        if col not in df.columns:
            return None, f'Missing required column: {col}'

    # Convert relevant columns to numeric types
    numeric_columns = ['Moving Time', 'Distance', 'Distance_m', 'Max Heart Rate', 'Calories', 'Elevation Gain']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Convert 'Activity Date' to datetime
    df['Activity Date'] = pd.to_datetime(df['Activity Date'], errors='coerce')

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
        'longestStreak': {'name': 'Longest Streak', 'emoji': '🔥', 'count': 0},
        'distanceBadges': [
            {'name': '100 km', 'emoji': '💯', 'threshold': 100, 'count': 0},
            {'name': '200 km', 'emoji': '🔱', 'threshold': 200, 'count': 0},
            {'name': '300 km', 'emoji': '⚜️', 'threshold': 300, 'count': 0},
        ],
        'durationBadges': [
            {'name': '3 Hours', 'emoji': '⌛', 'threshold': 180, 'count': 0},  # minutes
            {'name': '6 Hours', 'emoji': '⏱️', 'threshold': 360, 'count': 0},
            {'name': '12 Hours', 'emoji': '🌇', 'threshold': 720, 'count': 0},
        ],
        'weeklyBadges': [
            {'name': '5 Hours Week', 'emoji': '💰', 'threshold': 5, 'count': 0},  # hours
            {'name': '10 Hours Week', 'emoji': '🧈', 'threshold': 10, 'count': 0},
            {'name': '20 Hours Week', 'emoji': '💎', 'threshold': 20, 'count': 0},
        ],
        'specialOccasions': [
            {'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01'], 'count': 0},
            {'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25'], 'count': 0},
            # Add more special occasions as needed
        ],
        'additionalAchievements': [
            {
                'name': 'Marathon Master',
                'emoji': '4️⃣2️⃣🏃',
                'description': 'Completed a marathon (42.195 km)',
                'count': 0,
                'type': 'Run',
                'distance': 42.195  # in km
            },
            {
                'name': 'Half Marathon Master',
                'emoji': '️2️⃣1️⃣🏃',
                'description': 'Completed a half marathon (21.0975 km)',
                'count': 0,
                'type': 'Run',
                'distance': 21.0975  # in km
            },
            {
                'name': 'Climbing King',
                'emoji': '🧗‍♂️',
                'description': 'Total elevation gain over 1000m',
                'count': 0
            },
            {
                'name': 'Speedster',
                'emoji': '🏎️',
                'description': 'Achieved an average speed over 30 km/h',
                'count': 0
            },
            {
                'name': 'Consistency Champion',
                'emoji': '🔁',
                'description': 'Logged activities every day for a month',
                'count': 0
            },
            {
                'name': 'Daily kcal Burner',
                'emoji': '🔥',
                'description': 'Burned over 2000 kcal',
                'count': 0
            },
        ]
    }

    # Calculate Longest Streak
    df_sorted = df.sort_values('Activity Date')
    df_sorted['Date'] = df_sorted['Activity Date'].dt.date
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
    achievements['longestStreak']['count'] = max_streak

    # Calculate Distance Badges
    for badge in achievements['distanceBadges']:
        threshold_m = badge['threshold'] * 1000  # Convert km to meters
        badge['count'] = int(df[df['Distance_m'] >= threshold_m].shape[0])

    # Calculate Duration Badges
    for badge in achievements['durationBadges']:
        badge['count'] = int(df[df['Moving Time']/60 >= badge['threshold']].shape[0])

    # Calculate Weekly Badges
    df_sorted['Week Start'] = df_sorted['Activity Date'].apply(lambda x: (x - timedelta(days=x.weekday())).date())
    weekly_hours = df_sorted.groupby('Week Start')['Moving Time'].sum() / 3600  # Convert to hours
    for badge in achievements['weeklyBadges']:
        badge['count'] = int(weekly_hours[weekly_hours >= badge['threshold']].count())

    # Calculate Special Occasion Badges
    df_sorted['Month-Day'] = df_sorted['Activity Date'].dt.strftime('%m-%d')
    for badge in achievements['specialOccasions']:
        badge['count'] = int(df_sorted[df_sorted['Month-Day'].isin(badge['dates'])].shape[0])

    # Calculate Additional Achievements
    # Marathon and Half Marathon
    marathon_activities = df[df['Activity Type'].str.contains('Run', case=False, na=False) & (df['Distance_m'] >= 42195)]
    achievements['additionalAchievements'][0]['count'] = int(marathon_activities.shape[0])

    half_marathon_activities = df[df['Activity Type'].str.contains('Run', case=False, na=False) & (df['Distance_m'] >= 21097.5) & (df['Distance_m'] < 42195)]
    achievements['additionalAchievements'][1]['count'] = int(half_marathon_activities.shape[0])

    # Climbing King
    total_elevation_gain = df['Elevation Gain'].sum()
    achievements['additionalAchievements'][2]['count'] = int(total_elevation_gain // 1000)

    # Speedster
    # Assuming 'Max Speed' is in m/s; convert to km/h and check
    if 'Max Speed' in df.columns:
        speed_kmh = df['Max Speed'] * 3.6  # Convert m/s to km/h
        speedster_activities = df[speed_kmh > 30]
        achievements['additionalAchievements'][3]['count'] = int(speedster_activities.shape[0])
    else:
        achievements['additionalAchievements'][3]['count'] = 0

    # Consistency Champion
    df_sorted['Month'] = df_sorted['Activity Date'].dt.to_period('M')
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
    achievements['additionalAchievements'][4]['count'] = consistency_count

    # Daily kcal Burner
    total_calories = df['Calories'].sum()
    achievements['additionalAchievements'][5]['count'] = int(total_calories // 2000)

    # Convert to native types
    achievements = convert_to_native(achievements)

    return achievements

def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['Max Heart Rate'].sum())                   # 1 Heartbeat Coin = 1 heartbeat (adjust as needed)
    }
    coins = convert_to_native(coins)
    return coins

def calculate_stats(df):
    """Calculate user statistics."""
    stats = {
        'hours': float(round(df['Moving Time'].sum() / 3600, 1)),        # Convert to hours
        'distance': float(round(df['Distance_m'].sum() / 1000, 1)),      # Convert to km
        'elevation': float(round(df['Elevation Gain'].sum(), 1)),        # in meters
        'calories': float(round(df['Calories'].sum(), 1))               # in kcal
    }
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

    max_elevation = df['Elevation Gain'].max()
    max_elevation_activity = df.loc[df['Elevation Gain'].idxmax()]
    max_duration = df['Moving Time'].max() / 3600  # Convert to hours
    max_duration_activity = df.loc[df['Moving Time'].idxmax()]
    max_distance = df['Distance_m'].max() / 1000  # Convert to km
    max_distance_activity = df.loc[df['Distance_m'].idxmax()]

    return {
        'max_elevation': float(max_elevation),
        'max_elevation_link': f"https://www.strava.com/activities/{max_elevation_activity['Activity ID']}",
        'max_duration': float(round(max_duration, 2)),
        'max_duration_link': f"https://www.strava.com/activities/{max_duration_activity['Activity ID']}",
        'max_distance': float(round(max_distance, 2)),
        'max_distance_link': f"https://www.strava.com/activities/{max_distance_activity['Activity ID']}",
    }

# Routes
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        if not username:
            flash('Please enter a username.', 'danger')
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

                # Check if user already exists
                user = User.query.filter_by(username=username).first()
                if user:
                    # Update existing user
                    user.rank_name = user_rank['current_rank']['name']
                    user.rank_emoji = user_rank['current_rank']['emoji']
                    user.total_hours = total_hours
                    user.coins_everest = coins['everest']
                    user.coins_pizza = coins['pizza']
                    user.coins_heartbeat = coins['heartbeat']
                    user.achievements = achievements
                    user.stats = stats  # Assigning stats here
                    user.max_elevation = max_metrics['max_elevation']
                    user.max_elevation_link = max_metrics['max_elevation_link']
                    user.max_duration = max_metrics['max_duration']
                    user.max_duration_link = max_metrics['max_duration_link']
                    user.max_distance = max_metrics['max_distance']
                    user.max_distance_link = max_metrics['max_distance_link']

                    # Delete existing activities
                    Activity.query.filter_by(user_id=user.id).delete()
                else:
                    # Create new user
                    user = User(
                        username=username,
                        rank_name=user_rank['current_rank']['name'],
                        rank_emoji=user_rank['current_rank']['emoji'],
                        total_hours=total_hours,
                        coins_everest=coins['everest'],
                        coins_pizza=coins['pizza'],
                        coins_heartbeat=coins['heartbeat'],
                        achievements=achievements,
                        stats=stats,  # Assigning stats here
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
                for _, row in df.iterrows():
                    activity = Activity(
                        activity_id=row['Activity ID'],
                        name=row['Activity Name'],
                        date=row['Activity Date'],
                        distance=row['Distance_m'] / 1000,  # Convert to km
                        duration=row['Moving Time'] / 3600,  # Convert to hours
                        duration_minutes=int((row['Moving Time'] % 3600) / 60),
                        elevation_gain=row['Elevation Gain'],
                        calories=row['Calories'],
                        heartbeats=int(row['Max Heart Rate'] * (row['Moving Time'] / 60)),  # Example calculation
                        coins_everest=round(row['Elevation Gain'] / 8848, 2),
                        coins_pizza=round(row['Calories'] / 1000, 2),
                        coins_heartbeat=int(row['Max Heart Rate'] * (row['Moving Time'] / 60)),
                        link=f"https://www.strava.com/activities/{row['Activity ID']}",
                        user_id=user.id
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
            'link': activity.link
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
        # 'rank_info': get_user_rank(user.total_hours)  # Removed from user_data
    }

    user_rank = get_user_rank(user.total_hours)  # Define user_rank separately

    return render_template('dashboard.html',
                           user=user_data,
                           rank_config=rank_config,
                           rank_info=user_rank)  # Pass rank_info separately

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
