# models.py
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime

db = SQLAlchemy()

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
    activity_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(255))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    distance = db.Column(db.Float, default=0.0)          # in km
    duration = db.Column(db.Float, default=0.0)          # in hours
    duration_minutes = db.Column(db.Integer, default=0)  # additional minutes
    elevation_gain = db.Column(db.Integer, default=0)    # in meters
    calories = db.Column(db.Integer, default=0)          # in kcal
    heartbeats = db.Column(db.Integer, default=0)
    coins_everest = db.Column(db.Float, default=0.0)
    coins_pizza = db.Column(db.Float, default=0.0)
    coins_heartbeat = db.Column(db.Integer, default=0)
    link = db.Column(db.String(255))
    additional_data = db.Column(JSON, default={})        # Storing additional activity data

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
