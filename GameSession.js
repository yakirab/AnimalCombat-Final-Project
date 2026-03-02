import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, Dimensions, Alert, Platform } from 'react-native';
import { useBackground } from './BackgroundContext';
import { useNavigation } from '@react-navigation/native';
import { authentication, firestore } from './Config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import soundManager from './SoundManager';
import { signOut } from 'firebase/auth';
import { encodeEmail } from './utils';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5; // Use the smaller scale to maintain proportions, increased by 1.5x
const ADMIN_EMAILS = ['yakir.abramovich@gmail.com'];


const formatDuration = (ms) => {
  if (ms <= 0) return 'now';
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const GameSession = () => {
  const { currentIndex } = useBackground();
  const navigation = useNavigation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [bannedUntil, setBannedUntil] = useState(null);
  const [bannedRemaining, setBannedRemaining] = useState(0);

  // Initialize background music when component mounts (only if not on web)
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      soundManager.playBackgroundMusic(false); // false = menu music, not in-game
    }
  }, []);

  // Memoize images array to prevent recreation on every render
  const images = useMemo(() => [
    require('./assets/MenuBackGround/background2.png'),
    require('./assets/MenuBackGround/background3.png'),
    require('./assets/MenuBackGround/menubackground.png'),
  ], []);

  // Load admin flag and ban status
  useEffect(() => {
    const checkUser = async () => {
      const current = authentication.currentUser;
      const email = current?.email || '';
      const encoded = encodeEmail(email);
      const normalizedEmail = email.toLowerCase();
      const isAdminEmail = ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalizedEmail);
      let adminByDoc = false;
      let adminByUserFlag = false;

      // Persist admin to Admins collection for visibility
      if (isAdminEmail && encoded) {
        try {
          await setDoc(doc(firestore, 'Admins', encoded), { email, createdAt: Date.now() }, { merge: true });
        } catch (err) {
          console.warn('Failed to sync admin doc', err);
        }
      }

      if (email) {
        try {
          const [userSnap, adminSnap] = await Promise.all([
            getDoc(doc(firestore, 'Users', encoded)),
            getDoc(doc(firestore, 'Admins', encoded)),
          ]);

          if (userSnap.exists()) {
            const data = userSnap.data();
            adminByUserFlag = !!(data?.isAdmin || data?.role === 'admin');
            const bannedValue = data?.bannedUntil;
            const bannedMs = bannedValue?.toMillis ? bannedValue.toMillis() : bannedValue;
            if (bannedMs) setBannedUntil(bannedMs);
          }

          adminByDoc = adminSnap.exists();
        } catch (err) {
          console.warn('Failed to fetch user doc', err);
        }
      }

      setIsAdmin(isAdminEmail || adminByDoc || adminByUserFlag);
    };
    checkUser();
  }, []);

  // Live countdown for ban timer
  useEffect(() => {
    if (!bannedUntil) return;
    const update = () => setBannedRemaining(Math.max(0, bannedUntil - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [bannedUntil]);

  const handlePlay = useCallback(() => {
    if (bannedUntil && bannedUntil > Date.now()) {
      const remaining = bannedUntil - Date.now();
      Alert.alert('Banned', `You are banned for ${formatDuration(remaining)} (until ${new Date(bannedUntil).toLocaleString()})`);
      return;
    }
    soundManager.playClick();
    navigation.navigate('CharacterChoosing');
  }, [navigation, bannedUntil]);
  const handleSettings = useCallback(() => {
    soundManager.playClick();
    navigation.navigate('Settings');
  }, [navigation]);
  const handleLeaderboard = useCallback(() => {
    soundManager.playClick();
    navigation.navigate('Leaderboard');
  }, [navigation]);
  const handleAdminPanel = useCallback(() => {
    soundManager.playClick();
    navigation.navigate('AdminPlayerList');
  }, [navigation]);
  const handleReportPlayer = useCallback(() => {
    soundManager.playClick();
    if (isAdmin) {
      navigation.navigate('AdminReports');
      return;
    }
    navigation.navigate('ReportPlayer');
  }, [navigation, isAdmin]);
  const handleLogout = useCallback(async () => {
    const user = authentication.currentUser;
    const email = user?.email;
    if (email) {
      const encoded = encodeEmail(email);
      const now = Date.now();
      try {
        await setDoc(doc(firestore, 'Users', encoded), {
          lastLogout: now,
          lastLogoutAt: now,
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to record logout time', err);
      }
    }
    try {
      await signOut(authentication);
    } catch (err) {
      console.warn('Sign out failed', err);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  // Memoize styles for better performance
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    banOverlay: {
      position: 'absolute',
      top: 120 * SCALE,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 50,
      paddingHorizontal: 20 * SCALE,
    },
    banTitle: {
      color: '#ff5555',
      fontSize: 64 * SCALE,
      fontWeight: '900',
      textShadowColor: 'black',
      textShadowOffset: { width: 4 * SCALE, height: 4 * SCALE },
      textShadowRadius: 6 * SCALE,
    },
    banTimer: {
      color: '#ffd166',
      fontSize: 48 * SCALE,
      fontWeight: '800',
      marginTop: 10 * SCALE,
    },
    banUntil: {
      color: '#fff',
      fontSize: 28 * SCALE,
      marginTop: 6 * SCALE,
    },
    buttonContainer: {
      position: 'absolute',
      bottom: 100 * SCALE,
      left: 200 * SCALE,
      right: 200 * SCALE,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20 * SCALE,
      justifyContent: 'center',
    },
    button: {
      backgroundColor: '#800000',
      width: 250 * SCALE,
      height: 100 * SCALE,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    logoutButton: {
      backgroundColor: '#263238',
      width: 250 * SCALE,
      height: 100 * SCALE,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    buttonText: {
      color: 'black',
      fontSize: 48 * SCALE,
      fontWeight: '900',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 2 * SCALE, height: 2 * SCALE },
      textShadowRadius: 3 * SCALE,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCard: {
      width: 900 * SCALE,
      maxWidth: '90%',
      backgroundColor: 'white',
      borderRadius: 16 * SCALE,
      padding: 24 * SCALE,
    },
    modalTitle: {
      fontSize: 36 * SCALE,
      fontWeight: '900',
      marginBottom: 20 * SCALE,
      color: '#2c3e50',
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12 * SCALE,
    },
    label: {
      fontSize: 20 * SCALE,
      fontWeight: '700',
      color: '#2c3e50',
      width: 220 * SCALE,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8 * SCALE,
      paddingHorizontal: 12 * SCALE,
      paddingVertical: 8 * SCALE,
      width: 120 * SCALE,
      fontSize: 20 * SCALE,
      textAlign: 'center',
      backgroundColor: '#f9f9f9',
    },
    sliderTrack: {
      flex: 1,
      height: 20 * SCALE,
      backgroundColor: '#ecf0f1',
      borderRadius: 10 * SCALE,
      overflow: 'hidden',
      marginHorizontal: 12 * SCALE,
    },
    sliderFill: {
      height: '100%',
      backgroundColor: '#27ae60',
    },
    volumeValue: {
      fontSize: 18 * SCALE,
      fontWeight: '700',
      width: 80 * SCALE,
      textAlign: 'right',
      color: '#2c3e50',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16 * SCALE,
      gap: 12 * SCALE,
    },
    actionBtn: {
      paddingVertical: 10 * SCALE,
      paddingHorizontal: 20 * SCALE,
      borderRadius: 10 * SCALE,
    },
    actionBtnText: {
      fontSize: 18 * SCALE,
      fontWeight: '700',
      color: '#2c3e50',
    },
  }), [SCALE]);

  return (
    <View style={dynamicStyles.container}>
      {bannedUntil && bannedUntil > Date.now() && (
        <View style={dynamicStyles.banOverlay}>
          <Text style={dynamicStyles.banTitle}>You are banned!</Text>
          <Text style={dynamicStyles.banTimer}>{formatDuration(bannedRemaining)} remaining</Text>
          <Text style={dynamicStyles.banUntil}>Until: {new Date(bannedUntil).toLocaleString()}</Text>
        </View>
      )}
      <Image source={images[currentIndex % images.length]} style={dynamicStyles.backgroundImage} />
      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity
          style={dynamicStyles.button}
          onPress={handlePlay}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={dynamicStyles.button}
          onPress={handleSettings}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={dynamicStyles.button}
          onPress={handleLeaderboard}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>Leaderboard</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={dynamicStyles.button}
            onPress={handleAdminPanel}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.buttonText}>Admin</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={dynamicStyles.button}
          onPress={handleReportPlayer}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>{isAdmin ? 'Reports' : 'Report Player'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={dynamicStyles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GameSession; 
