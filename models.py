from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    strava_link = db.Column(db.String(200), unique=True, nullable=False)
    rank_name = db.Column(db.String(50), nullable=False)
    rank_emoji = db.Column(db.String(10), nullable=False)
    total_hours = db.Column(db.Float, nullable=False)
    coins_everest = db.Column(db.Float, nullable=False)
    coins_pizza = db.Column(db.Float, nullable=False)
    coins_heartbeat = db.Column(db.Integer, nullable=False)
    achievements = db.Column(db.JSON, nullable=False)
    stats = db.Column(db.JSON, nullable=False)
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
    duration_minutes = db.Column(db.Integer, nullable=False)
    elevation_gain = db.Column(db.Float, nullable=False)  # in meters
    calories = db.Column(db.Float, nullable=False)  # in kcal
    heartbeats = db.Column(db.Integer, nullable=False)
    coins_everest = db.Column(db.Float, nullable=False)
    coins_pizza = db.Column(db.Float, nullable=False)
    coins_heartbeat = db.Column(db.Integer, nullable=False)
    link = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    additional_data = db.Column(db.JSON, nullable=True)
