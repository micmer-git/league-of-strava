// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(cookieParser());
app.use(express.static('public')); // Serve static files from 'public' directory

const PORT = process.env.PORT || 3000;

// --------- Helper Functions ---------

// Function to fetch all Strava activities with pagination
async function fetchAllStravaActivities(accessToken) {
    let page = 1;
    const per_page = 200;
    let allActivities = [];
    let hasMore = true;

    while (hasMore) {
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page, page },
        });

        const activities = response.data;
        allActivities = allActivities.concat(activities);
        hasMore = activities.length === per_page;
        page += 1;
    }

    return allActivities;
}

// Function to filter activities based on timeframe
function filterActivitiesByTimeframe(activities, timeframe) {
    const now = new Date();
    let startDate;

    switch (timeframe) {
        case '7':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case '14':
            startDate = new Date(now.setDate(now.getDate() - 14));
            break;
        case '30':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'ytd':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case '365':
            startDate = new Date(now.setDate(now.getDate() - 365));
            break;
        default:
            startDate = new Date(now.setDate(now.getDate() - 7));
    }

    return activities.filter(activity => new Date(activity.start_date) >= startDate);
}

// Function to compute wallet stats
function computeWalletStats(activities) {
    // Initialize stats
    const stats = {
        distance_ride_badges: 0,
        distance_run_badges: 0,
        elevation_gain: 0,
        calories_burned: 0,
    };

    activities.forEach(activity => {
        if (activity.type === 'Ride') {
            stats.distance_ride_badges += activity.distance / 1000; // Convert meters to km
        } else if (activity.type === 'Run') {
            stats.distance_run_badges += activity.distance / 1000; // Convert meters to km
        }

        stats.elevation_gain += activity.total_elevation_gain;
        stats.calories_burned += activity.kilojoules ? activity.kilojoules * 0.239006 : 0; // Convert kJ to kcal
    });

    return stats;
}

// Function to compute achievements
function computeAchievements(activities) {
    // Climbing King: Total Elevation Gain over 1000m
    const totalElevationGain = activities.reduce((sum, act) => sum + act.total_elevation_gain, 0);
    const climbingKingCount = Math.floor(totalElevationGain / 1000);

    // Longest Streak: Consecutive Days with Activities
    const uniqueDates = [...new Set(activities.map(act => act.start_date.split('T')[0]))].sort();
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currentDate = new Date(uniqueDates[i]);
        const diffTime = currentDate - prevDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentStreak += 1;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
        } else {
            currentStreak = 1;
        }
    }

    // Define Achievements
    const achievements = [
        {
            name: 'Climbing King',
            emoji: '🧗‍♂️',
            description: 'Total Elevation Gain over 1000m',
            count: climbingKingCount,
        },
        {
            name: 'Longest Streak',
            emoji: '🔥',
            description: 'Longest consecutive days with activities',
            count: maxStreak,
        },
        // Add more achievements as needed
    ];

    return achievements;
}

// Function to compute rank based on total points
const rankConfig = [
    { name: 'Bronze 3', emoji: '🥉', minPoints: 0 },
    { name: 'Bronze 2', emoji: '🥉', minPoints: 50 },
    { name: 'Bronze 1', emoji: '🥉', minPoints: 100 },
    { name: 'Silver 3', emoji: '🥈', minPoints: 150 },
    { name: 'Silver 2', emoji: '🥈', minPoints: 200 },
    { name: 'Silver 1', emoji: '🥈', minPoints: 250 },
    { name: 'Gold 3', emoji: '🥇', minPoints: 300 },
    { name: 'Gold 2', emoji: '🥇', minPoints: 350 },
    { name: 'Gold 1', emoji: '🥇', minPoints: 400 },
    { name: 'Platinum 3', emoji: '🏆', minPoints: 450 },
    { name: 'Platinum 2', emoji: '🏆', minPoints: 500 },
    { name: 'Platinum 1', emoji: '🏆', minPoints: 550 },
    { name: 'Diamond 3', emoji: '💎', minPoints: 600 },
    { name: 'Diamond 2', emoji: '💎', minPoints: 650 },
    { name: 'Diamond 1', emoji: '💎', minPoints: 700 },
    { name: 'Master 3', emoji: '🔥', minPoints: 750 },
    { name: 'Master 2', emoji: '🔥', minPoints: 800 },
    { name: 'Master 1', emoji: '🔥', minPoints: 850 },
    { name: 'Grandmaster 3', emoji: '🚀', minPoints: 900 },
    { name: 'Grandmaster 2', emoji: '🚀', minPoints: 950 },
    { name: 'Grandmaster 1', emoji: '🚀', minPoints: 1000 },
    { name: 'Challenger', emoji: '🌟', minPoints: 1050 },
];

function calculateRank(totalPoints) {
    let currentRank = rankConfig[0];
    let nextRank = rankConfig[1];

    for (let i = 0; i < rankConfig.length; i++) {
        if (totalPoints >= rankConfig[i].minPoints) {
            currentRank = rankConfig[i];
            nextRank = rankConfig[i + 1] || rankConfig[i]; // If at top rank
        } else {
            break;
        }
    }

    // Calculate progress percentage
    const pointsIntoCurrentRank = totalPoints - currentRank.minPoints;
    const pointsBetweenRanks = nextRank.minPoints - currentRank.minPoints;
    const progressPercent = pointsBetweenRanks === 0 ? 100 : (pointsIntoCurrentRank / pointsBetweenRanks) * 100;

    return {
        currentRank,
        nextRank,
        progressPercent: Math.min(progressPercent, 100), // Ensure it doesn't exceed 100%
        pointsIntoCurrentRank: Math.round(pointsIntoCurrentRank),
        pointsBetweenRanks: Math.round(pointsBetweenRanks),
    };
}

// --------- Routes ---------

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
        // Exchange authorization code for access token
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

        // Store access token and refresh token in secure HTTP-only cookies
        res.cookie('strava_token', accessToken, { httpOnly: true, secure: false }); // Set 'secure: true' in production
        res.cookie('strava_refresh_token', refreshToken, { httpOnly: true, secure: false });

        console.log('Access token and refresh token stored in cookies');

        // Redirect to the dashboard page
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

// --------- API Endpoints ---------

// API endpoint to fetch Strava data
app.get('/api/strava-data', async (req, res) => {
    console.log('Received request for Strava data');
    const accessToken = req.cookies.strava_token;
    const { page = 1, per_page = 200 } = req.query; // Default to page 1, 200 per page

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

        // Fetch activities based on pagination
        console.log(`Fetching activities from Strava - Page: ${page}, Per Page: ${per_page}`);
        const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: per_page, page: page },
        });
        const fetchedActivities = activitiesResponse.data;
        console.log(`Fetched ${fetchedActivities.length} activities from page ${page}`);

        // Calculate totals for the fetched activities
        const totals = calculateTotals(fetchedActivities);
        console.log('Calculated totals for fetched activities:', totals);

        // Determine if more activities are available
        const hasMore = fetchedActivities.length === parseInt(per_page, 10);

        res.json({
            athlete: athleteResponse.data,
            activities: fetchedActivities,
            totals: totals,
            hasMore: hasMore,
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

// API endpoint for Wallet data
app.get('/api/wallet', async (req, res) => {
    const accessToken = req.cookies.strava_token;
    const timeframe = req.query.timeframe || '7'; // Default to last 7 days

    if (!accessToken) {
        console.warn('No access token found in cookies');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Fetch all activities
        const activities = await fetchAllStravaActivities(accessToken);

        // Filter activities based on timeframe
        const filteredActivities = filterActivitiesByTimeframe(activities, timeframe);

        // Compute wallet stats
        const walletStats = computeWalletStats(filteredActivities);

        // Convert stats to categories with thresholds and emojis
        const distanceRideBadges = {
            thresholds: [100, 150, 200, 300, 600], // in km
            unit: 'km',
            emoji_sequence: ['💲', '💰', '🧈', '💎', '👑']
        };

        const distanceRunBadges = {
            thresholds: [10, 21, 42, 50, 100], // in km
            unit: 'km',
            emoji_sequence: ['💲', '💰', '🧈', '💎', '👑']
        };

        const categories = {
            distance_ride_badges: {
                category: 'Distance Ride',
                total: walletStats.distance_ride_badges,
                weekly_gain: walletStats.distance_ride_badges, // Adjust as needed
                badge: getBadge(walletStats.distance_ride_badges, distanceRideBadges)
            },
            distance_run_badges: {
                category: 'Distance Run',
                total: walletStats.distance_run_badges,
                weekly_gain: walletStats.distance_run_badges, // Adjust as needed
                badge: getBadge(walletStats.distance_run_badges, distanceRunBadges)
            },
            elevation_gain: {
                category: 'Elevation Gain',
                total: walletStats.elevation_gain, // in meters
                weekly_gain: walletStats.elevation_gain, // Adjust as needed
                badge: getBadge(walletStats.elevation_gain, {
                    thresholds: [1000, 1500, 2000, 3000, 6000],
                    unit: 'm',
                    emoji_sequence: ['💲', '💰', '🧈', '💎', '👑']
                })
            },
            calories_burned: {
                category: 'Calories Burned',
                total: walletStats.calories_burned, // in kcal
                weekly_gain: walletStats.calories_burned, // Adjust as needed
                badge: getBadge(walletStats.calories_burned, {
                    thresholds: [5000, 10000, 15000, 20000, 30000],
                    unit: 'kcal',
                    emoji_sequence: ['💲', '💰', '🧈', '💎', '👑']
                })
            }
            // Add more categories as needed
        };

        res.json(categories);
    } catch (error) {
        console.error('Error fetching wallet data:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch wallet data' });
    }
});

// Helper function to determine badge based on thresholds
function getBadge(value, config) {
    let badge = '';
    for (let i = config.thresholds.length - 1; i >= 0; i--) {
        if (value >= config.thresholds[i]) {
            badge = config.emoji_sequence[i];
            break;
        }
    }
    return badge || '';
}

// API endpoint for Achievements
app.get('/api/achievements', async (req, res) => {
    const accessToken = req.cookies.strava_token;

    if (!accessToken) {
        console.warn('No access token found in cookies');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Fetch all activities
        const activities = await fetchAllStravaActivities(accessToken);

        // Compute achievements
        const achievements = computeAchievements(activities);

        res.json({ achievements });
    } catch (error) {
        console.error('Error fetching achievements:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// API endpoint for Races
app.get('/api/races', (req, res) => {
    // Example: Predefined Races
    const races = [
        {
            name: 'Summer Sprint',
            date: '2024-07-15',
            status: 'Ongoing',
        },
        {
            name: 'Autumn Marathon',
            date: '2024-09-10',
            status: 'Upcoming',
        },
        {
            name: 'Winter Challenge',
            date: '2023-12-01',
            status: 'Completed',
        },
        // Add more races as needed
    ];

    res.json({ races });
});

// --------- Start Server ---------
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
