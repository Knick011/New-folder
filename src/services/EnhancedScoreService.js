// src/services/EnhancedScoreService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import EnhancedTimerService from './EnhancedTimerService';

// Scoring constants
const SCORE_BASE = 100;                  // Base score for a correct answer
const STREAK_MULTIPLIER = 0.5;           // +50% per streak level
const TIME_MULTIPLIER = 1.5;             // Maximum +50% for fast answers
const STREAK_MILESTONE = 5;              // Streak milestone
const MILESTONE_BONUS = 500;             // Bonus for streak milestone

// Time management constants
const OVERTIME_PENALTY_PER_MINUTE = 50;  // Lose 50 points per minute over limit
const ROLLOVER_BONUS_PER_MINUTE = 10;    // Gain 10 points per unused minute
const MAX_ROLLOVER_MINUTES = 120;        // Cap rollover at 2 hours
const PENALTY_TICK_INTERVAL = 10000;     // Check every 10 seconds

class EnhancedScoreService {
  constructor() {
    // Score properties - these reset daily
    this.currentStreak = 0;
    this.highestStreak = 0;
    this.dailyScore = 0;              // Today's score (resets at midnight)
    this.yesterdayScore = 0;          // Yesterday's final score
    this.allTimeHighScore = 0;        // Best daily score ever
    this.totalDaysPlayed = 0;         // Total days with activity
    
    // Session tracking
    this.sessionScore = 0;
    this.streakMilestones = [];
    this.questionStartTime = 0;
    
    // Time management
    this.overtimePenalty = 0;
    this.dailyRolloverBonus = 0;
    this.lastPenaltyCheck = Date.now();
    this.penaltyCheckInterval = null;
    this.currentDate = new Date().toDateString();
    
    // Weekly tracking
    this.weeklyScores = [];           // Last 7 days of scores
    this.monthlyTotal = 0;            // This month's total
    
    // Persistence
    this.isLoaded = false;
    this.dailyResetCheckInterval = null;
    
    // Storage keys
    this.STORAGE_KEYS = {
      DAILY_SCORE: 'brainbites_daily_score',
      SCORE_HISTORY: 'brainbites_score_history',
      TIME_MANAGEMENT: 'brainbites_time_management'
    };
    
    // Event listeners
    this.listeners = [];
    
    // Start monitoring
    this.startOvertimeMonitoring();
    this.startDailyResetMonitoring();
    this.setupTimerListener();
  }
  
  setupTimerListener() {
    EnhancedTimerService.addEventListener((event) => {
      if (event.event === 'timeExpired') {
        this.startPenaltyAccumulation();
      } else if (event.event === 'creditsAdded' && event.newTotal > 0) {
        this.stopPenaltyAccumulation();
      }
    });
  }
  
  async loadSavedData() {
    if (this.isLoaded) return;
    
    try {
      // Check for daily reset first
      await this.checkDailyReset();
      
      // Load daily score data
      const dailyData = await AsyncStorage.getItem(this.STORAGE_KEYS.DAILY_SCORE);
      if (dailyData) {
        const parsed = JSON.parse(dailyData);
        
        // Only load if it's still the same day
        if (parsed.date === this.currentDate) {
          this.dailyScore = parsed.dailyScore || 0;
          this.currentStreak = parsed.currentStreak || 0;
          this.highestStreak = parsed.highestStreak || 0;
          this.overtimePenalty = parsed.overtimePenalty || 0;
        }
      }
      
      // Load score history
      const historyData = await AsyncStorage.getItem(this.STORAGE_KEYS.SCORE_HISTORY);
      if (historyData) {
        const history = JSON.parse(historyData);
        this.allTimeHighScore = history.allTimeHighScore || 0;
        this.totalDaysPlayed = history.totalDaysPlayed || 0;
        this.weeklyScores = history.weeklyScores || [];
        this.monthlyTotal = history.monthlyTotal || 0;
        this.yesterdayScore = history.yesterdayScore || 0;
      }
      
      this.resetSession();
      this.isLoaded = true;
      
      return {
        dailyScore: this.dailyScore,
        highestStreak: this.highestStreak,
        allTimeHighScore: this.allTimeHighScore
      };
    } catch (error) {
      console.error('Error loading score data:', error);
      return null;
    }
  }
  
  startDailyResetMonitoring() {
    // Check every minute for midnight
    if (this.dailyResetCheckInterval) {
      clearInterval(this.dailyResetCheckInterval);
    }
    
    this.dailyResetCheckInterval = setInterval(() => {
      this.checkDailyReset();
    }, 60000); // Every minute
  }
  
  async checkDailyReset() {
    const now = new Date();
    const todayString = now.toDateString();
    
    if (this.currentDate !== todayString) {
      console.log('🌅 New day detected! Performing daily reset...');
      
      // It's a new day! Perform daily reset
      await this.performDailyReset();
      
      this.currentDate = todayString;
    }
  }
  
  async performDailyReset() {
    // Save yesterday's score
    this.yesterdayScore = this.dailyScore;
    
    // Update history before reset
    await this.updateScoreHistory();
    
    // Calculate rollover bonus from remaining time
    const remainingTime = EnhancedTimerService.getAvailableTime();
    let rolloverBonus = 0;
    
    if (remainingTime > 0) {
      const remainingMinutes = Math.floor(remainingTime / 60);
      const cappedMinutes = Math.min(remainingMinutes, MAX_ROLLOVER_MINUTES);
      rolloverBonus = cappedMinutes * ROLLOVER_BONUS_PER_MINUTE;
      
      console.log(`💰 Rollover bonus: ${rolloverBonus} points for ${cappedMinutes} unused minutes`);
    }
    
    // Check if beat personal best
    const wasNewRecord = this.dailyScore > this.allTimeHighScore;
    if (wasNewRecord) {
      this.allTimeHighScore = this.dailyScore;
    }
    
    // Reset daily values
    this.dailyScore = rolloverBonus; // Start new day with rollover bonus
    this.dailyRolloverBonus = rolloverBonus;
    this.currentStreak = 0;
    this.sessionScore = 0;
    this.overtimePenalty = 0;
    
    // Increment days played if yesterday had activity
    if (this.yesterdayScore > 0) {
      this.totalDaysPlayed++;
    }
    
    // Save the reset state
    await this.saveData();
    
    // Notify listeners about the reset
    this._notifyListeners('dailyReset', {
      yesterdayScore: this.yesterdayScore,
      rolloverBonus: rolloverBonus,
      rolloverMinutes: Math.floor(remainingTime / 60),
      wasNewRecord: wasNewRecord,
      newDayScore: this.dailyScore,
      totalDaysPlayed: this.totalDaysPlayed
    });
    
    // Show mascot notification
    this.showDailyResetNotification(rolloverBonus, wasNewRecord);
  }
  
  async updateScoreHistory() {
    // Add yesterday's score to weekly history
    this.weeklyScores.push({
      date: this.currentDate,
      score: this.dailyScore,
      streak: this.highestStreak
    });
    
    // Keep only last 7 days
    if (this.weeklyScores.length > 7) {
      this.weeklyScores.shift();
    }
    
    // Update monthly total
    const currentMonth = new Date().getMonth();
    const historyMonth = this.weeklyScores[0]?.date ? new Date(this.weeklyScores[0].date).getMonth() : currentMonth;
    
    if (currentMonth !== historyMonth) {
      // New month, reset monthly total
      this.monthlyTotal = this.dailyScore;
    } else {
      // Same month, add to total
      this.monthlyTotal = this.weeklyScores.reduce((sum, day) => sum + day.score, 0);
    }
  }
  
  showDailyResetNotification(rolloverBonus, wasNewRecord) {
    let message = '🌅 Good Morning, CaBBybara!\n\n';
    
    if (this.yesterdayScore > 0) {
      message += `Yesterday's score: ${this.yesterdayScore.toLocaleString()} points\n`;
      
      if (wasNewRecord) {
        message += `🏆 NEW PERSONAL BEST! 🏆\n`;
      }
    }
    
    if (rolloverBonus > 0) {
      message += `\n✨ Rollover Bonus: +${rolloverBonus} points\n`;
      message += `Great job saving screen time!\n`;
    }
    
    message += `\nReady for a new day of learning? 🚀`;
    
    this._notifyListeners('showMessage', {
      type: 'dailyReset',
      message: message,
      priority: 'high'
    });
  }
  
  async saveData() {
    try {
      // Save daily data
      const dailyData = {
        date: this.currentDate,
        dailyScore: this.dailyScore,
        currentStreak: this.currentStreak,
        highestStreak: this.highestStreak,
        overtimePenalty: this.overtimePenalty,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_SCORE, JSON.stringify(dailyData));
      
      // Save history
      const historyData = {
        allTimeHighScore: this.allTimeHighScore,
        totalDaysPlayed: this.totalDaysPlayed,
        weeklyScores: this.weeklyScores,
        monthlyTotal: this.monthlyTotal,
        yesterdayScore: this.yesterdayScore,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.SCORE_HISTORY, JSON.stringify(historyData));
      
    } catch (error) {
      console.error('Error saving score data:', error);
    }
  }
  
  // Overtime monitoring methods
  startOvertimeMonitoring() {
    if (this.penaltyCheckInterval) {
      clearInterval(this.penaltyCheckInterval);
    }
    
    this.penaltyCheckInterval = setInterval(() => {
      this.checkAndApplyPenalties();
    }, PENALTY_TICK_INTERVAL);
  }
  
  startPenaltyAccumulation() {
    console.log('Starting penalty accumulation - user is overtime!');
    this.lastPenaltyCheck = Date.now();
  }
  
  stopPenaltyAccumulation() {
    console.log('Stopping penalty accumulation - user has time credits');
    this.lastPenaltyCheck = null;
  }
  
  async checkAndApplyPenalties() {
    const availableTime = EnhancedTimerService.getAvailableTime();
    const trackingStatus = EnhancedTimerService.getTrackingStatus();
    
    if (availableTime <= 0 && !trackingStatus.isBrainBitesActive && this.lastPenaltyCheck) {
      const now = Date.now();
      const overtimeSeconds = Math.floor((now - this.lastPenaltyCheck) / 1000);
      const overtimeMinutes = overtimeSeconds / 60;
      
      const penalty = Math.floor(overtimeMinutes * OVERTIME_PENALTY_PER_MINUTE);
      
      if (penalty > 0) {
        // Apply penalty to daily score (can go negative!)
        this.dailyScore = Math.max(-9999, this.dailyScore - penalty);
        this.overtimePenalty += penalty;
        
        console.log(`Applied overtime penalty: -${penalty} points (${overtimeMinutes.toFixed(1)} minutes overtime)`);
        
        this.lastPenaltyCheck = now;
        await this.saveData();
        
        this._notifyListeners('penaltyApplied', {
          penalty,
          overtimeMinutes: Math.floor(overtimeMinutes),
          dailyScore: this.dailyScore,
          totalPenalty: this.overtimePenalty
        });
        
        if (this.overtimePenalty % 50 === 0) {
          this.showPenaltyWarning(this.overtimePenalty);
        }
      }
    }
  }
  
  showPenaltyWarning(totalPenalty) {
    this._notifyListeners('showMessage', {
      type: 'penalty',
      message: `⚠️ Overtime Alert!\n\nYou've lost ${totalPenalty} points today!\n\nYour daily score: ${this.dailyScore}\n\nComplete quizzes to earn time and stop losing points! 😰`
    });
  }
  
  // Question answering methods
  startQuestionTimer() {
    this.questionStartTime = Date.now();
  }
  
  recordAnswer(isCorrect) {
    if (!this.isLoaded) {
      console.warn('Score service not initialized! Call loadSavedData() first.');
    }
    
    if (isCorrect) {
      this.currentStreak++;
      
      if (this.currentStreak > this.highestStreak) {
        this.highestStreak = this.currentStreak;
      }
      
      const streakLevel = Math.floor(this.currentStreak / STREAK_MILESTONE);
      const isNewMilestone = this.currentStreak % STREAK_MILESTONE === 0 && this.currentStreak > 0;
      
      if (isNewMilestone) {
        this.streakMilestones.push(this.currentStreak);
      }
      
      let earnedPoints = SCORE_BASE;
      
      if (streakLevel > 0) {
        earnedPoints += SCORE_BASE * (streakLevel * STREAK_MULTIPLIER);
      }
      
      const answerTime = (Date.now() - this.questionStartTime) / 1000;
      const timeBonus = Math.max(0, 1 - (answerTime / 10));
      earnedPoints += SCORE_BASE * timeBonus * TIME_MULTIPLIER;
      
      if (isNewMilestone) {
        earnedPoints += MILESTONE_BONUS;
      }
      
      earnedPoints = Math.round(earnedPoints);
      
      this.sessionScore += earnedPoints;
      this.dailyScore += earnedPoints;
      
      const result = {
        correct: true,
        pointsEarned: earnedPoints,
        currentStreak: this.currentStreak,
        sessionScore: this.sessionScore,
        dailyScore: this.dailyScore,
        isStreakMilestone: isNewMilestone,
        streakLevel,
        timeBonus: timeBonus > 0
      };
      
      this._notifyListeners('scoreUpdated', result);
      this.questionStartTime = 0;
      this.saveData();
      
      return result;
    } else {
      const previousStreak = this.currentStreak;
      this.currentStreak = 0;
      
      const result = {
        correct: false,
        pointsEarned: 0,
        streakBroken: previousStreak > 0,
        previousStreak,
        sessionScore: this.sessionScore,
        dailyScore: this.dailyScore
      };
      
      this._notifyListeners('streakReset', result);
      this.questionStartTime = 0;
      
      return result;
    }
  }
  
  // Get score information
  getScoreInfo() {
    const weeklyTotal = this.weeklyScores.reduce((sum, day) => sum + day.score, 0);
    const weeklyAverage = this.weeklyScores.length > 0 
      ? Math.round(weeklyTotal / this.weeklyScores.length) 
      : 0;
    
    return {
      // Current values
      currentStreak: this.currentStreak,
      highestStreak: this.highestStreak,
      sessionScore: this.sessionScore,
      
      // Daily values
      dailyScore: this.dailyScore,
      yesterdayScore: this.yesterdayScore,
      dailyRolloverBonus: this.dailyRolloverBonus,
      overtimePenalty: this.overtimePenalty,
      
      // Historical values
      allTimeHighScore: this.allTimeHighScore,
      totalDaysPlayed: this.totalDaysPlayed,
      weeklyScores: this.weeklyScores,
      weeklyTotal: weeklyTotal,
      weeklyAverage: weeklyAverage,
      monthlyTotal: this.monthlyTotal,
      
      // For leaderboard - use daily score
      totalScore: this.dailyScore,
      
      // Progress
      streakLevel: Math.floor(this.currentStreak / STREAK_MILESTONE),
      nextMilestone: (Math.floor(this.currentStreak / STREAK_MILESTONE) + 1) * STREAK_MILESTONE,
      progress: this.currentStreak % STREAK_MILESTONE / STREAK_MILESTONE,
      
      // Time info
      hoursOvertime: Math.floor(this.overtimePenalty / OVERTIME_PENALTY_PER_MINUTE / 60),
      minutesOvertime: Math.floor(this.overtimePenalty / OVERTIME_PENALTY_PER_MINUTE) % 60
    };
  }
  
  resetSession() {
    this.currentStreak = 0;
    this.sessionScore = 0;
    this.streakMilestones = [];
    this.questionStartTime = 0;
  }
  
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
  
  cleanup() {
    if (this.penaltyCheckInterval) {
      clearInterval(this.penaltyCheckInterval);
    }
    if (this.dailyResetCheckInterval) {
      clearInterval(this.dailyResetCheckInterval);
    }
  }
}

export default new EnhancedScoreService();