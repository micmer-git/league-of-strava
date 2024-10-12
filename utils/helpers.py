# utils/helpers.py
import logging
import numpy as np
import pandas as pd
from config import ALLOWED_EXTENSIONS

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
    """
    Check if the uploaded file has an allowed extension.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


from geopy.distance import geodesic

def is_within_tolerance(point1, point2, tolerance_m=500):
    """
    Check if two GPS points are within the specified tolerance.

    :param point1: Tuple of (latitude, longitude) for the first point.
    :param point2: Tuple of (latitude, longitude) for the second point.
    :param tolerance_m: Tolerance in meters.
    :return: Boolean indicating if points are within tolerance.
    """
    return geodesic(point1, point2).meters <= tolerance_m

def has_completed_climb(activity_gps, climb_points, tolerance_m=500):
    """
    Determine if an activity includes a specific climb.

    :param activity_gps: List of tuples representing the activity's GPS track.
    :param climb_points: List of tuples representing the climb's GPS points.
    :param tolerance_m: Tolerance in meters.
    :return: Boolean indicating if the climb is completed.
    """
    for climb_point in climb_points:
        point_matched = False
        for activity_point in activity_gps:
            if is_within_tolerance(activity_point, climb_point, tolerance_m):
                point_matched = True
                break
        if not point_matched:
            return False  # One of the climb points wasn't matched
    return True  # All climb points were matched

from datetime import datetime

def has_completed_race(activity_date, activity_gps, race_points, official_date, tolerance_m=500):
    """
    Determine if an activity includes a specific race.

    :param activity_date: String representing the activity date in 'YYYY-MM-DD' format.
    :param activity_gps: List of tuples representing the activity's GPS track.
    :param race_points: List of tuples representing the race's GPS points.
    :param official_date: String representing the official race date in 'YYYY-MM-DD' format.
    :param tolerance_m: Tolerance in meters.
    :return: Boolean indicating if the race is completed.
    """
    # Check if activity date matches the official race date
    if activity_date != official_date:
        return False

    # Check if all race points are present in the activity GPS
    for race_point in race_points:
        point_matched = False
        for activity_point in activity_gps:
            if is_within_tolerance(activity_point, race_point, tolerance_m):
                point_matched = True
                break
        if not point_matched:
            return False  # One of the race points wasn't matched
    return True  # All race points were matched

import json

def load_challenges(file_path='challenges.json'):
    """
    Load climb and race challenges from a JSON file.

    :param file_path: Path to the challenges JSON file.
    :return: Dictionary containing climbs and races.
    """
    with open(file_path, 'r') as f:
        challenges = json.load(f)
    return challenges

def process_achievements(user, challenges):
    """
    Process user activities to update achievements.

    :param user: User object containing activities and points.
    :param challenges: Dictionary containing climbs and races.
    :return: Updated achievements dictionary.
    """
    achievements = user.achievements  # Existing achievements
    achievements = {
        "lifetime": {
            "Achievements": [],
            "Medals": []
        },
        "last_365_days": {
            "Achievements": [],
            "Medals": []
        },
        "last_30_days": {
            "Achievements": [],
            "Medals": []
        },
        "last_14_days": {
            "Achievements": [],
            "Medals": []
        },
        "last_7_days": {
            "Achievements": [],
            "Medals": []
        }
    }
    # Convert challenge points to tuples
    climbs = challenges.get('climbs', [])
    races = challenges.get('races', [])

    # Iterate through each activity
    for activity in user.activities:
        activity_gps = [(point['lat'], point['lon']) for point in activity['gps_track']]
        activity_date = activity['date']

        # Check Climb Completions
        for climb in climbs:
            climb_name = climb['name']
            climb_points = [(pt['lat'], pt['lon']) for pt in climb['points']]
            tolerance = climb.get('tolerance_m', 500)

            if has_completed_climb(...):
                # Add to 'lifetime' achievements
                existing = next((a for a in achievements['lifetime']['Achievements'] if a['name'] == climb_name), None)
                if existing:
                    existing['count'] += 1
                else:
                    achievements['lifetime']['Achievements'].append({
                        'name': climb_name,
                        'emoji': '🏔️',
                        'count': 1,
                        'description': f"Completed the {climb_name}",
                        'last_month_earned': 1
                    })
        # Check Race Completions
        for race in races:
            race_name = race['name']
            race_points = [(pt['lat'], pt['lon']) for pt in race['points']]
            official_date = race['official_date']
            tolerance = race.get('tolerance_m', 500)

            if has_completed_race(activity_date, activity_gps, race_points, official_date, tolerance):
                # Award race medal
                existing = next((m for m in achievements['Medals'] if m['name'] == race_name), None)
                if existing:
                    existing['count'] += 1
                else:
                    achievements['Medals'].append({
                        'name': race_name,
                        'emoji': '🏅',  # Assign appropriate emoji
                        'count': 1,
                        'description': f"Completed the {race_name}",
                        'last_month_earned': 1
                    })

    return achievements
