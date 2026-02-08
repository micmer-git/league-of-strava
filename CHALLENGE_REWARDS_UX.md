# Challenge Rewards UI & UX Specifications

## Challenge Progress Visualization

### Dashboard Challenge Widget
Located in the main dashboard header area, the challenge widget displays:
- **Monthly Challenge Card**: Shows current month's challenge with progress bar
- **Completion Status**: Green checkmark for completed, progress percentage for in-progress
- **Reward Preview**: Shows pending coins/medals to be unlocked
- **Quick Action**: "View Details" button opens challenge modal

### Challenge Modal Components
```
Challenge Details Modal
├── Challenge Title & Icon
├── Description & Goals
├── Progress Bar (animated)
├── Days Remaining
├── Rewards Section
│   ├── Coins to Earn: XX
│   ├── Medal to Unlock: 🏆
│   └── Bonus (if early): +XX coins
├── Activity Breakdown
│   ├── Goal: X km / X activities / X m elevation
│   ├── Current: Y km / Y activities / Y m elevation
│   └── Remaining: Z
└── Action Buttons
    ├── "Start/Continue Challenge"
    └── "Share Progress"
```

### Reward Notification System
- **Toast Notification**: Appears when challenge completed
- **Confetti Animation**: Subtle celebration on milestone completion
- **Badge Update**: Medal badge increments in header
- **Leaderboard Update**: Special challenge badge appears next to username

### Monthly Challenge Layout (Dashboard)
```html
<div class="monthly-challenge-card">
  <div class="challenge-header">
    <span class="challenge-icon">🏅</span>
    <span class="challenge-month">February</span>
    <span class="challenge-name">Elevation Focus</span>
  </div>
  <div class="progress-container">
    <div class="progress-bar" style="width: 65%"></div>
  </div>
  <div class="challenge-stats">
    <span>3,000m goal • 1,950m current</span>
  </div>
  <div class="reward-preview">
    <span class="coin-reward">+100 💰</span>
    <span class="medal-reward">🏆</span>
  </div>
</div>
```

### Special Challenge Access
- **Premium Challenges**: Locked icon shown; requires 50-coin entry fee
- **Team Relay**: Shows team member avatars when joined
- **Time-Limited**: Countdown timer displayed prominently

### UX Principles Applied
1. **Progressive Disclosure**: Full details in modal, summary on dashboard
2. **Positive Reinforcement**: Celebration animations on progress
3. **Clear Value Prop**: Rewards always visible and highlighted
4. **Low Friction**: One-click to view details, easy sharing options
