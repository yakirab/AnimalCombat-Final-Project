import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, Alert } from 'react-native';
import { db, authentication } from './Config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import RunningAnimation from './RunningAnimation';
import backgroundImages from './backgroundImages';
import { useBackground } from './BackgroundContext';

const images = [
  require('./assets/MenuBackGround/background2.png'),
  require('./assets/MenuBackGround/background3.png'),
  require('./assets/MenuBackGround/menubackground.png'),
];

const GameSession = ({ navigation }) => {
  const { currentIndex: bgIndex } = useBackground();
  const [gameImageIndex, setGameImageIndex] = useState(0);
  const [isAnimationVisible, setIsAnimationVisible] = useState(true);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userScore, setUserScore] = useState(0);

  useEffect(() => {
    fetchUserProfile();

    const interval = setInterval(() => {
      setGameImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 1000);

    return () => {
      clearInterval(interval);
      setIsAnimationVisible(false);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const currentUser = authentication.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || data.name || 'Player');
        setIsAdmin(data.isAdmin || false);
        setUserScore(data.score || 0);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(authentication);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Image source={images[gameImageIndex]} style={styles.image} />
      <RunningAnimation isVisible={isAnimationVisible} />

      {/* Username & Score Display */}
      <View style={styles.userInfoBar}>
        <Text style={styles.usernameText}>👤 {username}</Text>
        <Text style={styles.scoreText}>⭐ {userScore}</Text>
      </View>

      {/* Menu Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.leaderboardButton]}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={styles.buttonText}>🏆 Leaderboard</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.button, styles.adminButton]}
            onPress={() => navigation.navigate('AdminPanel')}
          >
            <Text style={styles.buttonText}>👑 Admin</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userInfoBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  usernameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scoreText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 15,
  },
  button: {
    backgroundColor: '#800000',
    minWidth: 180,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  leaderboardButton: {
    backgroundColor: '#1B5E20',
  },
  adminButton: {
    backgroundColor: '#4A148C',
  },
  logoutButton: {
    backgroundColor: '#B71C1C',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default GameSession;
