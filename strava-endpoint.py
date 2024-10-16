import requests
from urllib.parse import urlparse
import os
import time

def extract_activity_id(activity_url):
    path = urlparse(activity_url).path
    parts = path.strip('/').split('/')
    if len(parts) >= 2 and parts[0] == 'activities':
        return parts[1]
    else:
        raise ValueError("Invalid Strava activity URL")

def get_activity_info(activity_id, access_token):
    url = f"https://www.strava.com/api/v3/activities/{activity_id}"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    print(f"Fetching Activity ID: {activity_id}")
    response = requests.get(url, headers=headers)
    print(f"Response Status Code: {response.status_code}")
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 401:
        raise Exception("Unauthorized: Invalid or expired access token.")
    elif response.status_code == 403:
        raise Exception("Forbidden: You don't have access to this activity.")
    elif response.status_code == 404:
        raise Exception("Resource Not Found: The activity does not exist or is not accessible.")
    elif response.status_code == 429:
        raise Exception("Rate limit exceeded. Please try again later.")
    else:
        print(f"Response Body: {response.text}")
        raise Exception(f"Error fetching activity: {response.status_code} - {response.text}")

def check_token_validity(expires_at):
    current_time = int(time.time())
    if current_time >= expires_at:
        print("Access token has expired.")
        return False
    else:
        print(f"Access token is valid for another {expires_at - current_time} seconds.")
        return True

# Example Usage
if __name__ == "__main__":
    activity_url = "https://www.strava.com/activities/12656703193"
    access_token = "cc2686d47ea67cadca966fac999a1afa0f25f310"  # Replace with your actual access token

    try:
        # Optionally, if you have the 'expires_at' value, you can check token validity
        # expires_at = 1728973283  # Replace with your actual expires_at timestamp
        # if not check_token_validity(expires_at):
        #     # Refresh your token here
        #     pass

        activity_id = extract_activity_id(activity_url)
        activity_info = get_activity_info(activity_id, access_token)
        print("Activity Information:")
        print(activity_info)
    except Exception as e:
        print(f"An error occurred: {e}")
