# models.py
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    strava_link = db.Column(db.String(255), unique=True, nullable=False)
    rank_name = db.Column(db.String(100))
    rank_emoji = db.Column(db.String(10))
    total_hours = db.Column(db.Float, default=0.0)
    coins_everest = db.Column(db.Float, default=0.0)
    coins_pizza = db.Column(db.Float, default=0.0)
    coins_heartbeat = db.Column(db.Integer, default=0)
    achievements = db.Column(JSON, default={})  # Storing as JSON
    stats = db.Column(JSON, default={})         # Storing as JSON
    max_elevation = db.Column(db.Integer, default=0)
    max_elevation_link = db.Column(db.String(255), default='#')
    max_duration = db.Column(db.Integer, default=0)
    max_duration_link = db.Column(db.String(255), default='#')
    max_distance = db.Column(db.Integer, default=0)
    max_distance_link = db.Column(db.String(255), default='#')

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
