import os
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import pandas as pd

# Import configuration and models
from config import DATABASE_URL, UPLOAD_FOLDER, MAX_CONTENT_LENGTH, RANK_CONFIG
from models import db, User, Activity

# Import utility functions
from utils.data_processing import process_dataframe
from utils.helpers import allowed_file
from utils.metrics import (
    calculate_achievements,
    calculate_coins,
    calculate_stats,
    get_user_rank,
    calculate_max_metrics
)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

# Configuration for file uploads
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH  # 16MB max file size

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL if DATABASE_URL else 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db.init_app(app)

# Set up logging
logging.basicConfig(level=logging.INFO)

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize the database
with app.app_context():
    db.create_all()

# Routes
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        strava_link = request.form.get('link', '').strip()

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
            logging.info(f"File saved to {filepath}")

            try:
                df = pd.read_csv(filepath)
                processed_df, error = process_dataframe(df)
                if error:
                    flash(error, 'danger')
                    return redirect(request.url)

                # Calculate achievements, coins, stats
                achievements = calculate_achievements(processed_df)
                coins = calculate_coins(processed_df)
                stats = calculate_stats(processed_df)
                total_hours = stats.get('hours', 0)
                user_rank = get_user_rank(total_hours, RANK_CONFIG)  # Pass RANK_CONFIG here
                max_metrics = calculate_max_metrics(processed_df)

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
                    user.max_elevation = max_metrics.get('max_elevation', 0)
                    user.max_elevation_link = max_metrics.get('max_elevation_link', '#')
                    user.max_duration = max_metrics.get('max_duration', 0)
                    user.max_duration_link = max_metrics.get('max_duration_link', '#')
                    user.max_distance = max_metrics.get('max_distance', 0)
                    user.max_distance_link = max_metrics.get('max_distance_link', '#')

                    # Delete existing activities
                    Activity.query.filter_by(user_id=user.id).delete()
                    logging.info(f"Updated user '{username}' and deleted existing activities.")
                else:
                    # Create new user
                    user = User(
                        username=username,
                        strava_link=strava_link,
                        rank_name=user_rank['current_rank']['name'],
                        rank_emoji=user_rank['current_rank']['emoji'],
                        total_hours=total_hours,
                        coins_everest=coins['everest'],
                        coins_pizza=coins['pizza'],
                        coins_heartbeat=coins['heartbeat'],
                        achievements=achievements,
                        stats=stats,
                        max_elevation=max_metrics.get('max_elevation', 0),
                        max_elevation_link=max_metrics.get('max_elevation_link', '#'),
                        max_duration=max_metrics.get('max_duration', 0),
                        max_duration_link=max_metrics.get('max_duration_link', '#'),
                        max_distance=max_metrics.get('max_distance', 0),
                        max_distance_link=max_metrics.get('max_distance_link', '#'),
                    )
                    db.session.add(user)
                    db.session.flush()  # Flush to get user.id
                    logging.info(f"Created new user '{username}'.")

                # Add Activities
                for _, row in processed_df.iterrows():
                    activity_id = row['Activity_ID']
                    name = row['Activity_Name']
                    date = row['Activity_Date']
                    distance = row.get('Distance_km', 0)  # Ensure 'Distance_km' exists
                    moving_time_seconds = row.get('Moving_Time', 0)
                    duration = row.get('duration', 0)  # Already calculated in process_dataframe
                    duration_minutes = int((moving_time_seconds % 3600) / 60)
                    elevation_gain = row.get('Elevation_Gain', 0)
                    calories = row.get('Calories', 0)
                    heartbeats = row.get('heartbeats', 0)  # Already calculated in process_dataframe
                    coins_everest = round(elevation_gain / 8848, 2)
                    coins_pizza = round(calories / 1000, 2)
                    coins_heartbeat = heartbeats
                    link = f"https://www.strava.com/activities/{activity_id}"

                    # Collect additional data
                    additional_data = row.to_dict()

                    # Remove already stored fields to avoid duplication
                    fields_to_remove = [
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
                        'Additional_Column_80', 'Additional_Column_81', 'Additional_Column_82',
                        'Additional_Column_83', 'Additional_Column_84', 'Additional_Column_85',
                        'Additional_Column_86', 'Additional_Column_87', 'Additional_Column_88',
                        'Additional_Column_89', 'Additional_Column_90', 'Additional_Column_91',
                        'Additional_Column_92', 'Additional_Column_93'
                    ]

                    for field in fields_to_remove:
                        additional_data.pop(field, None)

                    activity = Activity(
                        activity_id=activity_id,
                        name=name,
                        date=date,
                        distance=distance,  # in km
                        duration=duration,  # in hours
                        duration_minutes=duration_minutes,
                        elevation_gain=elevation_gain,  # in meters
                        calories=calories,  # in kcal
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
                logging.info("User and activities committed to the database.")

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

    # Fetch rank information
    user_rank = get_user_rank(user.total_hours, RANK_CONFIG)  # Ensure RANK_CONFIG is defined

    # Prepare data for rendering
    user_data = {
        'username': user.username,
        'rank_name': user.rank_name,
        'rank_emoji': user.rank_emoji,

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
        'metrics': {  # Add the 'metrics' key
            'lifetime': {
                'max_metrics': {
                    'max_elevation': user.max_elevation,
                    'max_duration': user.max_duration,
                    'max_distance': user.max_distance
                },
                'rank_info': user_rank,
                'coins': {
                    'everest': user.coins_everest,
                    'pizza': user.coins_pizza,
                    'heartbeat': user.coins_heartbeat
                }
            },
            # Add other timeframes as needed (e.g., 'last_365_days', 'last_30_days', etc.)
            # Example:
            # 'last_365_days': {
            #     'max_metrics': { ... },
            #     'rank_info': { ... },
            #     'coins': { ... }
            # },
        }
    }

    return render_template('dashboard.html',
                           user=user_data,
                           all_achievements=all_achievements,
                           rank_config=RANK_CONFIG)



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
    rank_order = {rank['name']: index for index, rank in enumerate(RANK_CONFIG)}
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

    # Define a mapping of column names to emojis
    badge_emoji_mapping = {
        'Marathon Master': '🏃‍♂️',
        'Climbing King': '🧗‍♂️',
        'Speedster': '🏎️',
        'Consistency Champion': '🔁',
        # Add more mappings as needed
    }

    return render_template('leaderboard.html',
                           users=sorted_users,
                           all_achievements=all_achievements,
                           all_medals=all_medals,
                           badge_emoji_mapping=badge_emoji_mapping)


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


# Error Handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    flash('File is too large. Maximum file size is 16MB.', 'danger')
    return redirect(url_for('index')), 413

@app.errorhandler(404)
def page_not_found(error):
    flash('Page not found.', 'warning')
    return redirect(url_for('index')), 404

@app.errorhandler(500)
def internal_server_error(error):
    logging.exception("An internal server error occurred.")
    flash('An internal server error occurred. Please try again later.', 'danger')
    return redirect(url_for('index')), 500


# Run the app
if __name__ == '__main__':
    app.run(debug=True)
