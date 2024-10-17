# app/utils/calculations.py

import pandas as pd
from app.utils.helpers import convert_to_native
import logging
from datetime import datetime, timedelta

# Define Races (You might want to move this to a separate configuration or database)
races = [
    {
        'name': 'Maratona dles Dolomites (Lungo)',
        'start_date': datetime(2024, 7, 7),
        'end_date': datetime(2024, 7, 7),
        'distance_km': 135.8,
        'distance_variance': 0.05,  # 5%
        'ascent_m': 4272,
        'ascent_variance': 0.05
    },
    {
        'name': 'Trail Run',
        'start_date': datetime(2023, 7, 2),
        'end_date': datetime(2023, 7, 2),
        'distance_km': 54,
        'distance_variance': 0.05,
        'ascent_m': 1745,
        'ascent_variance': 0.05
    },
    {
        'name': 'Boston Marathon',
        'start_date': datetime(2024, 4, 15),
        'end_date': datetime(2024, 4, 15),
        'distance_km': 42.6,
        'distance_variance': 0.05,
        'ascent_m': 250,
        'ascent_variance': 0.05
    },
    {
        'name': 'Berghem Mola Mia 2024 (Mez)',
        'start_date': datetime(2024, 6, 16),
        'end_date': datetime(2024, 6, 16),
        'distance_km': 136.36,
        'distance_variance': 0.05,
        'ascent_m': 3112,
        'ascent_variance': 0.05
    },
    {
        'name': 'Berghem Mola Mia 2023 (Lonk)',
        'start_date': datetime(2024, 6, 11),
        'end_date': datetime(2024, 6, 11),
        'distance_km': 177.82,
        'distance_variance': 0.05,
        'ascent_m': 3389,
        'ascent_variance': 0.05
    },
    # Add more races as needed
]

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

def calculate_coins(df):
    """Calculate coins based on activities."""
    coins = {
        'everest': float(round(df['Elevation_Gain'].sum() / 8848, 2)),  # 1 Everest = 8848m
        'pizza': float(round(df['Calories'].sum() / 1000, 2)),         # 1 Pizza = 1000 kcal
        'heartbeat': int(df['Average_Heart_Rate'].sum() / 1000)       # 1 Heartbeat Coin = 1 heartbeat (adjust as needed)
    }
    coins = convert_to_native(coins)
    return coins

def calculate_stats(df):
    """Calculate user statistics, including average temperature, total likes, and most common hour."""
    stats = {
        'hours': float(round(df['Moving_Time'].sum() / 3600, 1)),        # Convert to hours
        'distance': float(round(df['Distance_km'].sum(), 1)),           # Already in km
        'elevation': float(round(df['Elevation_Gain'].sum(), 1)),       # in meters
        'calories': float(round(df['Calories'].sum(), 1)),              # in kcal
    }

    # Compute Average Temperature
    if 'Average_Temperature' in df.columns:
        stats['average_temperature'] = float(round(df['Average_Temperature'].mean(), 1))
    else:
        stats['average_temperature'] = 0.0
        logging.warning("'Average_Temperature' column not found in DataFrame.")

    # Compute Total Likes
    if 'Likes' in df.columns:
        # Replace commas with dots and convert to numeric if necessary
        df['Likes'] = pd.to_numeric(df['Likes'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        stats['total_likes'] = int(df['Likes'].sum())
    else:
        stats['total_likes'] = 0
        logging.warning("'Likes' column not found in DataFrame. Setting 'total_likes' to 0.")

    # Compute Most Common Hour
    if 'Activity_Date' in df.columns:
        # Ensure 'Activity_Date' is datetime
        df['Activity_Date'] = pd.to_datetime(df['Activity_Date'], errors='coerce')
        df = df.dropna(subset=['Activity_Date'])  # Drop rows where date parsing failed
        if not df.empty:
            stats['most_common_hour'] = int(df['Activity_Date'].dt.hour.mode()[0])
        else:
            stats['most_common_hour'] = None
            logging.warning("No valid 'Activity_Date' entries found for computing 'most_common_hour'.")
    else:
        stats['most_common_hour'] = None
        logging.warning("'Activity_Date' column not found in DataFrame. Cannot compute 'most_common_hour'.")

    # Optional: Compute Sums of Other Relevant Metrics
    # Example: Total Steps, Total Jump Count, etc.
    sum_metrics = ['Total_Steps', 'Jump_Count']  # Add other metrics as needed
    for metric in sum_metrics:
        if metric in df.columns:
            stats[f'total_{metric.lower()}'] = int(df[metric].sum())
        else:
            stats[f'total_{metric.lower()}'] = 0
            logging.warning(f"'{metric}' column not found in DataFrame. Setting 'total_{metric.lower()}' to 0.")

    stats = convert_to_native(stats)
    return stats

def calculate_max_metrics(df):
    """Determine the user's top activities, including fastest 10K and Marathon."""
    if df.empty:
        return {
            'max_elevation': 0,
            'max_elevation_link': '#',
            'max_duration': 0,
            'max_duration_link': '#',
            'max_distance': 0,
            'max_distance_link': '#',
            'fastest_half_marathon': 0,
            'fastest_half_marathon_link': '#',
            'fastest_10k': 0,
            'fastest_10k_link': '#',
            'fastest_marathon': 0,
            'fastest_marathon_link': '#',
        }

    df['Type'] = df['Activity_Type'].astype(str)

    # Max Elevation Gain
    max_elevation = df['Elevation_Gain'].max()
    max_elevation_activity = df.loc[df['Elevation_Gain'].idxmax()]
    max_elevation_link = f"https://www.strava.com/activities/{max_elevation_activity['Activity_ID']}"

    # Max Duration
    max_duration = df['Moving_Time'].max() / 3600  # Convert to hours
    max_duration_activity = df.loc[df['Moving_Time'].idxmax()]
    max_duration_link = f"https://www.strava.com/activities/{max_duration_activity['Activity_ID']}"

    # Max Distance
    max_distance = df['Distance_km'].max()  # Already in km
    max_distance_activity = df.loc[df['Distance_km'].idxmax()]
    max_distance_link = f"https://www.strava.com/activities/{max_distance_activity['Activity_ID']}"

    # Fastest Half Marathon (Minimum Duration for Distance >= 21.0975 km)
    half_marathons = df[df['Distance_km'] >= 21.0975]
    half_marathons = half_marathons[half_marathons['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not half_marathons.empty:
        fastest_half_marathon_duration = half_marathons['Moving_Time'].min() / 3600  # in hours
        fastest_half_marathon_activity = half_marathons.loc[half_marathons['Moving_Time'].idxmin()]
        fastest_half_marathon_link = f"https://www.strava.com/activities/{fastest_half_marathon_activity['Activity_ID']}"
    else:
        fastest_half_marathon_duration = 0
        fastest_half_marathon_link = '#'

    # Fastest Marathon (Minimum Duration for Distance >= 42.195 km)
    marathons = df[df['Distance_km'] >= 42.195]
    marathons = marathons[marathons['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not marathons.empty:
        fastest_marathon_duration = marathons['Moving_Time'].min() / 3600  # in hours
        fastest_marathon_activity = marathons.loc[marathons['Moving_Time'].idxmin()]
        fastest_marathon_link = f"https://www.strava.com/activities/{fastest_marathon_activity['Activity_ID']}"
    else:
        fastest_marathon_duration = 0
        fastest_marathon_link = '#'

    # Fastest 10K (Minimum Duration for Distance >= 10 km)
    ten_k_runs = df[df['Distance_km'] >= 10]
    ten_k_runs = ten_k_runs[ten_k_runs['Activity_Type'].str.contains('Run', case=False, na=False)]

    if not ten_k_runs.empty:
        fastest_10k_duration = ten_k_runs['Moving_Time'].min() / 3600  # in hours
        fastest_10k_activity = ten_k_runs.loc[ten_k_runs['Moving_Time'].idxmin()]
        fastest_10k_link = f"https://www.strava.com/activities/{fastest_10k_activity['Activity_ID']}"
    else:
        fastest_10k_duration = 0
        fastest_10k_link = '#'

    return {
        'max_elevation': float(max_elevation),
        'max_elevation_link': max_elevation_link,
        'max_duration': float(round(max_duration, 2)),
        'max_duration_link': max_duration_link,
        'max_distance': float(round(max_distance, 2)),
        'max_distance_link': max_distance_link,
        'fastest_half_marathon': float(round(fastest_half_marathon_duration, 2)),
        'fastest_half_marathon_link': fastest_half_marathon_link,
        'fastest_10k': float(round(fastest_10k_duration, 2)),
        'fastest_10k_link': fastest_10k_link,
        'fastest_marathon': float(round(fastest_marathon_duration, 2)),
        'fastest_marathon_link': fastest_marathon_link,
    }

def calculate_achievements(df):
    """
    Calculate user achievements based on activities across various timeframes.

    Parameters:
    - df (pd.DataFrame): DataFrame containing user activities.

    Returns:
    - dict: Structured achievements and medals categorized by timeframe.
    """

    # Define the current date based on the max Activity_Date in the dataframe or today
    if not df.empty:
        current_date = df['Activity_Date'].max().normalize()
    else:
        current_date = pd.Timestamp.today().normalize()

    # Define the timeframes
    timeframes = {
        'all_time': {
            'start_date': pd.Timestamp.min,
            'end_date': current_date
        },
        '7_D': {
            'start_date': current_date - pd.Timedelta(days=6),
            'end_date': current_date
        },
        '14_D': {
            'start_date': current_date - pd.Timedelta(days=13),
            'end_date': current_date
        },
        '30_D': {
            'start_date': current_date - pd.Timedelta(days=29),
            'end_date': current_date
        },
        'YTD': {
            'start_date': pd.Timestamp(year=current_date.year, month=1, day=1),
            'end_date': current_date
        },
        '365_D': {
            'start_date': current_date - pd.Timedelta(days=364),
            'end_date': current_date
        }
    }

    # Initialize the achievements dictionary
    achievements = {}

    # Define categories information
    categories_info = {
        'Run': '10k | 21k | 42k | 50km/Week | 100km/Week',
        'Ride': '100km | 150km | 200km | 300km/Week | 600k Ride/Week',
        'Elevation': '1000m | 2000m | Half Everest | 25k/Month | 25k/Month',
        'KCal': '1000kCal | 2000kCal | 4000kCal | 12000kCal/Week | 24000kCal/Week'
    }

    # Define special occasions for Medals
    special_occasions = [
        { 'name': 'New Year Run', 'emoji': '🎉', 'dates': ['01-01'] },
        { 'name': 'Christmas Run', 'emoji': '🎄', 'dates': ['12-25'] },
        { 'name': 'Valentine\'s Day', 'emoji': '❤️', 'dates': ['02-14'] },
        { 'name': 'Easter', 'emoji': '🐣', 'dates': ['04-04'] },  # Adjust as needed
        { 'name': 'Halloween', 'emoji': '🎃', 'dates': ['10-31'] },
        { 'name': 'Thanksgiving', 'emoji': '🦃', 'dates': ['11-25'] },  # Adjust date as needed
        { 'name': 'Diwali', 'emoji': '🪔', 'dates': ['11-04'] },  # Adjust date as needed
        { 'name': 'Hanukkah', 'emoji': '🕎', 'dates': ['12-18'] },  # Adjust date as needed
        { 'name': 'Chinese New Year', 'emoji': '🐉', 'dates': ['02-01'] },  # Adjust date as needed
        { 'name': 'International Workers\' Day', 'emoji': '✊', 'dates': ['05-01'] }
    ]

    # Iterate over each timeframe and compute achievements
    for timeframe, dates in timeframes.items():
        start_date = dates['start_date']
        end_date = dates['end_date']

        # Filter dataframe for the current timeframe
        mask = (df['Activity_Date'] >= start_date) & (df['Activity_Date'] <= end_date)
        df_tf = df.loc[mask].copy()

        # Initialize the structure for the current timeframe
        achievements[timeframe] = {
            'categories': [],
            'other_achievements': [],
            'Medals': []
        }

        # Initialize categories dictionary
        for category, intro in categories_info.items():
            achievements[timeframe]['categories'].append({
                'name': category,
                'intro': intro,
                'achievements': []
            })

        # ------------------ Achievements Calculation ------------------

        # Sort activities by date
        df_sorted = df_tf.sort_values('Activity_Date').copy()
        df_sorted['Date'] = df_sorted['Activity_Date'].dt.date

        # Unique sorted dates
        unique_dates = sorted(df_sorted['Date'].dropna().unique())

        # Calculate Longest Streak (Consecutive Days with Activities)
        max_streak = 1
        current_streak = 1
        for i in range(1, len(unique_dates)):
            if (unique_dates[i] - unique_dates[i-1]).days == 1:
                current_streak += 1
                if current_streak > max_streak:
                    max_streak = current_streak
            else:
                current_streak = 1

        # Assign Longest Streak to 'Other Achievements'
        streak_achievement = {
            'name': 'Longest Streak',
            'emoji': '🔥',
            'description': 'Longest consecutive days with activities',
            'count': int(max_streak)
        }
        achievements[timeframe]['other_achievements'].append(streak_achievement)

        # ========== Distance Run Badges ==========
        distance_run_badges = {
            'thresholds': [10, 21, 42, 50, 100],  # in km or km/week
            'unit': 'km',
            'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
        }

        for idx, threshold in enumerate(distance_run_badges['thresholds']):
            emoji = distance_run_badges['emoji_sequence'][idx] if idx < len(distance_run_badges['emoji_sequence']) else '🏅'

            if threshold >= 50:
                # Weekly threshold for Run
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_distance = df_sorted[df_sorted['Activity_Type'] == 'Run'].groupby('Week')['Distance_km'].sum()
                count = int((weekly_distance >= threshold).sum())
                name = f'{threshold}k Run/Week'
                description = f'Completed at least {threshold} km running in a week'
            else:
                # Per activity threshold for Run
                count = int(df_sorted[(df_sorted['Distance_km'] >= threshold) & (df_sorted['Activity_Type'] == 'Run')].shape[0])
                name = f'{threshold}k Run'
                description = f'Completed activities covering at least {threshold} km running'

            # Assign to 'Run' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Run':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

        # ========== Distance Ride Badges ==========
        distance_ride_badges = {
            'thresholds': [100, 150, 200, 300, 600],  # in km or km/week
            'unit': 'km',
            'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
        }

        for idx, threshold in enumerate(distance_ride_badges['thresholds']):
            emoji = distance_ride_badges['emoji_sequence'][idx] if idx < len(distance_ride_badges['emoji_sequence']) else '🚴‍♂️'

            if threshold >= 300:
                # Weekly threshold for Ride
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_distance = df_sorted[df_sorted['Activity_Type'] == 'Ride'].groupby('Week')['Distance_km'].sum()
                count = int((weekly_distance >= threshold).sum())
                name = f'{threshold}k Ride/Week'
                description = f'Completed at least {threshold} km riding in a week'
            else:
                # Per activity threshold for Ride
                count = int(df_sorted[(df_sorted['Distance_km'] >= threshold) & (df_sorted['Activity_Type'] == 'Ride')].shape[0])
                name = f'{threshold}k Ride'
                description = f'Completed activities covering at least {threshold} km riding'

            # Assign to 'Ride' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Ride':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

        # ========== Elevation Badges ==========
        elevation_thresholds = [1000, 2000, 4424, 10000, 25000]  # in meters (Half Everest ~4424m, 25k/month)
        elevation_emojis = ['💲', '💰', '🧈', '👑','💎']  # Distinct emojis for Elevation

        for idx, threshold in enumerate(elevation_thresholds):
            if idx < len(elevation_emojis):
                emoji = elevation_emojis[idx]
            else:
                emoji = '🏅'  # Default emoji if overflow

            if threshold == 4424:
                name = 'Half Everest'
                description = 'Completed activities with elevation gain of at least Half Everest (4424 meters)'
            elif threshold == 25000:
                name = '25k Elevation/Month'
                description = 'Achieved a total of 25,000 meters elevation gain in a month'

            elif threshold == 10000:
                name = '10k Elevation/Week'
                description = 'Achieved a total of 10,000 meters elevation gain in a week'
            else:
                name = f'{threshold}m Elevation'
                description = f'Completed activities with elevation gain of at least {threshold} meters'

            if threshold == 25000:
                # Monthly elevation threshold
                df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
                monthly_elevation = df_sorted.groupby('Month')['Elevation_Gain'].sum()
                count = int((monthly_elevation >= threshold).sum())

            elif threshold == 10000:
                # Weekly elevation threshold
                df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
                weekly_elevation = df_sorted.groupby('Week')['Elevation_Gain'].sum()
                count = int((weekly_elevation >= threshold).sum())
            else:
                # Per activity elevation threshold
                count = int(df_sorted[df_sorted['Elevation_Gain'] >= threshold].shape[0])

            # Assign to 'Elevation' category
            for category in achievements[timeframe]['categories']:
                if category['name'] == 'Elevation':
                    category['achievements'].append({
                        'name': name,
                        'emoji': emoji,
                        'description': description,
                        'count': count
                    })
                    break

        # ========== Consistency Badges ==========
        # Weekly Consistency
        df_sorted['Week'] = df_sorted['Activity_Date'].dt.to_period('W')
        weekly_days = df_sorted.groupby('Week')['Date'].nunique()
        weekly_consistent = int((weekly_days == 7).sum())

        # Monthly Consistency
        df_sorted['Month'] = df_sorted['Activity_Date'].dt.to_period('M')
        monthly_days = df_sorted.groupby('Month')['Date'].nunique()
        months_unique = df_sorted['Month'].unique()
        monthly_consistent = 0
        for month in months_unique:
            month_start = month.start_time
            month_end = month.end_time
            days_in_month = (month_end - month_start).days + 1
            active_days = monthly_days.get(month, 0)
            if active_days == days_in_month:
                monthly_consistent += 1

        # Assign Consistency Achievements to 'Other Achievements' category
        consistency_achievements = [
            {
                'name': 'Weekly Consistency',
                'emoji': '📅',
                'description': 'Logged activities every day of a week',
                'count': weekly_consistent
            },
            {
                'name': 'Monthly Consistency',
                'emoji': '🗓️',
                'description': 'Logged activities every day of a month',
                'count': monthly_consistent
            }
        ]

        for achievement in consistency_achievements:
            achievements[timeframe]['other_achievements'].append({
                'name': achievement['name'],
                'emoji': achievement['emoji'],
                'description': achievement['description'],
                'count': achievement['count']
            })

        # ========== KCal Badges ==========
        kcal_badges = {
            'Per Activity': {
                'thresholds': [1000, 2000, 4000],
                'emojis': ['💲', '💰', '🧈'],
                'description': 'Burned at least {} kcal in an activity'
            },
            'Weekly': {
                'thresholds': [12000, 24000],  # Adjusted to realistic weekly kcal
                'emojis': ['💎','👑'],
                'description': 'Burned at least {} kcal in a week'
            }
        }

        # Assign KCal Achievements to 'KCal' category
        for category in achievements[timeframe]['categories']:
            if category['name'] == 'KCal':
                # Per Activity KCal Badges
                for threshold, emoji in zip(kcal_badges['Per Activity']['thresholds'], kcal_badges['Per Activity']['emojis']):
                    count = int(df_sorted[df_sorted['Calories'] >= threshold].shape[0])
                    kcal_achievement = {
                        'name': f'{threshold}kCal Activity',
                        'emoji': emoji,
                        'description': kcal_badges['Per Activity']['description'].format(threshold),
                        'count': count
                    }
                    category['achievements'].append(kcal_achievement)

                # Weekly KCal Badges
                weekly_kcal = df_sorted.groupby('Week')['Calories'].sum()
                for threshold, emoji in zip(kcal_badges['Weekly']['thresholds'], kcal_badges['Weekly']['emojis']):
                    count = int((weekly_kcal >= threshold).sum())
                    kcal_week_achievement = {
                        'name': f'{threshold}kCal Week',
                        'emoji': emoji,
                        'description': kcal_badges['Weekly']['description'].format(threshold),
                        'count': count
                    }
                    category['achievements'].append(kcal_week_achievement)

                break

        # ------------------ Other Achievements ------------------
        # Additional Achievements with distinct emojis
        additional_achievements = [
            {
                'name': '7-Day Caloric Champion',
                'emoji': '📅🔥',
                'description': 'Logged at least 1000 kcal consumed each day for 7 consecutive days',
                'count': int(
                    (df_sorted.groupby('Date')['Calories'].sum()
                     .ge(1000)
                     .rolling(7)
                     .sum() == 7).sum()
                )
            },
            {
                'name': 'Marathon Master',
                'emoji': '🏃‍♂️',
                'description': 'Completed a marathon (42.195 km)',
                'count': int(df_tf[
                    (df_tf['Activity_Type'].str.contains('Run', case=False, na=False)) &
                    (df_tf['Distance_km'] >= 42.195)
                ].shape[0]),
            },
            {
                'name': 'Half Marathon Master',
                'emoji': '👟',
                'description': 'Completed a half marathon (21.0975 km)',
                'count': int(df_tf[
                    (df_tf['Activity_Type'].str.contains('Run', case=False, na=False)) &
                    (df_tf['Distance_km'] >= 21.0975)
                ].shape[0]),
            },
            {
                'name': 'Climbing King',
                'emoji': '🧗‍♂️',
                'description': 'Total Elevation_Gain over 1000m',
                'count': int(df_tf['Elevation_Gain'].sum() // 1000),
            },
            {
                'name': 'Speedster',
                'emoji': '🏎️',
                'description': 'Achieved an average speed over 30 km/h',
                'count': int(df_tf['Max_Speed'].fillna(0).apply(lambda x: x * 3.6 > 30).sum()) if 'Max_Speed' in df_tf.columns else 0,
            },
            # Add more as needed
        ]

        for achievement in additional_achievements:
            achievements[timeframe]['other_achievements'].append({
                'name': achievement['name'],
                'emoji': achievement['emoji'],
                'description': achievement['description'],
                'count': achievement['count']
            })

        # ------------------ Medals (Special Achievements) ------------------
        df_sorted['Month-Day'] = df_sorted['Activity_Date'].dt.strftime('%m-%d')

        for occasion in special_occasions:
            count = int(df_sorted[df_sorted['Month-Day'].isin(occasion['dates'])].shape[0])
            achievements[timeframe]['Medals'].append({
                'name': occasion['name'],
                'emoji': occasion['emoji'],
                'description': occasion['name'],
                'count': count
            })

        # ------------------ Additional Medals ------------------
        # Define additional Medals with their respective emojis
        additional_medals = [
            {
                'name': 'Steep Climber',
                'emoji': '🧗‍♀️',
                'description': 'Logged an activity with elevation gain > 3000m and distance < 100 km',
                'count': int(df_tf[(df_tf['Elevation_Gain'] > 3000) & (df_tf['Distance_km'] < 100)].shape[0]),
            },
            {
                'name': 'Coppa Coppi Protector',
                'emoji': '🥩',
                'description': 'Logged an activity with elevation gain > 2000m and distance < 100 km',
                'count': int(df_tf[(df_tf['Elevation_Gain'] > 2000) & (df_tf['Distance_km'] < 100)].shape[0]),
            },
            # You can remove duplicate medals if necessary
        ]

        for medal in additional_medals:
            achievements[timeframe]['Medals'].append({
                'name': medal['name'],
                'emoji': medal['emoji'],
                'description': medal['description'],
                'count': medal['count']
            })

    # Convert all NumPy types to native Python types if necessary
        achievements = convert_to_native(achievements)
    return achievements
