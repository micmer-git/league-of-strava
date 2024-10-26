// public/script.js

document.addEventListener('DOMContentLoaded', function() {
    // --------- Tab Switching ---------
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --------- Timeframe Buttons ---------
    const timeframeButtons = document.querySelectorAll('.timeframe-buttons button');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Fetch and display data based on timeframe
            const timeframe = button.dataset.timeframe;
            updateWalletTable(timeframe);
        });
    });

    // --------- Initial Data Load ---------
    updateWalletTable('7'); // Default to last 7 days
    displayAchievements();
    displayRaces();
    displayRank();

    // --------- Fetch and Display Wallet Data ---------
    function updateWalletTable(timeframe) {
        fetch(`/api/wallet?timeframe=${timeframe}`)
            .then(response => response.json())
            .then(data => {
                populateWalletTable(data);
            })
            .catch(error => console.error('Error fetching wallet data:', error));
    }

    function populateWalletTable(data) {
        const walletBody = document.getElementById('wallet-body');
        walletBody.innerHTML = ''; // Clear existing data

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const item = data[key];
                const row = document.createElement('tr');

                const categoryCell = document.createElement('td');
                categoryCell.textContent = `${item.category} ${item.badge}`;
                row.appendChild(categoryCell);

                const totalCell = document.createElement('td');
                totalCell.textContent = Math.round(item.total);
                row.appendChild(totalCell);

                const weeklyGainCell = document.createElement('td');
                weeklyGainCell.textContent = '+' + Math.round(item.weekly_gain);
                row.appendChild(weeklyGainCell);

                walletBody.appendChild(row);
            }
        }
    }

    // --------- Fetch and Display Achievements ---------
    function displayAchievements() {
        const achievementsGrid = document.getElementById('achievements-grid');

        fetch('/api/achievements')
            .then(response => response.json())
            .then(data => {
                const achievements = data.achievements;
                achievementsGrid.innerHTML = ''; // Clear existing data

                achievements.forEach(achievement => {
                    const card = document.createElement('div');
                    card.classList.add('achievement-card');

                    const emoji = document.createElement('div');
                    emoji.classList.add('emoji');
                    emoji.textContent = achievement.emoji;
                    card.appendChild(emoji);

                    const name = document.createElement('div');
                    name.classList.add('name');
                    name.textContent = achievement.name;
                    card.appendChild(name);

                    const description = document.createElement('div');
                    description.classList.add('description');
                    description.textContent = achievement.description;
                    card.appendChild(description);

                    const count = document.createElement('div');
                    count.classList.add('count');
                    count.textContent = achievement.count;
                    card.appendChild(count);

                    achievementsGrid.appendChild(card);
                });
            })
            .catch(error => console.error('Error fetching achievements:', error));
    }

    // --------- Fetch and Display Races ---------
    function displayRaces() {
        const racesList = document.getElementById('races-list');

        fetch('/api/races')
            .then(response => response.json())
            .then(data => {
                const races = data.races;
                racesList.innerHTML = ''; // Clear existing data

                races.forEach(race => {
                    const raceItem = document.createElement('li');
                    raceItem.classList.add('race-item');

                    const raceName = document.createElement('span');
                    raceName.classList.add('race-name');
                    raceName.textContent = race.name;
                    raceItem.appendChild(raceName);

                    const raceStatus = document.createElement('span');
                    raceStatus.classList.add('race-status');
                    raceStatus.textContent = race.status;
                    raceItem.appendChild(raceStatus);

                    racesList.appendChild(raceItem);
                });
            })
            .catch(error => console.error('Error fetching races:', error));
    }

    // --------- Fetch and Display Rank ---------
    function displayRank() {
        fetch('/api/strava-data') // Assuming totalPoints is derived from strava-data
            .then(response => response.json())
            .then(data => {
                const totalPoints = Math.round(data.totals.hours); // Example: Using total hours as points

                const rankInfo = calculateRank(totalPoints);

                // Update Rank Section
                const currentRankElem = document.getElementById('current-rank');
                const rankEmojiElem = document.getElementById('rank-emoji');
                const progressBarElem = document.getElementById('progress-bar');
                const currentRankLabel = document.getElementById('current-rank-label');
                const nextRankLabel = document.getElementById('next-rank-label');
                const currentPointsElem = document.getElementById('current-points');
                const nextRankPointsElem = document.getElementById('next-rank-points');

                if (currentRankElem && rankEmojiElem && progressBarElem && currentRankLabel && nextRankLabel && currentPointsElem && nextRankPointsElem) {
                    currentRankElem.textContent = rankInfo.currentRank.name;
                    rankEmojiElem.textContent = rankInfo.currentRank.emoji;
                    progressBarElem.style.width = `${rankInfo.progressPercent}%`;
                    currentRankLabel.textContent = rankInfo.currentRank.name;
                    nextRankLabel.textContent = rankInfo.nextRank.name;
                    currentPointsElem.textContent = rankInfo.pointsIntoCurrentRank;
                    nextRankPointsElem.textContent = rankInfo.nextRank.minPoints;
                }

                // Optionally, populate a rank tooltip or list
                const rankListElement = document.getElementById('rank-list');
                if (rankListElement) {
                    rankListElement.innerHTML = '';
                    rankConfig.forEach(rank => {
                        const li = document.createElement('li');
                        li.textContent = `${rank.name} (${rank.minPoints} pts)`;
                        rankListElement.appendChild(li);
                    });
                }
            })
            .catch(error => console.error('Error fetching rank data:', error));
    }

    // --------- Rank Configuration ---------
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

    // --------- Races Display Functionality (Optional) ---------
    // If races have more dynamic data or interactions, implement here
});
