// src/screens/LeaderboardScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Animated,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';

// Funny capybara-themed player names
const FAKE_NAMES = [
  'CapyBOSSa', 'CapyBALLER', 'HappyBara', 'CapyGOATa', 'CapyBrainiac',
  'CapyCrusher', 'BaraKing', 'CapyChampion', 'RodentRoyalty', 'CapyGenius',
  'AquaticAce', 'CapyMaster', 'SwimmingScholar', 'CapyPro2024', 'BaraBoss',
  'CapyBaller', 'ChillBara', 'CapyDominant', 'SplashyBara', 'CapyElite',
  'BaraGOD', 'CapyLegend', 'WaterPigWins', 'CapyStrong', 'BaraBeats',
  'CapyClever', 'SmartBara', 'CapyQuizKing', 'BaraBrains', 'CapySharp',
  'RodentRuler', 'CapySwift', 'BaraBlitz', 'CapyQuick', 'FastBara',
  'CapyNinja', 'StealthyBara', 'CapyWarrior', 'BaraBattle', 'CapyVictor',
  'WinningBara', 'CapyChamp', 'BaraBest', 'CapySupreme', 'EliteBara',
  'CapyWizard', 'MagicBara', 'CapySage', 'WiseBara', 'CapyOracle',
  'BaraBarista', 'CoffeeCapy', 'SleepyBara', 'NightCapy', 'CapyDreamer',
  'ZenBara', 'ChillCapybara', 'RelaxedRodent', 'CalmCapy', 'PeacefulBara',
  'StudyBara', 'BookishCapy', 'NerdyBara', 'CapyScholar', 'AcademicBara'
];

// Calculate score for hours of play
// Assuming average of 10 seconds per question, 100 points per correct answer
// 4 hours = 14,400 seconds = 1,440 questions = 144,000 base points
// With streaks and bonuses, could be ~200,000-300,000 points
const TOP_PLAYER_DAILY_SCORE = 120000;

// Generate top 10 ultra-competitive scores
const generateTop10DailyScores = () => {
  const scores = [];
  let currentScore = TOP_PLAYER_DAILY_SCORE;
  
  // Top 10 players have very high scores, close competition
  for (let i = 0; i < 10; i++) {
    const dropPercentage = 0.92 + (Math.random() * 0.06); // 92-98% of previous
    currentScore = Math.floor(currentScore * dropPercentage);
    
    scores.push({
      id: `top_${i}`,
      rank: i + 1,
      displayName: FAKE_NAMES[i],
      score: currentScore,
      highestStreak: Math.floor(Math.random() * 20) + 10, // 10-30 streak
      isCurrentUser: false,
      lastActive: i < 3 ? 'Online now' : `${Math.floor(Math.random() * 59) + 1}m ago`,
    });
  }
  
  return scores;
};

// Calculate user's actual rank based on score
const calculateUserRank = (userScore) => {
  // Rough calculation: every 100 points difference = ~3 ranks
  // This creates a realistic distribution
  const scoreDifference = TOP_PLAYER_DAILY_SCORE - userScore;
  const estimatedRank = Math.floor(scoreDifference / 100) * 3 + 11;
  
  // Add some randomness
  const variance = Math.floor(Math.random() * 20) - 10;
  
  return Math.max(11, estimatedRank + variance);
};

// Generate players around user's rank
const generateAroundUserScores = (userScore, userRank) => {
  const scores = [];
  // Generate 2 players above and 2 below the user
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue; // Skip user's position
    let rank = userRank + i;
    if (isNaN(rank)) rank = 1000 + i; // fallback for NaN
    const scoreDiff = i * (50 + Math.random() * 50); // 50-100 points difference per rank
    const score = Math.max(100, Math.floor(userScore - scoreDiff));
    scores.push({
      id: `around_${rank}_${i}`, // ensure unique key
      rank: rank,
      displayName: FAKE_NAMES[(rank + 10) % FAKE_NAMES.length],
      score: score,
      highestStreak: Math.floor(Math.random() * 40) + 10,
      isCurrentUser: false,
      lastActive: `${Math.floor(Math.random() * 23) + 1}h ago`,
    });
  }
  return scores;
};

const LeaderboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('global'); // 'global', 'friends'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserDailyScore, setCurrentUserDailyScore] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    loadUserScore();
    
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for user's entry
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  useEffect(() => {
    loadLeaderboardData();
  }, [activeTab, currentUserDailyScore]);
  
  const loadUserScore = async () => {
    await EnhancedScoreService.loadSavedData();
    const scoreInfo = EnhancedScoreService.getScoreInfo();
    setCurrentUserDailyScore(scoreInfo.dailyScore);
  };
  
  const loadLeaderboardData = () => {
    let fakeData = [];
    let userPosition = 0;
    
    switch (activeTab) {
      case 'global': {
        const top10 = generateTop10DailyScores();
        const userRank = calculateUserRank(currentUserDailyScore);
        setUserRank(userRank);
        if (currentUserDailyScore > top10[9].score) {
          const insertIndex = top10.findIndex(p => p.score < currentUserDailyScore);
          const userData = {
            id: 'current_user',
            rank: insertIndex + 1,
            displayName: 'CaBBybara',
            score: currentUserDailyScore,
            highestStreak: EnhancedScoreService.getScoreInfo().highestStreak,
            isCurrentUser: true,
            lastActive: 'Online now',
          };
          top10.splice(insertIndex, 0, userData);
          top10.pop();
          top10.forEach((player, index) => {
            player.rank = index + 1;
          });
          fakeData = top10;
        } else {
          fakeData = [...top10];
        }
        fakeData.push({ id: 'separator', isSeparator: true });
        const aroundUser = generateAroundUserScores(currentUserDailyScore, userRank);
        fakeData = fakeData.concat(aroundUser);
        const userData = {
          id: 'current_user',
          rank: userRank,
          displayName: 'CaBBybara',
          score: currentUserDailyScore,
          highestStreak: EnhancedScoreService.getScoreInfo().highestStreak,
          isCurrentUser: true,
          lastActive: 'Online now',
        };
        const insertIndex = fakeData.findIndex(p => !p.isSeparator && p.rank > userRank);
        if (insertIndex !== -1) {
          fakeData.splice(insertIndex, 0, userData);
        } else {
          fakeData.push(userData);
        }
        break;
      }
      case 'friends': {
        const friendNames = [
          'BestBaraBuddy', 'StudyCapy', 'CoffeeBara', 'GymCapybara', 'RoommateBara',
          'WorkCapy', 'OldBaraFriend', 'NewCapyPal', 'CoolCapyCousin', 'SisterBara'
        ];
        const friendScores = friendNames.map((name, i) => {
          const variance = (Math.random() - 0.5) * currentUserDailyScore * 0.4;
          return {
            id: `friend_${i}`,
            rank: 0,
            displayName: name,
            score: Math.max(100, Math.floor(currentUserDailyScore + variance)),
            highestStreak: Math.floor(Math.random() * 20) + 10,
            isCurrentUser: false,
            lastActive: i < 3 ? 'Online now' : `${Math.floor(Math.random() * 23) + 1}h ago`,
          };
        });
        friendScores.push({
          id: 'current_user',
          rank: 0,
          displayName: 'CaBBybara',
          score: currentUserDailyScore,
          highestStreak: EnhancedScoreService.getScoreInfo().highestStreak,
          isCurrentUser: true,
          lastActive: 'Online now',
        });
        friendScores.sort((a, b) => b.score - a.score);
        friendScores.forEach((friend, index) => {
          friend.rank = index + 1;
        });
        fakeData = friendScores;
        const userFriendRank = friendScores.findIndex(f => f.isCurrentUser) + 1;
        setUserRank(userFriendRank);
        break;
      }
    }
    setLeaderboardData(fakeData);
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    SoundService.playButtonPress();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Slightly randomize scores to show "live" updates
    loadLeaderboardData();
    setIsRefreshing(false);
  };
  
  const handleTabChange = (tab) => {
    SoundService.playButtonPress();
    setActiveTab(tab);
  };
  
  const renderLeaderboardItem = (item, index) => {
    if (item.isSeparator) {
      return (
        <View key={item.id} style={styles.separator}>
          <View style={styles.separatorLine} />
          <View style={styles.separatorTextContainer}>
            <Icon name="dots-vertical" size={20} color="#999" />
            <Text style={styles.separatorText}>
              {activeTab === 'global' ? 'Many capybaras later...' : 'More capybaras...'}
            </Text>
            <Icon name="dots-vertical" size={20} color="#999" />
          </View>
          <View style={styles.separatorLine} />
        </View>
      );
    }
    
    const isTopThree = item.rank <= 3;
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
    
    return (
      <Animated.View
        key={item.id}
        style={[
          styles.leaderboardItem,
          item.isCurrentUser && styles.currentUserItem,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, index * 2],
                }),
              },
              item.isCurrentUser ? { scale: pulseAnim } : { scale: 1 },
            ],
          },
        ]}
      >
        <View style={styles.rankContainer}>
          {isTopThree ? (
            <View style={[styles.medal, { backgroundColor: medalColors[item.rank - 1] }]}>
              <Icon name="crown" size={16} color="white" />
              <Text style={styles.medalText}>{item.rank}</Text>
            </View>
          ) : (
            <Text style={[styles.rankText, item.isCurrentUser && styles.currentUserRank]}>
              #{item.rank}
            </Text>
          )}
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, item.isCurrentUser && styles.currentUserName]}>
            {item.displayName} {item.isCurrentUser && '(You)'}
          </Text>
          <View style={styles.statsRow}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.scoreText}>{(item.score ?? 0).toLocaleString()}</Text>
            {item.highestStreak > 0 && (
              <>
                <Icon name="fire" size={14} color="#FF9F1C" style={{ marginLeft: 12 }} />
                <Text style={styles.streakText}>{item.highestStreak}</Text>
              </>
            )}
            {item.lastActive && activeTab === 'global' && (
              <Text style={styles.lastActive}>{item.lastActive}</Text>
            )}
          </View>
        </View>
        
        {item.isCurrentUser && (
          <Icon name="chevron-right" size={24} color={theme.colors.primary} />
        )}
      </Animated.View>
    );
  };
  
  const renderUserCard = () => {
    if (!userRank) return null;
    
    const totalPlayers = activeTab === 'friends' ? 11 : '47.3K';
    
    const percentile = activeTab === 'friends' ? 
      Math.round(((11 - userRank) / 10) * 100) :
      Math.round(((1 - (userRank / 47300)) * 100));
    
    return (
      <Animated.View 
        style={[
          styles.userCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <View style={styles.userCardContent}>
          <View style={styles.userCardLeft}>
            <Text style={styles.userCardLabel}>Your Rank</Text>
            <Text style={styles.userCardRank}>#{userRank}</Text>
            <Text style={styles.userCardSubtext}>of {totalPlayers} capybaras</Text>
          </View>
          <View style={styles.userCardRight}>
            <Text style={styles.userCardLabel}>Top {percentile}%</Text>
            <Text style={styles.userCardScore}>
              {(currentUserDailyScore ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.userCardSubtext}>points</Text>
          </View>
        </View>
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Capybara Rankings</Text>
          <Text style={styles.headerSubtitle}>CaBBybara Leaderboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && styles.activeTab]}
          onPress={() => handleTabChange('global')}
        >
          <Icon name="earth" size={20} color={activeTab === 'global' ? theme.colors.primary : '#777'} />
          <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Global</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => handleTabChange('friends')}
        >
          <Icon name="account-group" size={20} color={activeTab === 'friends' ? theme.colors.primary : '#777'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>
      </View>
      
      {/* User's rank card */}
      {renderUserCard()}
      
      {/* Leaderboard list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {leaderboardData.map((item, index) => renderLeaderboardItem(item, index))}
        
        <View style={styles.footer}>
          <Icon name="rodent" size={20} color="#999" />
          <Text style={styles.footerText}>
            {'Capybara scores reset daily at midnight'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: theme.colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    ...theme.shadows.md,
  },
  userCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userCardLeft: {
    alignItems: 'flex-start',
  },
  userCardRight: {
    alignItems: 'flex-end',
  },
  userCardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  userCardRank: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  userCardScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  userCardSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  leaderboardItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  currentUserItem: {
    backgroundColor: '#FFF5E6',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
  },
  medal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  medalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginTop: -2,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  currentUserRank: {
    color: theme.colors.primary,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  currentUserName: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  streakText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  lastActive: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  separator: {
    marginVertical: 20,
    alignItems: 'center',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
  },
  separatorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
  },
  separatorText: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
    marginLeft: 8,
  },
});

export default LeaderboardScreen;