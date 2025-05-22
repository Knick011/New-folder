// src/services/ScoreService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Scoring constants
const SCORE_BASE = 100;          // Base score for a correct answer
const STREAK_MULTIPLIER = 0.5;   // +50% per streak level (every 5 correct answers)
const TIME_MULTIPLIER = 1.5;     // Maximum +50% for fast answers (diminishes as time passes)
const STREAK_MILESTONE = 5;      // Number of consecutive correct answers to reach a streak milestone
const MILESTONE_BONUS = 500;     // Bonus points for reaching a streak milestone

/**
 * Service to handle score calculation, streaks, and leaderboard functionality
 */
class ScoreService {
  constructor() {
    this.currentStreak = 0;       // Current streak (resets on wrong answer)
    this.highestStreak = 0;       // Highest streak achieved
    this.sessionScore = 0;        // Current session score
    this.totalScore = 0;          // All-time score
    this.streakMilestones = [];   // Milestones reached (multiples of 5)
    this.isLoaded = false;        // Whether data has been loaded from storage
    this.leaderboard = [];        // Top scores
    this.questionStartTime = 0;   // Used to calculate time bonus
    
    // Storage keys
    this.STORAGE_KEYS = {
      SCORE_DATA: 'brainbites_score_data',
      LEADERBOARD: 'brainbites_leaderboard'
    };
    
    // Event listeners
    this.listeners = [];
  }
  
  /**
   * Load saved score data from AsyncStorage
   */
  async loadSavedData() {
    if (this.isLoaded) return;
    
    try {
      // Load score data
      const scoreData = await AsyncStorage.getItem(this.STORAGE_KEYS.SCORE_DATA);
      if (scoreData) {
        const parsedData = JSON.parse(scoreData);
        this.totalScore = parsedData.totalScore || 0;
        this.highestStreak = parsedData.highestStreak || 0;
      }
      
      // Load leaderboard
      const leaderboardData = await AsyncStorage.getItem(this.STORAGE_KEYS.LEADERBOARD);
      if (leaderboardData) {
        this.leaderboard = JSON.parse(leaderboardData);
      }
      
      // Reset session values
      this.resetSession();
      this.isLoaded = true;
      
      return {
        totalScore: this.totalScore,
        highestStreak: this.highestStreak
      };
    } catch (error) {
      console.error('Error loading score data:', error);
      return null;
    }
  }
  
  /**
   * Save score data to AsyncStorage
   */
  async saveData() {
    try {
      const scoreData = {
        totalScore: this.totalScore,
        highestStreak: this.highestStreak,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.SCORE_DATA, JSON.stringify(scoreData));
      
      // Also update leaderboard if needed
      if (this.sessionScore > 0) {
        await this._updateLeaderboard();
      }
    } catch (error) {
      console.error('Error saving score data:', error);
    }
  }
  
  /**
   * Start timing a new question (for time bonus calculation)
   */
  startQuestionTimer() {
    this.questionStartTime = Date.now();
  }
  
  /**
   * Calculate and add score for a correct answer
   * @param {boolean} isCorrect - Whether the answer was correct
   * @returns {Object} Score data including points earned, new score total, and streak info
   */
  recordAnswer(isCorrect) {
    if (!this.isLoaded) {
      console.warn('Score service not initialized! Call loadSavedData() first.');
    }
    
    // Handle correct answer
    if (isCorrect) {
      // Increment streak
      this.currentStreak++;
      
      // Update highest streak if needed
      if (this.currentStreak > this.highestStreak) {
        this.highestStreak = this.currentStreak;
      }
      
      // Calculate streaks and milestones
      const streakLevel = Math.floor(this.currentStreak / STREAK_MILESTONE);
      const isNewMilestone = this.currentStreak % STREAK_MILESTONE === 0 && this.currentStreak > 0;
      
      if (isNewMilestone) {
        this.streakMilestones.push(this.currentStreak);
      }
      
      // Calculate score with multipliers
      let earnedPoints = SCORE_BASE;
      
      // Apply streak multiplier
      if (streakLevel > 0) {
        earnedPoints += SCORE_BASE * (streakLevel * STREAK_MULTIPLIER);
      }
      
      // Apply time multiplier (max bonus for answering in under 2 seconds)
      const answerTime = (Date.now() - this.questionStartTime) / 1000;
      const timeBonus = Math.max(0, 1 - (answerTime / 10)); // Linearly reduce from 1 to 0 over 10 seconds
      earnedPoints += SCORE_BASE * timeBonus * TIME_MULTIPLIER;
      
      // Add milestone bonus if applicable
      if (isNewMilestone) {
        earnedPoints += MILESTONE_BONUS;
      }
      
      // Round to nearest integer
      earnedPoints = Math.round(earnedPoints);
      
      // Update scores
      this.sessionScore += earnedPoints;
      this.totalScore += earnedPoints;
      
      // Prepare result
      const result = {
        correct: true,
        pointsEarned: earnedPoints,
        currentStreak: this.currentStreak,
        sessionScore: this.sessionScore,
        totalScore: this.totalScore,
        isStreakMilestone: isNewMilestone,
        streakLevel,
        timeBonus: timeBonus > 0
      };
      
      // Notify listeners
      this._notifyListeners('scoreUpdated', result);
      
      // Reset timer for next question
      this.questionStartTime = 0;
      
      // Save data in background
      this.saveData();
      
      return result;
    } 
    // Handle incorrect answer
    else {
      // Reset streak
      const previousStreak = this.currentStreak;
      this.currentStreak = 0;
      
      const result = {
        correct: false,
        pointsEarned: 0,
        streakBroken: previousStreak > 0,
        previousStreak,
        sessionScore: this.sessionScore,
        totalScore: this.totalScore
      };
      
      // Notify listeners
      this._notifyListeners('streakReset', result);
      
      // Reset timer for next question
      this.questionStartTime = 0;
      
      return result;
    }
  }
  
  /**
   * Get current score and streak information
   */
  getScoreInfo() {
    return {
      currentStreak: this.currentStreak,
      highestStreak: this.highestStreak,
      sessionScore: this.sessionScore,
      totalScore: this.totalScore,
      streakLevel: Math.floor(this.currentStreak / STREAK_MILESTONE),
      nextMilestone: (Math.floor(this.currentStreak / STREAK_MILESTONE) + 1) * STREAK_MILESTONE,
      progress: this.currentStreak % STREAK_MILESTONE / STREAK_MILESTONE
    };
  }
  
  /**
   * Reset session data (when starting a new quiz session)
   */
  resetSession() {
    this.currentStreak = 0;
    this.sessionScore = 0;
    this.streakMilestones = [];
    this.questionStartTime = 0;
  }
  
  /**
   * Get leaderboard data
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Leaderboard entries sorted by score
   */
  async getLeaderboard(limit = 10) {
    if (!this.isLoaded) {
      await this.loadSavedData();
    }
    
    // Return top scores, limited to requested amount
    return this.leaderboard.slice(0, limit);
  }
  
  /**
   * Add a new leaderboard entry
   * @param {string} name - Player name
   * @param {number} score - Score achieved
   */
  async addLeaderboardEntry(name, score = null) {
    if (score === null) {
      score = this.sessionScore;
    }
    
    if (score <= 0) {
      return false;
    }
    
    const newEntry = {
      name,
      score,
      date: new Date().toISOString(),
      streak: this.highestStreak
    };
    
    this.leaderboard.push(newEntry);
    
    // Sort leaderboard by score (highest first)
    this.leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 100 scores
    if (this.leaderboard.length > 100) {
      this.leaderboard = this.leaderboard.slice(0, 100);
    }
    
    // Save to storage
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LEADERBOARD,
        JSON.stringify(this.leaderboard)
      );
      return true;
    } catch (error) {
      console.error('Error saving leaderboard:', error);
      return false;
    }
  }
  
  /**
   * Update leaderboard with current session score (anonymous entry)
   * @private
   */
  async _updateLeaderboard() {
    // Only add to leaderboard if score is significant
    if (this.sessionScore > 1000) {
      return await this.addLeaderboardEntry('Player', this.sessionScore);
    }
    return false;
  }
  
  /**
   * Add event listener
   * @param {Function} callback - Callback function to call on events
   * @returns {Function} Cleanup function to remove listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Notify all listeners
   * @private
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
}

// Export singleton instance
export default new ScoreService();