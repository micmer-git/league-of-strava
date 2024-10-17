# app/routes.py

# app/routes.py

"""
Routes Module
-------------

This module defines all the route handlers for the Flask application, managing user interactions,
file uploads, data processing, and rendering of templates.

Functions:
----------
1. initialize_app():
    - Purpose: Processes backup CSV files before the first request to initialize user data.
    - Called Automatically: Before the first request is handled by the app.

2. process_backup_csv_files(app):
    - Purpose: Scans the backup directory for CSV files, processes each file, and updates or creates user records in the database.
    - Parameters:
        - app: The Flask application instance.

3. about():
    - Purpose: Renders the About page.
    - Route: `/about`
    - Methods: GET

4. index():
    - Purpose: Handles the home page where users can upload their CSV files.
        - GET: Renders the upload form.
        - POST: Processes the uploaded CSV, updates/creates user records, and redirects to the dashboard.
    - Route: `/`
    - Methods: GET, POST

5. dashboard_search():
    - Purpose: Handles search functionality to find users by username or Strava link and redirects to their dashboard.
    - Route: `/dashboard`
    - Methods: GET, POST

6. dashboard(username):
    - Purpose: Renders the user's dashboard displaying their achievements, stats, and recent activities.
    - Route: `/dashboard/<username>`
    - Methods: GET

7. submit_achievement():
    - Purpose: Allows the submission of new achievements or medals through a form.
    - Route: `/submit-achievement`
    - Methods: GET, POST

8. contact():
    - Purpose: Renders and handles the contact form submissions.
    - Route: `/contact`
    - Methods: GET, POST

9. search():
    - Purpose: Handles search queries for users and redirects to their dashboard if found.
    - Route: `/search`
    - Methods: GET

10. leaderboard():
    - Purpose: Renders the leaderboard page showing user rankings based on various achievement categories and timeframes.
    - Route: `/leaderboard`
    - Methods: GET

Notes:
------
- Ensure that all utility functions used within this module are properly imported from the `utils` package.
- Logging is configured to capture and log all significant events and errors.
- Flash messages are used to provide user feedback on actions like successful uploads or errors.
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models import User, Activity
from app.utils.data_processing import process_dataframe
from app.utils.calculations import calculate_achievements, calculate_coins, calculate_stats, get_user_rank, calculate_max_metrics
from app.utils.helpers import allowed_file, extract_strava_id, convert_to_native
from werkzeug.utils import secure_filename
import os
import pandas as pd
import glob
import logging
from urllib.parse import urlparse

main = Blueprint('main', __name__)

# Strava API Credentials
STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
STRAVA_REDIRECT_URI = os.environ.get('BASE_URL')  # e.g., 'https://yourdomain.com/strava/callback'

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

# Dynamically add Prestige levels
for i in range(2, 101):
    rank_config.append({
        'name': f'Prestige {i}',
        'emoji': '⭐',
        'minPoints': 3150 + (i - 1) * 75,  # Each level requires 75 additional points
    })

# Initialize detailed logging if not already configured
if not logging.getLogger().hasHandlers():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler("app.log"),
            logging.StreamHandler()
        ]
    )

@main.before_app_request
def initialize_app():
    """Process backup CSV files before the first request."""
    if not main.current_app.config.get('INITIALIZATION_DONE', False):
        with main.app_context():
            process_backup_csv_files(main.current_app)
        main.current_app.config['INITIALIZATION_DONE'] = True

def process_backup_csv_files(app):
    """
    Process CSV files located in the backup folder.
    This function scans the backup directory for CSV files,
    processes each file, and updates or creates user records in the database.
    """
    backup_folder = os.path.join(app.static_folder, 'backup')
    csv_files = glob.glob(os.path.join(backup_folder, '*.csv'))
    app.logger.info(f"CSV files found: {csv_files}")

    encodings_to_try = ['utf-8', 'iso-8859-1', 'cp1252', 'latin-1']

    for csv_file in csv_files:
        app.logger.info(f"Processing file: {csv_file}")
        try:
            # Extract username and strava_id from the filename
            base_filename = os.path.basename(csv_file)
            parts = base_filename.split('_')
            if len(parts) < 2:
                app.logger.error(f"Filename {base_filename} does not conform to expected format.")
                continue

            username = parts[0]
            strava_id_with_ext = parts[1]
            strava_id = os.path.splitext(strava_id_with_ext)[0]
            strava_link = f'https://www.strava.com/athletes/{strava_id}'

            for encoding in encodings_to_try:
                try:
                    app.logger.info(f"Trying encoding: {encoding}")
                    df = pd.read_csv(csv_file, encoding=encoding)

                    # Normalize headers
                    df.columns = df.columns.str.replace('’', "'", regex=False)

                    df, error = process_dataframe(df)
                    if error:
                        app.logger.error(f"Error processing {csv_file}: {error}")
                        continue

                    # Calculate necessary metrics
                    achievements = calculate_achievements(df)
                    coins = calculate_coins(df)
                    stats = calculate_stats(df)
                    total_hours = stats.get('hours', 0)
                    user_rank = get_user_rank(total_hours, rank_config)
                    max_metrics = calculate_max_metrics(df)

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
                    app.logger.info(f"Processed user data for {username}")
                    break  # Break the encoding loop if successful

                except Exception as e:
                    db.session.rollback()  # Rollback the session on error
                    app.logger.exception(f"Error processing {csv_file} with encoding {encoding}: {str(e)}")

        except Exception as outer_e:
            app.logger.exception(f"Failed to process {csv_file}: {str(outer_e)}")

    app.logger.info("Finished processing backup CSV files")

@main.route('/about')
def about():
    """Render the About page."""
    return render_template('about.html')

@main.route('/', methods=['GET', 'POST'])
def index():
    """
    Handle the home page where users can upload their CSV files.
    - GET: Render the upload form.
    - POST: Process the uploaded CSV, update/create user records, and redirect to dashboard.
    """
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

        if file and allowed_file(file.filename, main.current_app.config['ALLOWED_EXTENSIONS']):
            filename = secure_filename(file.filename)
            filepath = os.path.join(main.current_app.config['UPLOAD_FOLDER'], filename)
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
                total_hours = stats.get('hours', 0)
                user_rank = get_user_rank(total_hours, rank_config)
                max_metrics = calculate_max_metrics(df)

                # Check if user with the same strava_link already exists
                user = User.query.filter_by(strava_link=strava_link).first()
                if user:
                    # Update existing user
                    user.username = username  # Optionally update username
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
                    stored_fields = [
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
                    ]
                    for key in stored_fields:
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
                return redirect(url_for('main.dashboard', username=username))

            except Exception as e:
                logging.exception("Error processing the file.")
                flash(f'An error occurred during processing: {e}', 'danger')
                return redirect(request.url)
        else:
            flash('Invalid file type. Please upload a CSV file.', 'danger')
            return redirect(request.url)

    return render_template('index.html')

@main.route('/dashboard', methods=['GET', 'POST'])
def dashboard_search():
    """
    Handle dashboard search functionality.
    - GET: Search for user by username or Strava link and redirect to their dashboard.
    """
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
            return redirect(url_for('main.index'))

        if user:
            return redirect(url_for('main.dashboard', username=user.username))
        else:
            flash('User not found.', 'danger')
            return redirect(url_for('main.index'))

    return redirect(url_for('main.index'))

@main.route('/dashboard/<username>')
def dashboard(username):
    """
    Render the user's dashboard with their achievements, stats, and activities.
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        flash('User not found. Please upload your CSV first.', 'danger')
        return redirect(url_for('main.index'))

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

    # Define races (You might want to move this to a separate configuration or database)
    races = [
        # [List of race dictionaries as per your original script]
    ]

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
    image_assignments = {
        'lacco': '/static/cards/Gemini_Generated_Image_k1tmr9k1tmr9k1tm.jpg',
        'mago': '/static/cards/Gemini_Generated_Image_vzmsilvzmsilvzms.jpg',
        'liuk': '/static/cards/Gemini_Generated_Image_kqrkiqkqrkiqkqrk.jpg',
        'micmer': '/static/cards/Gemini_Generated_Image_118vyu118vyu118v.jpg',
        # Add more users as needed
    }
    default_image_url = '/static/cards/default_image.jpg'  # Replace with your default image URL
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
    user_rank = get_user_rank(user.total_hours, rank_config)

    # Define the timeframes as per calculate_achievements function
    timeframes = ['all_time', '7_D', '14_D', '30_D', 'YTD', '365_D']

    return render_template('dashboard.html',
                           user=user_data,
                           achievements=user.achievements,
                           timeframes=timeframes,
                           rank_config=rank_config,
                           rank_info=user_rank)

@main.route('/submit-achievement', methods=['GET', 'POST'])
def submit_achievement():
    """
    Handle submission of new achievements or medals.
    """
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

@main.route('/contact', methods=['GET', 'POST'])
def contact():
    """
    Handle contact form submissions.
    """
    if request.method == 'POST':
        # Handle contact form submission
        # e.g., send an email or store the message
        return redirect('/')
    return render_template('contact.html')  # Render the contact form

@main.route('/search', methods=['GET'])
def search():
    """
    Handle search functionality for users.
    """
    query = request.args.get('query', '').strip()
    if not query:
        flash('Please enter a search query.', 'danger')
        return redirect(url_for('main.index'))

    user = None

    # Attempt to find user by exact match of strava_link
    user = User.query.filter_by(strava_link=query).first()

    if not user:
        # Attempt to find user by username
        user = User.query.filter_by(username=query).first()

    if user:
        return redirect(url_for('main.dashboard', username=user.username))
    else:
        flash('User not found. Please ensure the link is correct or upload the user\'s activities.', 'danger')
        return redirect(url_for('main.index'))

@main.route('/leaderboard')
def leaderboard():
    """
    Render the leaderboard page showing user rankings based on achievements.
    """
    # Define Categories and their Achievements with Emojis
    categories_info = {
        'Run': '💲 10k Run | 💰 21k Run | 🧈 42k Run | 💎 50k Run/Week | 👑 100k Run/Week',
        'Ride': '💲 100k Ride | 💰 150k Ride | 🧈 200k Ride | 💎 300k Ride/week | 👑 600k Ride/week',
        'Elevation': '💲 1000m Elevation | 💰 2000m Elevation | 🧈 Half Everest | 💎 25k Elevation/Month | 👑 50k Elevation/Month',
        'KCal': '💲 1000kCal Activity | 💰 2000kCal Activity | 🧈 4000kCal Activity | 💎 12000kCal Week | 👑 24000kCal Week'
    }

    # Define timeframes
    timeframes = ['all_time', '7_D', '14_D', '30_D', 'YTD', '365_D']
    timeframe = request.args.get('timeframe', 'all_time')
    if timeframe not in timeframes:
        timeframe = 'all_time'

    # Retrieve all users from the database
    users = User.query.all()

    # Prepare per-category user data
    category_leaderboards = {}  # Key: category, Value: list of user data for that category
    category_achievements = {}  # Mapping category to its achievements list

    for category, achievements_str in categories_info.items():
        achievements_list = [ach.split(' ', 1)[1] for ach in achievements_str.split(' | ')]
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

    badge_emoji_mapping = {
        # [Your badge emoji mappings...]
    }

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
