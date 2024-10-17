# config.py
from datetime import datetime, timedelta
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


italian_column_names = [
    'Activity_ID',               # 0
    'Activity_Date',             # 1
    'Activity_Name',             # 2
    'Activity_Type',             # 3
    'Activity_Description',      # 4
    'Elapsed_Time_1',            # 5
    'Distance_1',                # 6
    'Max_Heart_Rate_1',          # 7
    'Relative_Effort_1',         # 8
    'Commute_1',                 # 9
    'Activity_Private_Note',     # 10
    'Activity_Gear_1',           # 11
    'Filename',                  # 12
    'Athlete_Weight',            # 13
    'Bike_Weight',               # 14
    'Elapsed_Time_2',            # 15
    'Moving_Time',               # 16
    'Distance_2',                # 17
    'Max_Speed',                 # 18
    'Average_Speed',             # 19
    'Elevation_Gain',            # 20
    'Elevation_Loss',            # 21
    'Elevation_Low',             # 22
    'Elevation_High',            # 23
    'Max_Grade',                 # 24
    'Average_Grade_1',           # 25
    'Average_Positive_Grade',    # 26
    'Average_Negative_Grade',    # 27
    'Max_Cadence',               # 28
    'Average_Cadence',           # 29
    'Max_Heart_Rate_2',          # 30
    'Average_Heart_Rate',        # 31
    'Max_Watts',                 # 32
    'Average_Watts',             # 33
    'Calories',                  # 34
    'Max_Temperature',           # 35
    'Average_Temperature',       # 36
    'Relative_Effort_2',         # 37
    'Total_Work',                # 38
    'Number_of_Runs',            # 39
    'Uphill_Time',               # 40
    'Downhill_Time',             # 41
    'Other_Time',                # 42
    'Perceived_Exertion_1',      # 43
    'Type',                      # 44
    'Start_Time',                # 45
    'Weighted_Average_Power',    # 46
    'Power_Count',               # 47
    'Prefer_Perceived_Exertion', # 48
    'Perceived_Relative_Effort', # 49
    'Commute_2',                 # 50
    'Total_Weight_Lifted',       # 51
    'From_Upload',               # 52
    'Grade_Adjusted_Distance',   # 53
    'Weather_Observation_Time',  # 54
    'Weather_Condition',         # 55
    'Weather_Temperature',       # 56
    'Apparent_Temperature',      # 57
    'Dewpoint',                  # 58
    'Humidity',                  # 59
    'Weather_Pressure',          # 60
    'Wind_Speed',                # 61
    'Wind_Gust',                 # 62
    'Wind_Bearing',              # 63
    'Precipitation_Intensity',   # 64
    'Sunrise_Time',              # 65
    'Sunset_Time',               # 66
    'Moon_Phase',                # 67
    'Bike_1',                    # 68
    'Gear',                      # 69
    'Precipitation_Probability', # 70
    'Precipitation_Type',        # 71
    'Cloud_Cover',               # 72
    'Weather_Visibility',        # 73
    'UV_Index',                  # 74
    'Weather_Ozone',             # 75
    'Jump_Count',                # 76
    'Total_Grit',                # 77
    'Average_Flow',              # 78
    'Flagged',                   # 79
]

english_column_names = [
    'Activity_ID',               # 0
    'Activity_Date',             # 1
    'Activity_Name',             # 2
    'Activity_Type',             # 3
    'Activity_Description',      # 4
    'Elapsed_Time_1',            # 5
    'Distance_1',                # 6
    'Max_Heart_Rate_1',          # 7
    'Relative_Effort_1',         # 8
    'Commute_1',                 # 9
    'Activity_Private_Note',     # 10
    'Activity_Gear_1',           # 11
    'Filename',                  # 12
    'Athlete_Weight',            # 13
    'Bike_Weight',               # 14
    'Elapsed_Time_2',            # 15
    'Moving_Time',               # 16
    'Distance_2',                # 17
    'Max_Speed',                 # 18
    'Average_Speed',             # 19
    'Elevation_Gain',            # 20
    'Elevation_Loss',            # 21
    'Elevation_Low',             # 22
    'Elevation_High',            # 23
    'Max_Grade',                 # 24
    'Average_Grade_1',           # 25
    'Average_Positive_Grade',    # 26
    'Average_Negative_Grade',    # 27
    'Max_Cadence',               # 28
    'Average_Cadence',           # 29
    'Max_Heart_Rate_2',          # 30
    'Average_Heart_Rate',        # 31
    'Max_Watts',                 # 32
    'Average_Watts',             # 33
    'Calories',                  # 34
    'Max_Temperature',           # 35
    'Average_Temperature',       # 36
    'Relative_Effort_2',         # 37
    'Total_Work',                # 38
    'Number_of_Runs',            # 39
    'Uphill_Time',               # 40
    'Downhill_Time',             # 41
    'Other_Time',                # 42
    'Perceived_Exertion_1',      # 43
    'Type',                      # 44
    'Start_Time',                # 45
    'Weighted_Average_Power',    # 46
    'Power_Count',               # 47
    'Prefer_Perceived_Exertion', # 48
    'Perceived_Relative_Effort', # 49
    'Commute_2',                 # 50
    'Total_Weight_Lifted',       # 51
    'From_Upload',               # 52
    'Grade_Adjusted_Distance',   # 53
    'Weather_Observation_Time',  # 54
    'Weather_Condition',         # 55
    'Weather_Temperature',       # 56
    'Apparent_Temperature',      # 57
    'Dewpoint',                  # 58
    'Humidity',                  # 59
    'Weather_Pressure',          # 60
    'Wind_Speed',                # 61
    'Wind_Gust',                 # 62
    'Wind_Bearing',              # 63
    'Precipitation_Intensity',   # 64
    'Sunrise_Time',              # 65
    'Sunset_Time',               # 66
    'Moon_Phase',                # 67
    'Bike_1',                    # 68
    'Gear',                      # 69
    'Precipitation_Probability', # 70
    'Precipitation_Type',        # 71
    'Cloud_Cover',               # 72
    'Weather_Visibility',        # 73
    'UV_Index',                  # 74
    'Weather_Ozone',             # 75
    'Jump_Count',                # 76
    'Total_Grit',                # 77
    'Average_Flow',              # 78
    'Flagged',                   # 79,
    # Assuming columns 80 to 93 are additional in English CSVs
    'Additional_Column_80',      # 80
    'Additional_Column_81',      # 81
    'Additional_Column_82',      # 82
    'Additional_Column_83',      # 83
    'Additional_Column_84',      # 84
    'Additional_Column_85',      # 85
    'Additional_Column_86',      # 86
    'Additional_Column_87',      # 87
    'Additional_Column_88',      # 88
    'Additional_Column_89',      # 89
    'Additional_Column_90',      # 90
    'Additional_Column_91',      # 91
    'Additional_Column_92',      # 92
    'Additional_Column_93',      # 93
]

month_map = {
    'gen': 'Jan',
    'feb': 'Feb',
    'mar': 'Mar',
    'apr': 'Apr',
    'mag': 'May',
    'giu': 'Jun',
    'lug': 'Jul',
    'ago': 'Aug',
    'set': 'Sep',
    'ott': 'Oct',
    'nov': 'Nov',
    'dic': 'Dec'
}

# Handle numeric parsing based on language
numeric_columns = [
    'Elapsed_Time_1', 'Distance_1', 'Max_Heart_Rate_1', 'Relative_Effort_1',
    'Moving_Time', 'Distance_2', 'Max_Speed', 'Average_Speed', 'Elevation_Gain',
    'Elevation_Loss', 'Elevation_Low', 'Elevation_High', 'Max_Grade',
    'Average_Grade_1', 'Average_Positive_Grade', 'Average_Negative_Grade',
    'Max_Cadence', 'Average_Cadence', 'Max_Heart_Rate_2', 'Average_Heart_Rate',
    'Max_Watts', 'Average_Watts', 'Calories', 'Max_Temperature',
    'Average_Temperature', 'Total_Work', 'Number_of_Runs', 'Uphill_Time',
    'Downhill_Time', 'Other_Time', 'Perceived_Exertion_1', 'Weighted_Average_Power',
    'Power_Count', 'Precipitation_Intensity', 'Total_Weight_Lifted',
    'Grade_Adjusted_Distance', 'Humidity', 'Weather_Pressure', 'Wind_Speed',
    'Wind_Gust', 'Wind_Bearing', 'Precipitation_Intensity', 'UV_Index',
    'Jump_Count', 'Total_Grit', 'Average_Flow', 'Average_Elapsed_Speed', 'Total_Steps'
]


races = [
    {
        'name': 'Maratona dles Dolomites (Lungo)',
        'start_date': datetime(2024, 7, 7),
        'end_date': datetime(2024, 7, 7),
        'distance_km': 135.8,
        'distance_variance': 0.05,  # 1%
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


# Define categories information
categories_info = {
    'Run': ' 10km |  21km |  42km |  50km/Week | 100km/Week',
    'Ride': ' 100km |  150km |  200km |  300km/week |  600km/Week',
    'Elevation': ' 1000m |  2000m |  Half Everest |  25k/Month | 50k/Month',
    'KCal': ' 1000kCal |  2000kCal |  4000kCal |  12000kCal Week | 24000kCal/Week'
}


timeframes = ['all_time', '7_D', '14_D', '30_D', 'YTD', '365_D']


# Define special occasions for Medals
special_occasions = [
    { 'name': 'New Year Run', 'emoji': '🎉', 'description': 'Participated in New Year Run', 'dates': ['01-01'] },
    { 'name': 'Christmas Run', 'emoji': '🎄', 'description': 'Participated in Christmas Run', 'dates': ['12-25'] },
    { 'name': 'Valentine\'s Day', 'emoji': '❤️', 'description': 'Participated on Valentine\'s Day', 'dates': ['02-14'] },
    { 'name': 'Easter', 'emoji': '🐣', 'description': 'Participated during Easter', 'dates': ['04-04'] },  # Adjust as needed
    { 'name': 'Halloween', 'emoji': '🎃', 'description': 'Participated during Halloween', 'dates': ['10-31'] },
    { 'name': 'Thanksgiving', 'emoji': '🦃', 'description': 'Participated during Thanksgiving', 'dates': ['11-25'] },  # Adjust date as needed
    { 'name': 'Diwali', 'emoji': '🪔', 'description': 'Participated during Diwali', 'dates': ['11-04'] },  # Adjust date as needed
    { 'name': 'Hanukkah', 'emoji': '🕎', 'description': 'Participated during Hanukkah', 'dates': ['12-18'] },  # Adjust date as needed
    { 'name': 'Chinese New Year', 'emoji': '🐉', 'description': 'Participated during Chinese New Year', 'dates': ['02-01'] },  # Adjust date as needed
    { 'name': 'International Workers\' Day', 'emoji': '✊', 'description': 'Participated on International Workers\' Day', 'dates': ['05-01'] },
]


distance_ride_badges = {
    'thresholds': [100, 150, 200, 300, 600],  # in km or km/week
    'unit': 'km',
    'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
}

# ========== Distance Run Badges ==========
distance_run_badges = {
    'thresholds': [10, 21, 42, 50, 100],  # in km or km/week
    'unit': 'km',
    'emoji_sequence': ['💲', '💰', '🧈', '💎','👑']
}

# ========== Elevation Badges ==========
elevation_thresholds = [1000, 2000, 4424, 10000, 25000]  # in meters (Half Everest ~4424m, 25k/month)
elevation_emojis = ['💲', '💰', '🧈', '👑','💎']  # Distinct emojis for Elevation
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

badge_emoji_mapping = {
        # -------------------- Distance Run Badges --------------------
    '10k run': '💲',
    '21k run': '💰',
    '50k run/week': '🧈',
    '42k run': '💎',
    '100k run/week': '👑',

    # -------------------- Distance Ride Badges --------------------
    '100k ride': '💲',
    '150k ride': '💰',
    '200k ride': '🧈',
    '300k ride/week': '💎',
    '600k ride/week': '👑',

    # -------------------- Elevation Badges --------------------
    '1000m elevation': '💲',
    '2000m elevation': '💰',
    'half everest': '🧈',
    'Everest/Week': '💎',
    '25k elevation/month': '👑',

    # -------------------- KCal Badges --------------------
    '1000kcal activity': '💲',
    '2000kcal activity': '💰',
    '4000kcal activity': '🧈',
    '12000kcal week': '💎',
    '24000kcal week': '👑',

    # -------------------- Other Achievements --------------------
    'everesting ascent': '💎',
    '2000m ascent': '🧈',
    'half everesting': '💰',
    '2000 km month': '💰',
    '10,000 km year': '🧈',
    '100,000 elevation year': '💎',
    '150,000 elevation year': '👑',
    '200,000 elevation year': '👑',
    # Achievements
    'Run 10 km': '💲',
    'Run 21 km': '💰',
    'Run 42 km': '🧈',
    'Run 50 km/week': '💎',
    'Run 100 km/week': '👑',
    'Ride 100 km': '💲',
    'Ride 150 km': '💰',
    'Ride 200 km': '🧈',
    'Ride 300 km/week': '💎',
    'Ride 600 km/week': '👑',
    '1000m Elevation': '💲',
    '2000m Elevation': '💰',
    'Half Everest': '🧈',
    '25k Elevation/Month': '💎',
    '1000kCal Activity': '💲',
    '2000kCal Activity': '💰',
    '4000kCal Activity': '🧈',
    '12000kCal Week': '💎',
    '24000kCal Week': '👑',
    # Medals
    'New Year Run': '🎉',
    'Christmas Run': '🎄',
    "Valentine's Day": '❤️',
    'Easter': '🐣',
    'Halloween': '🎃',
    'Thanksgiving': '🦃',
    'Diwali': '🪔',
    'Hanukkah': '🕎',
    'Chinese New Year': '🐉',
    "International Workers' Day": '✊',
    '20 km Challenge': '🏅',
    'Steep Climber': '🧗‍♀️',
    'Coppa Coppi Protector': '🥩',
    # Prestige Levels
    'Prestige 2': '⭐',
    'Prestige 3': '⭐',
    'Prestige 4': '⭐',
    'Prestige 100': '⭐',
    # Add more mappings as needed
}
