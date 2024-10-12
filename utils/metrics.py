from datetime import datetime, timedelta
import pandas as pd
from .helpers import convert_to_native

TIMEFRAMES = {
    'lifetime': None,
    'last_7_days': 7,
    'last_14_days': 14,
    'last_30_days': 30,
    'last_365_days': 365
}

def filter_dataframe_by_timeframe(df, days=None):
    if days is None:
        return df
    else:
        cutoff_date = datetime.now() - timedelta(days=days)
        return df[df['Activity_Date'] >= cutoff_date]

def calculate_rank(total_hours, rank_config):
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

def get_user_rank(total_hours, rank_config):
    """Determine user's rank and progress."""
    current_rank, next_rank, progress_percent = calculate_rank(total_hours, rank_config)
    return {
        'current_rank': current_rank,
        'next_rank': next_rank,
        'progress_percent': round(progress_percent, 1),
        'current_points': round(total_hours, 1),
        'next_rank_minPoints': next_rank['minPoints']
    }

def calculate_achievements(df):
    """Calculate user achievements based on activities."""
    achievements = {
        'lifetime': {
            'Achievements': [],
            'Medals': []
        },
        'last_7_days': {
            'Achievements': [],
            'Medals': []
        },
        'last_14_days': {
            'Achievements': [],
            'Medals': []
        },
        'last_30_days': {
            'Achievements': [],
            'Medals': []
        },
        'last_365_days': {
            'Achievements': [],
            'Medals': []
        },
    }

    for timeframe, days in TIMEFRAMES.items():
        if days:
            df_timeframe = filter_dataframe_by_timeframe(df, days)
        else:
            df_timeframe = df

        # Calculate Achievements for the timeframe
        # Example: Longest Streak
        df_sorted = df_timeframe.sort_values('Activity_Date')
        df_sorted['Date'] = df_sorted['Activity_Date'].dt.date
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
        achievements[timeframe]['Achievements'].append({
            'name': 'Longest Streak',
            'emoji': '🔥',
            'description': 'Longest consecutive days with activities',
            'count': max_streak
        })

        # Distance Badges
        distance_thresholds = [100, 200, 300]  # in km
        for threshold in distance_thresholds:
            count = int(df_timeframe[df_timeframe['Distance_km'] >= threshold].shape[0])
            achievements[timeframe]['Achievements'].append({
                'name': f'{threshold} km',
                'emoji': '💯' if threshold == 100 else ('🔱' if threshold == 200 else '⚜️'),
                'description': f'Completed activities covering at least {threshold} km',
                'count': count
            })

        # Duration Badges
        duration_thresholds = [3, 6, 12]  # in hours
        for threshold in duration_thresholds:
            count = int(df_timeframe[df_timeframe['duration'] >= threshold].shape[0])
            achievements[timeframe]['Achievements'].append({
                'name': f'{threshold} Hours',
                'emoji': '⌛' if threshold == 3 else ('⏱️' if threshold == 6 else '🌇'),
                'description': f'Activities with duration of at least {threshold} hours',
                'count': count
            })

        # Weekly Badges
        df_sorted['Week Start'] = df_sorted['Activity_Date'].apply(lambda x: (x - timedelta(days=x.weekday())).date())
        weekly_hours = df_sorted.groupby('Week Start')['duration'].sum()
        weekly_thresholds = [5, 10, 20]  # in hours
        for threshold in weekly_thresholds:
            count = int((weekly_hours >= threshold).sum())
            achievements[timeframe]['Achievements'].append({
                'name': f'{threshold} Hours Week',
                'emoji': '💰' if threshold == 5 else ('🧈' if threshold == 10 else '💎'),
                'description': f'Logged at least {threshold} hours in a week',
                'count': count
            })

        # Consistency Champion
        df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
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
        achievements[timeframe]['Achievements'].append({
            'name': 'Consistency Champion',
            'emoji': '🔁',
            'description': 'Logged activities every day for a month',
            'count': consistency_count
        })

        # Daily kcal Burner
        total_calories = df_timeframe['Calories'].sum()
        achievements[timeframe]['Achievements'].append({
            'name': 'Daily kcal Burner',
            'emoji': '🔥',
            'description': 'Burned over 2000 kcal',
            'count': int(total_calories // 2000)
        })

        # Medals - Special Occasion Badges
        df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

        special_occasions = [
            {'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01']},
            {'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25']},
            # Add more special occasions as needed
        ]
        for occasion in special_occasions:
            count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
            achievements[timeframe]['Medals'].append({
                'name': occasion['name'],
                'emoji': occasion['emoji'],
                'description': occasion['name'],
                'count': count
            })

        # Additional Achievements (could be Medals or Achievements based on your design)
        additional_achievements = [
            {
                'name': 'Marathon Master',
                'emoji': '🏃‍♂️',
                'description': 'Completed a marathon (42.195 km)',
                'count': int(df_timeframe[df_timeframe['Activity_Type'].str.contains('Run', case=False, na=False) & (df_timeframe['Distance_km'] >= 42.195)].shape[0])
            },
            {
                'name': 'Half Marathon Master',
                'emoji': '️2️⃣1️⃣🏃',
                'description': 'Completed a half marathon (21.0975 km)',
                'count': int(df_timeframe[df_timeframe['Activity_Type'].str.contains('Run', case=False, na=False) & (df_timeframe['Distance_km'] >= 21.0975)].shape[0])
            },
            {
                'name': 'Climbing King',
                'emoji': '🧗‍♂️',
                'description': 'Total Elevation_Gain over 1000m',
                'count': int(df_timeframe['Elevation_Gain'].sum() // 1000)
            },
            {
                'name': 'Speedster',
                'emoji': '🏎️',
                'description': 'Achieved an average speed over 30 km/h',
                'count': int(df_timeframe['duration'].apply(lambda x: x * 3.6 > 30).sum()) if 'duration' in df_timeframe.columns else 0
            },
            # Add more as needed
        ]

        for badge in additional_achievements:
            if badge['name'] in ['Climbing King', 'Speedster']:
                # Assuming these are Medals
                achievements[timeframe]['Medals'].append(badge)
            else:
                # Assuming these are Achievements
                achievements[timeframe]['Achievements'].append(badge)

    # Convert to native types
    achievements = convert_to_native(achievements)

    return achievements

def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation_Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['heartbeats'].sum())                       # 1 Heartbeat Coin = 1 heartbeat
    }
    coins = convert_to_native(coins)
    return coins

def calculate_coins_timeframes(df):
    """Calculate coins for different timeframes."""
    coins_timeframes = {}
    for timeframe, days in TIMEFRAMES.items():
        if days:
            df_timeframe = filter_dataframe_by_timeframe(df, days)
        else:
            df_timeframe = df
        coins_timeframes[timeframe] = calculate_coins(df_timeframe)
    return coins_timeframes

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

    try:
        max_elevation = df['Elevation_Gain'].max()
        max_elevation_activity = df.loc[df['Elevation_Gain'].idxmax()]
    except Exception as e:
        logging.error(f"Error calculating max elevation: {e}")
        max_elevation = 0
        max_elevation_activity = None

    try:
        max_duration = df['Moving_Time'].max() / 3600  # Convert to hours
        max_duration_activity = df.loc[df['Moving_Time'].idxmax()]
    except Exception as e:
        logging.error(f"Error calculating max duration: {e}")
        max_duration = 0
        max_duration_activity = None

    try:
        max_distance = df['Distance_km'].max()
        max_distance_activity = df.loc[df['Distance_km'].idxmax()]
    except Exception as e:
        logging.error(f"Error calculating max distance: {e}")
        max_distance = 0
        max_distance_activity = None

    return {
        'max_elevation': float(max_elevation) if pd.notnull(max_elevation) else 0,
        'max_elevation_link': f"https://www.strava.com/activities/{max_elevation_activity['Activity_ID']}" if max_elevation_activity is not None else '#',
        'max_duration': float(round(max_duration, 2)) if pd.notnull(max_duration) else 0,
        'max_duration_link': f"https://www.strava.com/activities/{max_duration_activity['Activity_ID']}" if max_duration_activity is not None else '#',
        'max_distance': float(round(max_distance, 2)) if pd.notnull(max_distance) else 0,
        'max_distance_link': f"https://www.strava.com/activities/{max_distance_activity['Activity_ID']}" if max_distance_activity is not None else '#',
    }

def calculate_stats(df):
    """Calculate user statistics."""
    stats = {}
    for timeframe, days in TIMEFRAMES.items():
        if days:
            df_timeframe = filter_dataframe_by_timeframe(df, days)
        else:
            df_timeframe = df
        print(df_timeframe.keys())
        timeframe_stats = {
            'hours': float(round(df_timeframe['duration'].sum(), 1)),        # Already in hours
            'distance': float(round(df_timeframe['Distance_km'].sum(), 1)),    # Already in km
            'elevation': float(round(df_timeframe['Elevation_Gain'].sum(), 1)),  # in meters
            'calories': float(round(df_timeframe['Calories'].sum(), 1)),    # in kcal
        }

        # Compute Average Temperature
        if 'average_temperature' in df_timeframe.columns:
            timeframe_stats['average_temperature'] = float(round(df_timeframe['average_temperature'].mean(), 1))
        else:
            timeframe_stats['average_temperature'] = 0.0

        # Compute Total Likes
        if 'likes' in df_timeframe.columns:
            # Replace commas with dots and convert to numeric if necessary
            df_timeframe['likes'] = pd.to_numeric(df_timeframe['likes'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
            timeframe_stats['total_likes'] = int(df_timeframe['likes'].sum())
        else:
            timeframe_stats['total_likes'] = 0

        # Compute Most Common Hour
        if 'date' in df_timeframe.columns:
            if not df_timeframe.empty:
                timeframe_stats['most_common_hour'] = int(df_timeframe['date'].dt.hour.mode()[0])
            else:
                timeframe_stats['most_common_hour'] = None
        else:
            timeframe_stats['most_common_hour'] = None

        # Optional: Compute Sums of Other Relevant Metrics
        sum_metrics = ['total_steps', 'jump_count']  # Add other metrics as needed
        for metric in sum_metrics:
            metric_lower = metric.lower()
            if metric in df_timeframe.columns:
                timeframe_stats[f'total_{metric_lower}'] = int(df_timeframe[metric].sum())
            else:
                timeframe_stats[f'total_{metric_lower}'] = 0

        stats[timeframe] = convert_to_native(timeframe_stats)

    return stats
