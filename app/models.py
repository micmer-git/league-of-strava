# app/models.py

from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class User(db.Model):
    """Database model for users."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    strava_link = db.Column(db.String(200), unique=True, nullable=False)
    rank_name = db.Column(db.String(50), nullable=False)
    rank_emoji = db.Column(db.String(10), nullable=False)
    total_hours = db.Column(db.Float, nullable=False, default=0.0)
    coins_everest = db.Column(db.Float, nullable=False, default=0.0)
    coins_pizza = db.Column(db.Float, nullable=False, default=0.0)
    coins_heartbeat = db.Column(db.Integer, nullable=False, default=0)
    achievements = db.Column(JSON, nullable=False, default={})
    stats = db.Column(JSON, nullable=False, default={})
    max_elevation = db.Column(db.Float, nullable=True, default=0.0)
    max_elevation_link = db.Column(db.String(200), nullable=True, default='#')
    max_duration = db.Column(db.Float, nullable=True, default=0.0)
    max_duration_link = db.Column(db.String(200), nullable=True, default='#')
    max_distance = db.Column(db.Float, nullable=True, default=0.0)
    max_distance_link = db.Column(db.String(200), nullable=True, default='#')
    fastest_10k = db.Column(db.Float, nullable=True, default=0.0)
    fastest_10k_link = db.Column(db.String(200), nullable=True, default='#')
    fastest_marathon = db.Column(db.Float, nullable=True, default=0.0)
    fastest_marathon_link = db.Column(db.String(200), nullable=True, default='#')
    fastest_half_marathon = db.Column(db.Float, nullable=True, default=0.0)
    fastest_half_marathon_link = db.Column(db.String(200), nullable=True, default='#')

    activities = db.relationship('Activity', backref='user', lazy=True)

class Activity(db.Model):
    """Database model for activities."""
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
    additional_data = db.Column(JSON, nullable=True)
