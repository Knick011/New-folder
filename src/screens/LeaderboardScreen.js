// src/screens/LeaderboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ScoreService from '../services/ScoreService';
import theme from '../styles/theme';

// Fake player data generator
const generateFakePlayers = (userScore) => {
  const names = [
    'ProGamer123', 'BrainMaster', 'QuizWhiz', 'KnowledgeKing',
    'Sarah Smith', 'Mike Johnson', 'Emma Davis', 'Alex Chen',
    'QuizNinja', 'Brainiac', 'TriviaTitan', 'QuizQueen',
    'John Doe', 'Lisa Wang', 'David Kim', 'Maria Garcia'
  ];
  
  const players = [];
  const userRank = Math.floor(Math.random() * 5) + 3; // Random rank between 3-7
  
  // Generate players with scores
  for (let i = 0; i < 20; i++) {
    let score;
    if (i === userRank) {
      score = userScore;
    } else if (i < userRank) {
      // Higher scores
      score = userScore + Math.floor(Math.random() * 1000) + 500;
    } else {
      // Lower scores
      score = Math.max(0, userScore - Math.floor(Math.random() * 500));
    }
    
    const lastActive = new Date();
    lastActive.setMinutes(lastActive.getMinutes() - Math.floor(Math.random() * 60));
    
    players.push({
      id: i,
      name: names[i % names.length],
      score,
      lastActive,
      isUser: i === userRank
    });
  }
  
  // Sort by score
  return players.sort((a, b) => b.score - a.score);
};

const LeaderboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('global');
  const [players, setPlayers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadLeaderboard = async () => {
    const userScore = ScoreService.getScoreInfo().totalScore;
    const fakePlayers = generateFakePlayers(userScore);
    setPlayers(fakePlayers);
  };
  
  useEffect(() => {
    loadLeaderboard();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };
  
  const formatTimeAgo = (date) => {
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  const renderPlayer = (player, index) => {
    const isTopThree = index < 3;
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    
    return (
      <View
        key={player.id}
        style={[
          styles.playerRow,
          player.isUser && styles.userRow,
          isTopThree && styles.topThreeRow
        ]}
      >
        <View style={styles.rankContainer}>
          {isTopThree ? (
            <Icon name="medal" size={24} color={medalColors[index]} />
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {player.name}
            {player.isUser && ' (You)'}
          </Text>
          <Text style={styles.lastActive}>
            Last active: {formatTimeAgo(player.lastActive)}
          </Text>
        </View>
        <Text style={styles.score}>{player.score}</Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
      </View>
      
      <View style={styles.tabs}>
        {['global', 'friends', 'daily', 'weekly'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView
        style={styles.leaderboard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {players.map((player, index) => renderPlayer(player, index))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF9F1C',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  activeTabText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
  },
  leaderboard: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  userRow: {
    backgroundColor: '#FFF8E7',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9F1C',
  },
  topThreeRow: {
    backgroundColor: '#FFF8E7',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  lastActive: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9F1C',
    marginLeft: 16,
  },
});

export default LeaderboardScreen;