// File Overview: AdminPlayerList.js
// What this file is: Admin panel for viewing players and applying moderation actions.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from './Config';
import { encodeEmail, responsiveScale } from './utils';
import soundManager from './SoundManager';

const { width, height } = Dimensions.get('window');
const SCALE = responsiveScale(width, height, 1, 0.78, 1.05);

// These are the quick-ban buttons shown in each player card.
// Example: pressing "Ban 1d" writes `bannedUntil = now + 24h`.
const BAN_OPTIONS = [
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '1d', ms: 24 * 60 * 60 * 1000 },
  { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
];

const AdminPlayerList = () => {
  const navigation = useNavigation();
  // `players`: raw user documents fetched from Firestore.
  // `searchTerm`: text typed into the search box.
  // `filteredPlayers` (below): derived list that matches the search.
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Reads all users from Firestore and stores them in local state.
  // Output: updates `players` and `loading`.
  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, 'Users'));
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() || {}),
      }));
      // Keep the list alphabetic so admins can find users faster.
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setPlayers(data);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial list load on screen mount.
    fetchPlayers();
  }, [fetchPlayers]);

  // Search is done locally to avoid a Firestore request on every keystroke.
  // A player is shown when either name or email contains the typed text.
  const filteredPlayers = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return players;
    return players.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [players, searchTerm]);

  // Converts "last login" from different possible schema fields to readable text.
  // Some old users have `lastLogin`, newer ones may have `lastSeen`, etc.
  const formatLastLogin = (player) => {
    const ts =
      player.lastLogin ||
      player.lastLoginAt ||
      player.lastActive ||
      player.lastSeen ||
      player.lastSignInTime ||
      player.lastSignInAt;

    if (!ts) return 'Last login: unknown';
    const ms = ts?.toMillis ? ts.toMillis() : Number(ts);
    if (!Number.isFinite(ms)) return 'Last login: unknown';
    return `Last login: ${new Date(ms).toLocaleString()}`;
  };

  // Ban flow:
  // 1) choose duration from BAN_OPTIONS
  // 2) write `bannedUntil` timestamp into the user document
  // 3) refresh the list so UI reflects the new status
  const banPlayer = useCallback(async (player, ms) => {
    const docId = encodeEmail(player.email) || player.id;
    const until = Date.now() + ms;
    try {
      await updateDoc(doc(firestore, 'Users', docId), { bannedUntil: until });
      Alert.alert('Player banned', `Banned until ${new Date(until).toLocaleString()}`);
      fetchPlayers();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to ban player');
    }
  }, [fetchPlayers]);

  // Deletes the user document from `Users` collection.
  // Important: this does NOT remove the Firebase Auth account itself.
  const deletePlayer = useCallback(async (player) => {
    const docId = encodeEmail(player.email) || player.id;
    if (!docId) {
      Alert.alert('Error', 'Missing player identifier');
      return;
    }
    try {
      await deleteDoc(doc(firestore, 'Users', docId));
      Alert.alert('Deleted', 'Player record removed.');
      fetchPlayers();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to delete player');
    }
  }, [fetchPlayers]);

  // Builds one player row card: identity, stats, achievements, and action buttons.
  const renderPlayer = ({ item }) => {
    const achievements = item.achievements || {};
    const achievementList = Object.keys(achievements).filter((k) => achievements[k]);
    const bannedUntil = item.bannedUntil ? new Date(item.bannedUntil) : null;
    const isBanned = bannedUntil && bannedUntil.getTime() > Date.now();
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name || 'Unknown'}</Text>
          <Text style={[styles.banStatus, isBanned ? styles.banActive : styles.banNone]}>
            {isBanned ? `Banned until ${bannedUntil.toLocaleString()}` : 'Not banned'}
          </Text>
        </View>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.lastLogin}>{formatLastLogin(item)}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Wins: {item.wins ?? 0}</Text>
          <Text style={styles.stat}>Losses: {item.losses ?? 0}</Text>
          <Text style={styles.stat}>Games: {item.gamesPlayed ?? ((item.wins || 0) + (item.losses || 0))}</Text>
        </View>
        <Text style={styles.achievementsLabel}>Achievements:</Text>
        <View style={styles.achievementsRow}>
          {achievementList.length ? achievementList.map((a) => (
            <View key={a} style={styles.achievementPill}>
              <Text style={styles.achievementText}>{a}</Text>
            </View>
          )) : (
            <Text style={styles.noAchievements}>None</Text>
          )}
        </View>
        <View style={styles.actionsRow}>
          {BAN_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.banBtn}
              onPress={() => banPlayer(item, opt.ms)}
            >
              <Text style={styles.banBtnText}>Ban {opt.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePlayer(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin {'\u00B7'} Players</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { soundManager.playClick(); navigation.navigate('AdminReports'); }}>
          <Text style={styles.refreshText}>View Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPlayers}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          <TextInput
            placeholder="Search by name or email"
            placeholderTextColor="#90a4ae"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
          <FlatList
            data={filteredPlayers}
            keyExtractor={(item) => item.id}
            renderItem={renderPlayer}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1a2a',
    paddingTop: 60 * SCALE,
    paddingHorizontal: 30 * SCALE,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20 * SCALE,
  },
  backBtn: {
    paddingHorizontal: 16 * SCALE,
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
  title: {
    color: '#fff',
    fontSize: 28 * SCALE,
    fontWeight: '900',
  },
  refreshBtn: {
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 10 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#1e88e5',
  },
  refreshText: {
    color: '#fff',
    fontSize: 16 * SCALE,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 40 * SCALE,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
    color: '#fff',
    marginBottom: 14 * SCALE,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14 * SCALE,
    padding: 16 * SCALE,
    marginBottom: 12 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6 * SCALE,
  },
  name: {
    color: '#fff',
    fontSize: 22 * SCALE,
    fontWeight: '800',
  },
  banStatus: {
    fontSize: 14 * SCALE,
  },
  banActive: {
    color: '#ef5350',
    fontWeight: '800',
  },
  banNone: {
    color: '#8bc34a',
    fontWeight: '700',
  },
  email: {
    color: '#cfd8dc',
    marginBottom: 8 * SCALE,
  },
  lastLogin: {
    color: '#b0bec5',
    marginBottom: 6 * SCALE,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12 * SCALE,
    marginBottom: 6 * SCALE,
  },
  stat: {
    color: '#b0bec5',
  },
  achievementsLabel: {
    color: '#90caf9',
    fontWeight: '700',
    marginBottom: 4 * SCALE,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 * SCALE,
    marginBottom: 10 * SCALE,
  },
  achievementPill: {
    backgroundColor: 'rgba(144,202,249,0.2)',
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
    borderRadius: 10 * SCALE,
  },
  achievementText: {
    color: '#e3f2fd',
    fontWeight: '700',
  },
  noAchievements: {
    color: '#78909c',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 * SCALE,
    marginTop: 6 * SCALE,
  },
  banBtn: {
    backgroundColor: '#455a64',
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 12 * SCALE,
    minWidth: 140 * SCALE,
    borderRadius: 12 * SCALE,
  },
  banBtnText: {
    color: '#fff',
    fontSize: 18 * SCALE,
    fontWeight: '800',
  },
  deleteBtn: {
    backgroundColor: '#b71c1c',
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 12 * SCALE,
    minWidth: 140 * SCALE,
    borderRadius: 12 * SCALE,
  },
  deleteText: {
    color: '#fff',
    fontSize: 18 * SCALE,
    fontWeight: '800',
  },
  loading: {
    alignItems: 'center',
    marginTop: 40 * SCALE,
  },
  loadingText: {
    color: '#cfd8dc',
    marginTop: 8 * SCALE,
  },
});

export default AdminPlayerList;

