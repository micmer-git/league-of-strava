require('dotenv').config(); // Load environment variables

const express = require('express');
const axios = require('axios'); // Consistent use of axios
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(cookieParser());
app.use(express.static('public')); // Serve static files from 'public' directory

const PORT = process.env.PORT || 3000;

// *** New: Define Segment Tracking Variables Directly in the Script ***
const TRACKED_SEGMENT_ID = 14418673; // Replace with your segment ID
const TRACKED_SEGMENT_NAME = 'Selvino'; // Replace with your segment name

// Helper function to pause execution (to respect rate limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Routes

// Serve the landing page
app.get('/', (req, res) => {
  console.log('Serving landing page');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Redirect user to Strava's authorization URL
app.get('/auth/strava', (req, res) => {
  console.log('Redirecting to Strava for authentication');
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  console.log(`Authorization URL: ${authUrl}`);
  res.redirect(authUrl);
});

// Step 2: Handle the callback from Strava
app.get('/auth/strava/callback', async (req, res) => {
  const code = req.query.code;
  console.log(`Received Strava callback with code: ${code}`);

  if (!code) {
    console.error('No authorization code found in the callback');
    return res.status(400).send('No authorization code provided.');
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    });

    console.log('Successfully exchanged code for access token');

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    console.log(`Access Token: ${accessToken}`);
    console.log(`Refresh Token: ${refreshToken}`);

    // Set cookies with secure flag in production
    res.cookie('strava_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.cookie('strava_refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    console.log('Access token and refresh token stored in cookies');

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed');
  }
});

// Serve the dashboard page
app.get('/dashboard', (req, res) => {
  console.log('Serving dashboard page');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API endpoint to fetch all Strava activities and segment completions
app.get('/api/strava-data', async (req, res) => {
  console.log('Received request for all Strava data');
  const accessToken = req.cookies.strava_token;

  if (!accessToken) {
    console.warn('No access token found in cookies');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch athlete profile
    console.log('Fetching athlete profile from Strava');
    const athleteResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('Fetched athlete profile');

    // Function to fetch up to 400 activities
    const fetchAllActivities = async () => {
      const per_page = 200;
      const maxActivities = 400; // Adjusted to 400 as per original code
      const maxPages = Math.ceil(maxActivities / per_page);
      let allActivities = [];

      for (let page = 1; page <= maxPages; page++) {
        console.log(`Fetching activities - Page: ${page}, Per Page: ${per_page}`);
        const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { per_page, page },
        });

        const activities = activitiesResponse.data;
        console.log(`Fetched ${activities.length} activities from page ${page}`);
        allActivities = allActivities.concat(activities);

        // If we received fewer activities than per_page, no more pages are available
        if (activities.length < per_page) {
          break;
        }

        // Pause to respect rate limits (optional but recommended)
        await sleep(1000); // Sleep for 1 second between requests
      }

      // Trim the array to the maximum number of activities (400)
      if (allActivities.length > maxActivities) {
        allActivities = allActivities.slice(0, maxActivities);
      }

      return allActivities;
    };

    const allActivities = await fetchAllActivities();
    console.log(`Total activities fetched: ${allActivities.length}`);

    // Calculate totals
    const totals = calculateTotals(allActivities);

    // *** New: Fetch segment details to get athlete-specific stats ***
    console.log(`Fetching details for segment ID: ${TRACKED_SEGMENT_ID}`);
    let segmentCompletions = 0;
    let segmentName = TRACKED_SEGMENT_NAME;

    try {
      const segmentResponse = await axios.get(`https://www.strava.com/api/v3/segments/${TRACKED_SEGMENT_ID}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('Fetched segment details');

      const segmentData = segmentResponse.data;

      if (segmentData.athlete_segment_stats) {
        segmentCompletions = segmentData.athlete_segment_stats.effort_count || 0;
        console.log(`Total segment completions: ${segmentCompletions}`);
      } else {
        console.warn('athlete_segment_stats not available for this segment.');
      }
    } catch (segmentError) {
      console.error(`Error fetching segment ID ${TRACKED_SEGMENT_ID}:`, segmentError.response ? segmentError.response.data : segmentError.message);
      // Decide whether to fail or continue without segment data
      // Here, we'll continue and set segmentCompletions to 0
      segmentCompletions = 0;
      segmentName = 'Unknown Segment';
    }

    res.json({
      athlete: athleteResponse.data,
      activities: allActivities,
      totals: totals,
      segmentCompletions: segmentCompletions,
      segmentName: segmentName,
      hasMore: false, // Since we've fetched all
    });
  } catch (error) {
    console.error('Error fetching Strava data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Function to calculate totals from activities
function calculateTotals(activities) {
  let totals = {
    hours: 0,
    distance: 0, // in meters
    elevation: 0, // in meters
    calories: 0, // in kilojoules or as per Strava's data
    activities: activities.length,
  };

  activities.forEach(activity => {
    totals.hours += activity.moving_time / 3600;
    totals.distance += activity.distance;
    totals.elevation += activity.total_elevation_gain;
    totals.calories += activity.kilojoules || 0; // Strava may provide 'kilojoules' instead of 'calories'
  });

  return totals;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
