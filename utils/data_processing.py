import pandas as pd
from dateutil import parser
from datetime import timedelta
import logging
from .helpers import convert_to_native

def process_dataframe(df):
    """Validate and process the uploaded CSV dataframe with support for Italian and English headers, handle comma decimals, and conditional distance units."""
    logging.info("Starting CSV processing.")

    # Define column name lists for Italian and English CSVs
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
        'Flagged',                   # 79
        # Add more column names up to 94 as per English CSV structure
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


    # Define expected column counts
    expected_num_columns_italian = 80
    expected_num_columns_english = 94

    # Get actual number of columns and first 3 headers
    actual_num_columns = df.shape[1]
    headers = df.columns.tolist()
    first_3_headers = headers[:3]
    logging.info(f"Number of columns in CSV: {actual_num_columns}")
    logging.info(f"First 3 headers: {first_3_headers}")

    # Define known header patterns
    italian_headers_sample = ['ID attività', "Data dell’attività", 'Nome attività']
    english_headers_sample = ['Activity ID', 'Activity Date', 'Activity Name']

    # Detect language
    if first_3_headers == italian_headers_sample:
        language = 'Italian'
        expected_num_columns = expected_num_columns_italian
        column_names = italian_column_names
        logging.info("Detected Italian CSV.")
    elif first_3_headers == english_headers_sample:
        language = 'English'
        expected_num_columns = expected_num_columns_english
        column_names = english_column_names
        logging.info("Detected English CSV.")
    else:
        error_msg = "Unsupported header language. Only Italian and English headers are supported."
        logging.error(error_msg)
        return None, error_msg

    # Validate column count
    if actual_num_columns < expected_num_columns:
        error_msg = f'Expected at least {expected_num_columns} columns for {language} CSV, found {actual_num_columns}'
        logging.error(error_msg)
        return None, error_msg

    # Assign column names
    df = df.iloc[:, :expected_num_columns]  # Truncate to expected columns
    df.columns = column_names
    logging.info(f"Assigned column names for {language} CSV.")

    # Log the new column names for verification
    logging.info(f"New column names: {df.columns.tolist()}")

    # Define numeric columns (common in both languages)
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


    # Handle numeric parsing based on language
    if language == 'Italian':
        # Replace comma with dot in numeric columns for Italian CSV
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.').astype(float).fillna(0)
        logging.info("Replaced commas with dots in numeric columns for Italian CSV.")
    else:
        # For English CSVs, convert numeric columns directly
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Converted numeric columns for English CSV.")

    # Parse 'Activity_Date'
    def parse_date(date_str):
        try:
            # First conversion attempt with inferred format
            return pd.to_datetime(date_str, errors='raise', dayfirst=False, infer_datetime_format=True)
        except:
            try:
                # Second conversion attempt with dayfirst=True
                return pd.to_datetime(date_str, errors='raise', dayfirst=True, infer_datetime_format=True)
            except:
                try:
                    # As a last resort, use dateutil.parser
                    return parser.parse(date_str, dayfirst=False, fuzzy=True)
                except:
                    return pd.NaT

    df['Activity_Date'] = df['Activity_Date'].astype(str).apply(parse_date)

    # Drop rows with invalid 'Activity_Date'
    num_invalid_dates = df['Activity_Date'].isna().sum()
    if num_invalid_dates > 0:
        logging.warning(f"Number of invalid 'Activity_Date' entries: {num_invalid_dates}")
        df = df.dropna(subset=['Activity_Date'])

    # Additional validation
    if df.empty:
        error_msg = "The processed dataframe is empty after parsing."
        logging.error(error_msg)
        return None, error_msg

    # Check if 'Activity_ID' exists
    if 'Activity_ID' not in df.columns:
        error_msg = "'Activity_ID' column is missing after processing."
        logging.error(error_msg)
        return None, error_msg

    # Drop duplicates
    if df['Activity_ID'].duplicated().any():
        logging.warning("Duplicate Activity IDs found. Dropping duplicates.")
        df = df.drop_duplicates(subset=['Activity_ID'])

    # Handle 'Distance' based on 'Activity_Type'
    def assign_distance_km(row):
        activity_type = row['Activity_Type']
        if language == 'Italian':
            if isinstance(activity_type, str) and activity_type.lower() == 'nuoto':  # 'nuoto' means 'swimming'
                return row.get('Distance_1', 0) / 1000  # Convert meters to kilometers
            else:
                return row.get('Distance_1', 0)  # Already in kilometers
        else:  # English
            if isinstance(activity_type, str) and activity_type.lower() == 'swimming':
                return row.get('Distance_1', 0) / 1000  # Convert meters to kilometers
            else:
                return row.get('Distance_1', 0)  # Already in kilometers

    df['Distance_km'] = df.apply(assign_distance_km, axis=1)
    logging.info("Assigned 'Distance_km' based on 'Activity_Type'.")

    # Optionally, drop original Distance columns to avoid confusion
    df.drop(['Distance_1', 'Distance_2'], axis=1, inplace=True, errors='ignore')

    logging.info("CSV processing completed successfully.")
    return df, None
