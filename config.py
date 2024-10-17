# config.py

import os
import dj_database_url

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'app/static/uploads'
    ALLOWED_EXTENSIONS = {'csv'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_DATABASE_URI = dj_database_url.parse(DATABASE_URL) if 'DATABASE_URL' in os.environ else 'sqlite:///app.db'

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    DATABASE_URL = os.environ.get('DATABASE_URL')
    SQLALCHEMY_DATABASE_URI = dj_database_url.parse(DATABASE_URL) if DATABASE_URL else 'sqlite:///app.db'
