import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './Config';
import soundManager from './SoundManager';

const { width, height } = Dimensions.get('window');
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y);

const ACHIEVEMENT_KEYS = [
  { key: 'obviousLiar', label: 'Obvious Liar' },
  { key: 'didTheImpossible', label: 'Did the Impossible' },
  { key: 'spammer', label: 'Spammer' },
  { key: 'winner', label: 'Winner' },
  { key: 'master', label: 'Master' },
];

const Leaderboard = () => {
  const navigation = useNavigation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState([]);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, 'Users'));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data() || {};
        const wins = Number(d.wins || 0);
        const losses = Number(d.losses || 0);
        const achievements = d.achievements || {};
        const ratio = wins / Math.max(1, losses);
        return {
          id: doc.id,
          name: d.name || 'Unknown',
          wins,
          losses,
          achievements,
          ratio,
        };
      });
      // Sort by best win/loss ratio, then wins desc
      data.sort((a, b) => {
        if (b.ratio === a.ratio) {
          return b.wins - a.wins;
        }
        return b.ratio - a.ratio;
      });
      setPlayers(data);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const filteredPlayers = useMemo(() => {
    if (!selectedFilters.length) return players;
    return players.filter((p) =>
      selectedFilters.every((f) => !!p.achievements?.[f])
    );
  }, [players, selectedFilters]);

  const toggleFilter = useCallback((key) => {
    setSelectedFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const renderPlayer = ({ item, index }) => {
    const achievementList = ACHIEVEMENT_KEYS.filter((a) => item.achievements?.[a.key]).map((a) => a.label);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.ratio}>{item.ratio.toFixed(2)} W/L</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Wins: {item.wins}</Text>
          <Text style={styles.stat}>Losses: {item.losses}</Text>
        </View>
        <Text style={styles.achievementsLabel}>Achievements:</Text>
        <View style={styles.achievementsRow}>
          {achievementList.length ? achievementList.map((ach) => (
            <View key={ach} style={styles.achievementPill}>
              <Text style={styles.achievementText}>{ach}</Text>
            </View>
          )) : (
            <Text style={styles.noAchievements}>None yet</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { soundManager.playClick(); navigation.goBack(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Sorted by wins per loss, then total wins</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {ACHIEVEMENT_KEYS.map((ach) => {
          const active = selectedFilters.includes(ach.key);
          return (
            <TouchableOpacity
              key={ach.key}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => toggleFilter(ach.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{ach.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchLeaderboard} activeOpacity={0.85}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlayers}
          keyExtractor={(item) => item.id}
          renderItem={renderPlayer}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1324',
    paddingTop: 80 * SCALE,
    paddingHorizontal: 40 * SCALE,
  },
  title: {
    color: '#fff',
    fontSize: 48 * SCALE,
    fontWeight: '900',
  },
  subtitle: {
    color: '#b0bec5',
    fontSize: 22 * SCALE,
    marginTop: 8 * SCALE,
    marginBottom: 24 * SCALE,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16 * SCALE,
    marginBottom: 12 * SCALE,
  },
  backBtn: {
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 10 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#263238',
    borderWidth: 1,
    borderColor: '#546e7a',
  },
  backText: {
    color: '#eceff1',
    fontSize: 18 * SCALE,
    fontWeight: '800',
  },
  headerTextWrap: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12 * SCALE,
    justifyContent: 'center',
    marginBottom: 16 * SCALE,
  },
  filterBtn: {
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 10 * SCALE,
    borderRadius: 18 * SCALE,
    borderWidth: 2,
    borderColor: '#78909c',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterBtnActive: {
    backgroundColor: '#1e88e5',
    borderColor: '#90caf9',
  },
  filterText: {
    color: '#cfd8dc',
    fontSize: 18 * SCALE,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  refreshBtn: {
    alignSelf: 'center',
    marginBottom: 20 * SCALE,
    paddingHorizontal: 24 * SCALE,
    paddingVertical: 12 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#26a69a',
  },
  refreshText: {
    color: '#fff',
    fontSize: 20 * SCALE,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 80 * SCALE,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16 * SCALE,
    padding: 18 * SCALE,
    marginBottom: 12 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8 * SCALE,
  },
  rank: {
    color: '#ffca28',
    fontSize: 24 * SCALE,
    fontWeight: '900',
  },
  name: {
    color: '#fff',
    fontSize: 24 * SCALE,
    fontWeight: '800',
    flex: 1,
    marginLeft: 12 * SCALE,
  },
  ratio: {
    color: '#80cbc4',
    fontSize: 18 * SCALE,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16 * SCALE,
    marginBottom: 8 * SCALE,
  },
  stat: {
    color: '#cfd8dc',
    fontSize: 18 * SCALE,
  },
  achievementsLabel: {
    color: '#90caf9',
    fontSize: 16 * SCALE,
    fontWeight: '700',
    marginBottom: 6 * SCALE,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 * SCALE,
  },
  achievementPill: {
    backgroundColor: 'rgba(144,202,249,0.2)',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
  },
  achievementText: {
    color: '#e3f2fd',
    fontSize: 14 * SCALE,
    fontWeight: '700',
  },
  noAchievements: {
    color: '#78909c',
    fontSize: 14 * SCALE,
  },
  loading: {
    alignItems: 'center',
    marginTop: 40 * SCALE,
  },
  loadingText: {
    color: '#cfd8dc',
    marginTop: 8 * SCALE,
    fontSize: 18 * SCALE,
  },
});

export default Leaderboard;
