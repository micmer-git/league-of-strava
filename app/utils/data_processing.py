# app/utils/data_processing.py

import pandas as pd
import re
import logging
from datetime import datetime
from dateutil import parser
from app.utils.helpers import replace_italian_month
from app.utils.helpers import parse_date
from app.utils.helpers import convert_to_native

def process_dataframe(df):
    """
    Validate and process the uploaded CSV dataframe with support for Italian and English headers,
    handle comma decimals, replace 'Corsa' and 'Nuotata' with English equivalents,
    and ensure 'Moving_Time' is correctly parsed.

    Parameters:
    - df: pandas DataFrame

    Returns:
    - tuple: (processed DataFrame, error message or None)
    """
    logging.info("Starting CSV processing.")

    # Define column name lists for Italian and English CSVs
    italian_column_names = [
        # [List of Italian column names...]
        # Add the actual column names here as per your original script
    ]

    english_column_names = [
        # [List of English column names...]
        # Add the actual column names here as per your original script
    ]

    # Define expected column counts
    expected_num_columns_italian = 80
    expected_num_columns_english = 94

    # Define known header samples for language detection
    italian_headers_sample = ['ID attività', "Data dell'attività", 'Nome attività']
    english_headers_sample = ['Activity ID', 'Activity Date', 'Activity Name']

    # Define month mapping for Italian to English
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

    # Compile a regex pattern for Italian month abbreviations
    month_pattern = re.compile(r'\b(' + '|'.join(month_map.keys()) + r')\b', re.IGNORECASE)

    # Detect language based on headers
    first_3_headers = df.columns.tolist()[:3]
    logging.info(f"First 3 headers: {first_3_headers}")

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
    actual_num_columns = df.shape[1]
    logging.info(f"Number of columns in CSV: {actual_num_columns}")
    if actual_num_columns < expected_num_columns:
        error_msg = f'Expected at least {expected_num_columns} columns for {language} CSV, found {actual_num_columns}'
        logging.error(error_msg)
        return None, error_msg

    # Assign column names
    df = df.iloc[:, :expected_num_columns]  # Truncate to expected columns
    df.columns = column_names
    logging.info(f"Assigned column names for {language} CSV.")

    # Validate presence of required columns
    required_columns = [
        'Activity_ID', 'Activity_Name', 'Activity_Date', 'Activity_Type',
        'Distance_1', 'Moving_Time', 'Elevation_Gain', 'Calories',
        'Average_Heart_Rate'
    ]
    for col in required_columns:
        if col not in df.columns:
            error_msg = f"Missing required column: {col}"
            logging.error(error_msg)
            return None, error_msg

    # Replace 'Corsa' with 'Run' and 'Nuotata' with 'Swim' across the entire DataFrame
    replacement_dict = {
        'Corsa': 'Run',
        'Nuotata': 'Swim',
        'Ciclismo': 'Ride'
    }

    # Define a regex pattern to match exact words (case-insensitive)
    pattern = re.compile(r'\b(' + '|'.join(re.escape(key) for key in replacement_dict.keys()) + r')\b', re.IGNORECASE)

    def replace_activity_types(x):
        if isinstance(x, str):
            # Function to replace matched word with its English equivalent
            match = pattern.search(x)
            if match:
                word = match.group(0)
                return pattern.sub(replacement_dict[word.capitalize()], x)
        return x

    # Apply the replacement across the entire DataFrame
    df = df.applymap(replace_activity_types)
    logging.info("Replaced 'Corsa' with 'Run' and 'Nuotata' with 'Swim' across the DataFrame.")

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

    if language == 'Italian':
        # Replace comma with dot in numeric columns for Italian CSV
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Replaced commas with dots in numeric columns for Italian CSV.")
    else:
        # For English CSVs, convert numeric columns directly
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        logging.info("Converted numeric columns for English CSV.")

    # Parse 'Activity_Date'
    df['Activity_Date'] = df['Activity_Date'].astype(str).apply(
        lambda x: parse_date(x, month_map, month_pattern)
    )
    num_invalid_dates = df['Activity_Date'].isna().sum()
    if num_invalid_dates > 0:
        logging.warning(f"Number of invalid 'Activity_Date' entries: {num_invalid_dates}")
        df = df.dropna(subset=['Activity_Date'])
        logging.info("Dropped rows with invalid 'Activity_Date'.")

    # Check if DataFrame is empty after dropping invalid dates
    if df.empty:
        error_msg = "The processed dataframe is empty after parsing 'Activity_Date'."
        logging.error(error_msg)
        return None, error_msg

    # Replace 'Corsa' and 'Nuotata' in 'Activity_Type' column explicitly
    df['Activity_Type'] = df['Activity_Type'].replace(replacement_dict, regex=False)
    logging.info("Explicitly replaced 'Corsa' and 'Nuotata' in 'Activity_Type' column.")

    # Ensure 'Moving_Time' is integer and non-null
    df['Moving_Time'] = pd.to_numeric(df['Moving_Time'], errors='coerce').fillna(0).astype(int)
    logging.info("Processed 'Moving_Time' to ensure it's integer and non-null.")

    # Assign 'Distance_km' based on 'Activity_Type'
    def assign_distance_km(row):
        activity_type = row.get('Activity_Type', '')
        distance = row.get('Distance_1', 0)

        if pd.isnull(distance):
            distance = 0

        if activity_type.lower() in ['swim']:
            return distance / 1000  # Convert meters to kilometers
        else:
            return distance  # Already in kilometers

    df['Distance_km'] = df.apply(assign_distance_km, axis=1)
    logging.info("Assigned 'Distance_km' based on 'Activity_Type'.")

    # Final Validation: Ensure no required fields have NaN or inappropriate values
    for col in required_columns:
        if df[col].isnull().any():
            logging.warning(f"Column '{col}' contains NaN values. These will be filled with default values.")
            if df[col].dtype == 'object':
                df[col] = df[col].fillna('')
            elif df[col].dtype in ['int64', 'float64']:
                df[col] = df[col].fillna(0)

    logging.info("CSV processing completed successfully.")
    return df, None
