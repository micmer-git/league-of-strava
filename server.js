// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(cookieParser());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Serve the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Redirect to Strava for authentication
app.get('/auth/strava', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
});

// Handle Strava callback
app.get('/auth/strava/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    res.cookie('strava_token', response.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.cookie('strava_refresh_token', response.data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth Error:', error.response ? error.response.data : error.message);
    res.status(500).send('Authentication failed');
  }
});

// Serve the dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API to fetch Strava data
app.get('/api/strava-data', async (req, res) => {
  const accessToken = req.cookies.strava_token;
  if (!accessToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const athlete = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let page = 1;
    const per_page = 200;
    let activities = [];

    while (true) {
      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page, page },
      });
      activities = activities.concat(response.data);
      if (response.data.length < per_page) break;
      page++;
    }

    const totals = {
      hours: activities.reduce((sum, act) => sum + act.moving_time, 0) / 3600,
      distance: activities.reduce((sum, act) => sum + act.distance, 0),
      elevation: activities.reduce((sum, act) => sum + act.total_elevation_gain, 0),
      calories: activities.reduce((sum, act) => sum + (act.kilojoules || 0), 0),
    };

    res.json({ athlete: athlete.data, activities, totals });
  } catch (error) {
    console.error('API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
