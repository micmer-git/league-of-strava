from extensions import db  # Import db from extensions
import os

# Strava API Credentials (if needed in models, else consider moving to config)
STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
STRAVA_REDIRECT_URI = os.environ.get('BASE_URL')  # e.g., 'https://yourdomain.com/strava/callback'
REDIRECT_URI = os.environ.get('BASE_URL')
# Database Models
class User(db.Model):
    __tablename__ = 'users'  # Explicitly set table name to avoid confusion
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

    activities = db.relationship('Activity', backref='users', lazy=True)

class Activity(db.Model):
    __tablename__ = 'activities'  # Explicitly set table name
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # New Field to Store Additional Data
    additional_data = db.Column(db.JSON, nullable=True)
