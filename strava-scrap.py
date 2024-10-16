from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time

def fetch_activity_with_selenium(activity_url):
    # Path to your ChromeDriver
    service = Service('path/to/chromedriver')
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')  # Run in headless mode
    driver = webdriver.Chrome(service=service, options=options)

    try:
        driver.get(activity_url)
        time.sleep(5)  # Wait for the page to load

        # Example: Extract activity name
        activity_name = driver.find_element(By.CLASS_NAME, 'activity-name').text.strip()

        return {
            'name': activity_name,
            # Extract other details similarly
        }
    finally:
        driver.quit()

# Example Usage
if __name__ == "__main__":
    activity_url = "https://www.strava.com/activities/11438845687"

    try:
        details = fetch_activity_with_selenium(activity_url)
        print("Activity Details:")
        print(details)
    except Exception as e:
        print(f"An error occurred: {e}")
