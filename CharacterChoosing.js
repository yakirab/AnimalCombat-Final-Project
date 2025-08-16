import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { useBackground } from './BackgroundContext';
import { authentication, database, firestore } from './Config';
import soundManager from './SoundManager';
import { useNavigation } from '@react-navigation/native';
import { ref, push, set, onValue, off, get, update, child, serverTimestamp, remove, onDisconnect } from "firebase/database";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.8; // Use the smaller scale to maintain proportions, increased by 1.8x

// Memoize static assets to prevent recreation
const BACKGROUND_IMAGES = [
  require('./assets/MenuBackGround/background/bg1.png'),
  require('./assets/MenuBackGround/background/bg2.png'),
  require('./assets/MenuBackGround/background/bg3.png'),
  require('./assets/MenuBackGround/background/bg4.png'),
  require('./assets/MenuBackGround/background/bg5.png'),
  require('./assets/MenuBackGround/background/bg6.png'),
  require('./assets/MenuBackGround/background/bg7.png'),
  require('./assets/MenuBackGround/background/bg8.png'),
  require('./assets/MenuBackGround/background/bg9.png'),
  require('./assets/MenuBackGround/background/bg10.png'),
  require('./assets/MenuBackGround/background/bg11.png'),
  require('./assets/MenuBackGround/background/bg12.png'),
  require('./assets/MenuBackGround/background/bg13.png'),
  require('./assets/MenuBackGround/background/bg132.png'),
  require('./assets/MenuBackGround/background/bg133.png'),
  require('./assets/MenuBackGround/background/bg14.png'),
  require('./assets/MenuBackGround/background/bg15.png'),
  require('./assets/MenuBackGround/background/bg16.png'),
  require('./assets/MenuBackGround/background/bg17.png'),
  require('./assets/MenuBackGround/background/bg18.png'),
  require('./assets/MenuBackGround/background/bg19.png'),
  require('./assets/MenuBackGround/background/bg20.png'),
  require('./assets/MenuBackGround/background/bg21.png'),
  require('./assets/MenuBackGround/background/bg22.png'),
  require('./assets/MenuBackGround/background/bg23.png'),
  require('./assets/MenuBackGround/background/bg24.png'),
  require('./assets/MenuBackGround/background/bg25.png'),
  require('./assets/MenuBackGround/background/bg26.png'),
  require('./assets/MenuBackGround/background/bg27.png'),
  require('./assets/MenuBackGround/background/bg28.png'),
  require('./assets/MenuBackGround/background/bg29.png'),
  require('./assets/MenuBackGround/background/bg30.png'),
  require('./assets/MenuBackGround/background/bg31.png'),
  require('./assets/MenuBackGround/background/bg32.png'),
  require('./assets/MenuBackGround/background/bg33.png'),
  require('./assets/MenuBackGround/background/bg34.png'),
  require('./assets/MenuBackGround/background/bg35.png'),
  require('./assets/MenuBackGround/background/bg36.png'),
  require('./assets/MenuBackGround/background/bg37.png')
];

const CHARACTERS = [
  { id: 1, name: 'Cow', image: require('./assets/characters/cow head.png') },
  { id: 2, name: 'Tiger', image: require('./assets/characters/head.png') },
  { id: 3, name: 'Chameleon', image: require('./assets/characters/chameleon head.png') },
];

// Chameleon animation frames from /assets/animations
const chamFrames = [
  require('./assets/animations/cham0.png'),
  require('./assets/animations/Cham1.png'),
  require('./assets/animations/Cham2.png'),
  require('./assets/animations/Cham3.png'),
  require('./assets/animations/Cham4.png'),
  require('./assets/animations/Cham5.png'),
  require('./assets/animations/Cham6.png'),
  require('./assets/animations/Cham7.png'),
  require('./assets/animations/Cham8.png'),
  require('./assets/animations/Cham9.png'),
  require('./assets/animations/Cham10.png'),
];
const chamIdle = require('./assets/animations/idle.png');
const chamWalk = require('./assets/animations/walk1.png');

// Tiger animation frames from /assets/animations
const tigerEntryFrames = [
  require('./assets/animations/tiger1.png'),
  require('./assets/animations/tiger2.png'),
  require('./assets/animations/tiger3.png'),
];
const tigerCycleFrames = [
  require('./assets/animations/tiger5.png'),
  require('./assets/animations/tiger6.png'),
  require('./assets/animations/tiger7.png'),
];
const tigerIdleFrames = [
  require('./assets/animations/idle1.png'),
  require('./assets/animations/idle2.png'),
];
const tigerBonusFrames = [
  require('./assets/animations/tigerbonus.png'),
  require('./assets/animations/tigerbonus2.png'),
  require('./assets/animations/tigerbonus3.png'),
  require('./assets/animations/tigerbonus2.png'), // Repeat bonus2
];

const cowFrames = [
  require('./assets/animations/cow1.png'),
  require('./assets/animations/cow2.png'),
  require('./assets/animations/cow3.png'),
  require('./assets/animations/cow4.png'),
  require('./assets/animations/cow5.png'),
  require('./assets/animations/cow6.png'),
  require('./assets/animations/cow7.png'),
  require('./assets/animations/cow8.png'),
  require('./assets/animations/cow9.png'),
  require('./assets/animations/cow10.png'),
  require('./assets/animations/cow11.png'),
  require('./assets/animations/cow12.png'),
  require('./assets/animations/cow13.png'),
  require('./assets/animations/cow14.png'),
  require('./assets/animations/cow15.png'),
  require('./assets/animations/cow16.png'),
  require('./assets/animations/cow17.png'),
  require('./assets/animations/cow18.png'),
  require('./assets/animations/cow19.png'),
  require('./assets/animations/cow20.png'),
  require('./assets/animations/cow21.png'),
  require('./assets/animations/cow22.png'),
];

const getDisplayName = (user) => {
  return user.displayName || user.name || user.email.split("@")[0] || "Unknown User";
};

const encodeEmail = (email) => email.replace(/\./g, ',');

const getNameFromFirestore = async (user) => {
  try {
    const userDoc = await getDoc(doc(firestore, "Users", encodeEmail(user.email)));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.name || "Unknown User";
    }
    return "Unknown User";
  } catch (error) {
    return "Unknown User";
  }
};

const CharacterChoosing = () => {
  const { currentIndex } = useBackground();
  const navigation = useNavigation();
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [gameRoom, setGameRoom] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [showChameleonAnimation, setShowChameleonAnimation] = useState(false);
  const [chamFrame, setChamFrame] = useState(10); // Start at last frame for reverse
  const [chamPhase, setChamPhase] = useState(1); // Start with fast reverse phase
  const [idleWalkToggle, setIdleWalkToggle] = useState(true);
  const [looping, setLooping] = useState(true);
  const [waitingForLoop, setWaitingForLoop] = useState(false);
  const [showTigerAnimation, setShowTigerAnimation] = useState(false);
  const [tigerPhase, setTigerPhase] = useState(0); // 0: idle, 1: entry1, 2: entry2, 3: entry3, 4: entryCycle, 5: loopIdle, 6: loopBonus
  const [tigerImageSource, setTigerImageSource] = useState(null);
  const [tigerLoopCounter, setTigerLoopCounter] = useState(0); // For cycling/looping frames
  const [tigerElapsedTime, setTigerElapsedTime] = useState(0); // For timed phases
  const [showCowAnimation, setShowCowAnimation] = useState(false);
  const [cowFrameIndex, setCowFrameIndex] = useState(0);
  const [cowPhase, setCowPhase] = useState(0);
  const [openRooms, setOpenRooms] = useState([]);
  const [unlocked, setUnlocked] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [titles, setTitles] = useState([]);

  useEffect(() => {
    // Load unlocked characters and selected title
    const loadProgress = async () => {
      try {
        const me = authentication.currentUser;
        if (me?.email) {
          const encodeEmail = (email) => email.replace(/\./g, ',');
          const snap = await getDoc(doc(firestore, 'Users', encodeEmail(me.email)));
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.unlockedCharacters)) setUnlocked(data.unlockedCharacters);
            if (data?.selectedTitle) setSelectedTitle(data.selectedTitle);
            if (Array.isArray(data?.titles)) setTitles(data.titles);
          }
        }
      } catch {}
    };
    loadProgress();
    // Clean up listeners when component unmounts
    return () => {
      if (gameRoom) {
        // Remove the listener
        off(ref(database, `gameRooms/${gameRoom}`), 'value');
        // Remove the room if it's still in waiting status
        get(ref(database, `gameRooms/${gameRoom}`)).then(snapshot => {
          const data = snapshot.val();
          if (data && data.status === 'waiting') {
            remove(ref(database, `gameRooms/${gameRoom}`));
          }
        });
      }
    };
  }, [gameRoom]);

  // Chameleon animation effect
  useEffect(() => {
    let timeout;
    if (!showChameleonAnimation) return;

    // Animation state machine
    if (chamPhase === 1) {
      // cham10 to cham0, 0.5s total (about 50ms per frame)
      if (chamFrame > 0) {
        timeout = setTimeout(() => setChamFrame(chamFrame - 1), 50);
      } else {
        setChamPhase(3); // Go directly to hold cham0
      }
    } else if (chamPhase === 3) {
      // cham0, hold for 230ms
      timeout = setTimeout(() => setChamPhase(4), 230);
    } else if (chamPhase === 4) {
      // idle.png, hold for 100ms
      timeout = setTimeout(() => setChamPhase(5), 100);
    } else if (chamPhase === 5) {
      // idle/walk1 alternate every 0.5s for 6s
      let elapsed = 0;
      let toggle = true;
      function alternate() {
        if (elapsed >= 6000) {
          setChamPhase(6);
          setChamFrame(0);
          return;
        }
        setIdleWalkToggle(toggle);
        toggle = !toggle;
        elapsed += 500;
        timeout = setTimeout(alternate, 500);
      }
      alternate();
    } else if (chamPhase === 6) {
      // cham0 to cham10, 100ms per frame
      if (chamFrame < 10) {
        timeout = setTimeout(() => setChamFrame(chamFrame + 1), 100);
      } else {
        // Add a 2-second delay before restarting the loop
        setWaitingForLoop(true);
        timeout = setTimeout(() => {
          setWaitingForLoop(false);
          setChamPhase(1);
          setChamFrame(10);
        }, 2000);
      }
    }
    return () => clearTimeout(timeout);
  }, [showChameleonAnimation, chamPhase, chamFrame]);

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setShowChameleonAnimation(false); // Stop chameleon by default
    setShowTigerAnimation(false);   // Stop tiger by default
    setShowCowAnimation(false);     // Hide cow by default
    setLooping(false); // Stop chameleon loop if it was running

    if (character.name === 'Chameleon') {
      setShowChameleonAnimation(true);
      setChamPhase(1); // Reset chameleon to start
      setChamFrame(10);
      setLooping(true);
    } else if (character.name === 'Tiger') {
      setShowTigerAnimation(true);
      setTigerPhase(1); // Start tiger animation
      setTigerImageSource(tigerEntryFrames[0]); // Set initial frame
      setTigerLoopCounter(0);
      setTigerElapsedTime(0);
    } else if (character.name === 'Cow') {
      setShowCowAnimation(true);
      setCowPhase(0);
      setCowFrameIndex(0);
    }
  };

  const createGameRoom = async () => {
    try {
      const user = authentication.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a game room');
        return;
      }

      if (!selectedCharacter) {
        Alert.alert('Error', 'Please select a character first');
        return;
      }

      // Prevent selecting a locked character
      if (unlocked.length > 0 && !unlocked.includes(selectedCharacter.name)) {
        Alert.alert('Locked Character', 'This character is locked. Unlock it first to play.');
        return;
      }

      // Fetch name from Realtime Database
      const name = await getNameFromFirestore(user);

      // Create a new game room
      const gameRoomRef = push(ref(database, 'gameRooms'));
      const gameRoomId = gameRoomRef.key;

      // Set initial game room data
      await set(gameRoomRef, {
        name: name, // <--- This is the room name shown in the list
        player1: {
          id: user.uid,
          email: user.email,
          name: name, // <--- This is the player's name in the room
          character: selectedCharacter,
          position: { x: 100, y: 100 },
          ready: true
        },
        status: 'waiting',
        createdAt: serverTimestamp()
      });

      // Automatically remove the room if the user disconnects
      onDisconnect(gameRoomRef).remove();

      setGameRoom(gameRoomId);
      setIsWaiting(true);

      // Listen for opponent joining
      onValue(ref(database, `gameRooms/${gameRoomId}`), (snapshot) => {
        const data = snapshot.val();
        if (data && data.player2) {
          setOpponent(data.player2);
          setIsWaiting(false);
          // Navigate to game screen when opponent joins
          navigation.navigate('Game', { 
            gameRoomId,
            playerNumber: 1,
            character: selectedCharacter,
            opponent: data.player2
          });
        }
      });
    } catch (error) {
      console.error('Error creating game room:', error);
      Alert.alert('Error', 'Failed to create game room');
    }
  };

  const joinGameRoom = async (roomId) => {
    try {
      const user = authentication.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to join a game room');
        return;
      }

      if (!selectedCharacter) {
        Alert.alert('Error', 'Please select a character first');
        return;
      }

      // Prevent selecting a locked character
      if (unlocked.length > 0 && !unlocked.includes(selectedCharacter.name)) {
        Alert.alert('Locked Character', 'This character is locked. Unlock it first to play.');
        return;
      }

      const gameRoomRef = ref(database, `gameRooms/${roomId}`);
      
      // Check if room exists and has space
      const snapshot = await get(gameRoomRef);
      const data = snapshot.val();
      
      if (!data) {
        Alert.alert('Error', 'Game room not found');
        return;
      }

      if (data.player2) {
        Alert.alert('Error', 'Game room is full');
        return;
      }

      // Prevent user from joining their own room
      if (data.player1 && data.player1.id === user.uid) {
        Alert.alert('Error', 'You cannot join your own game room.');
        return;
      }

      // Join the game room
      await update(gameRoomRef, {
        player2: {
          id: user.uid,
          email: user.email,
          character: selectedCharacter,
          position: { x: 500, y: 100 },
          ready: true
        },
        status: 'playing'
      });

      setGameRoom(roomId);
      setOpponent(data.player1);

      // Navigate to game screen
      navigation.navigate('Game', { 
        gameRoomId: roomId,
        playerNumber: 2,
        character: selectedCharacter,
        opponent: data.player1
      });
    } catch (error) {
      console.error('Error joining game room:', error);
      Alert.alert('Error', 'Failed to join game room');
    }
  };

  // Tiger animation effect
  useEffect(() => {
    let timeout;
    let interval; // Use interval for cycling animations
    if (!showTigerAnimation) return;

    if (tigerPhase === 1) { // Show tiger1
      setTigerImageSource(tigerEntryFrames[0]);
      timeout = setTimeout(() => setTigerPhase(2), 200);
    } else if (tigerPhase === 2) { // Show tiger2
      setTigerImageSource(tigerEntryFrames[1]);
      timeout = setTimeout(() => setTigerPhase(3), 100);
    } else if (tigerPhase === 3) { // Show tiger3, then start cycle
      setTigerImageSource(tigerEntryFrames[2]);
      setTigerPhase(4);
      setTigerLoopCounter(0);
      setTigerElapsedTime(0);
    } else if (tigerPhase === 4) { // Cycle tiger5, 6, 7 for 1.5s
      let cycleFrame = 0;
      let elapsed = 0;
      setTigerImageSource(tigerCycleFrames[cycleFrame]);
      interval = setInterval(() => {
        elapsed += 50;
        if (elapsed >= 1500) {
          clearInterval(interval);
          setTigerPhase(5); // Move to loopIdle
          setTigerLoopCounter(0);
          setTigerElapsedTime(0);
          return;
        }
        cycleFrame = (cycleFrame + 1) % tigerCycleFrames.length;
        setTigerImageSource(tigerCycleFrames[cycleFrame]);
      }, 50);
    } else if (tigerPhase === 5) { // Loop idle1, idle2 for 5s
      let idleFrame = 0;
      let elapsed = 0;
      setTigerImageSource(tigerIdleFrames[idleFrame]);
      interval = setInterval(() => {
        elapsed += 300;
        if (elapsed >= 5000) {
          clearInterval(interval);
          setTigerPhase(6); // Move to loopBonus
          setTigerLoopCounter(0);
          setTigerElapsedTime(0);
          return;
        }
        idleFrame = (idleFrame + 1) % tigerIdleFrames.length;
        setTigerImageSource(tigerIdleFrames[idleFrame]);
      }, 300);
    } else if (tigerPhase === 6) { // Loop bonus frames for 1s (total 4 frames * 150ms = 600ms needed)
      let bonusFrame = 0;
      let elapsed = 0;
      setTigerImageSource(tigerBonusFrames[bonusFrame]);
      interval = setInterval(() => {
        elapsed += 150;
         bonusFrame++;
        if (elapsed >= 600 || bonusFrame >= tigerBonusFrames.length) { // Loop ends after 4 frames
          clearInterval(interval);
          setTigerPhase(5); // Go back to loopIdle
          setTigerLoopCounter(0);
          setTigerElapsedTime(0);
          return;
        }
        setTigerImageSource(tigerBonusFrames[bonusFrame]);
      }, 150);
    }

    // Cleanup function
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [showTigerAnimation, tigerPhase]); // Rerun effect when phase changes

  useEffect(() => {
    if (!showCowAnimation) return;
    let timeout;

    // Animation phases as described
    if (cowPhase === 0) {
      // cow1-cow5, 500ms total, equal delta
      let frames = [0,1,2,3,4];
      let delta = 500 / frames.length;
      let i = 0;
      function next() {
        setCowFrameIndex(frames[i]);
        i++;
        if (i < frames.length) {
          timeout = setTimeout(next, delta);
        } else {
          setCowPhase(1);
        }
      }
      next();
    } else if (cowPhase === 1) {
      setCowFrameIndex(5); // cow6
      timeout = setTimeout(() => setCowPhase(2), 350);
    } else if (cowPhase === 2) {
      setCowFrameIndex(6); // cow7
      timeout = setTimeout(() => setCowPhase(3), 400);
    } else if (cowPhase === 3) {
      setCowFrameIndex(7); // cow8
      timeout = setTimeout(() => setCowPhase(4), 400);
    } else if (cowPhase === 4) {
      setCowFrameIndex(8); // cow9
      timeout = setTimeout(() => setCowPhase(5), 400);
    } else if (cowPhase === 5) {
      // cow10-cow16, 500ms total, equal delta
      let frames = [9,10,11,12,13,14,15];
      let delta = 500 / frames.length;
      let i = 0;
      function next() {
        setCowFrameIndex(frames[i]);
        i++;
        if (i < frames.length) {
          timeout = setTimeout(next, delta);
        } else {
          setCowPhase(6);
        }
      }
      next();
    } else if (cowPhase === 6) {
      // cow17-cow18 alternate every 200ms for 5s
      let frames = [16,17];
      let elapsed = 0;
      let i = 0;
      function alternate() {
        setCowFrameIndex(frames[i % 2]);
        i++;
        elapsed += 200;
        if (elapsed < 5000) {
          timeout = setTimeout(alternate, 200);
        } else {
          setCowPhase(7);
        }
      }
      alternate();
    } else if (cowPhase === 7) {
      // cow16-cow22, 1s total, equal delta
      let frames = [15,18,19,20,21];
      let delta = 1000 / frames.length;
      let i = 0;
      function next() {
        setCowFrameIndex(frames[i]);
        i++;
        if (i < frames.length) {
          timeout = setTimeout(next, delta);
        } else {
          setCowPhase(0); // Loop back to start
        }
      }
      next();
    }

    return () => clearTimeout(timeout);
  }, [showCowAnimation, cowPhase]);

  useEffect(() => {
    const roomsRef = ref(database, 'gameRooms');
    const handleRooms = (snapshot) => {
      const rooms = [];
      snapshot.forEach(child => {
        const val = child.val();
        if (val.status === 'waiting') {
          rooms.push({ id: child.key, ...val });
        }
      });
      setOpenRooms(rooms);
    };
    onValue(roomsRef, handleRooms);
    return () => off(roomsRef, 'value', handleRooms);
  }, []);

  const handleSelectTitle = async (title) => {
    try {
      const me = authentication.currentUser;
      if (!me?.email) return;
      const encodeEmail = (email) => email.replace(/\./g, ',');
      await updateDoc(doc(firestore, 'Users', encodeEmail(me.email)), { selectedTitle: title });
      setSelectedTitle(title);
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => {
        soundManager.playClick();
        navigation.navigate('GameSession');
      }}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>
      <Image source={BACKGROUND_IMAGES[currentIndex]} style={styles.backgroundImage} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Choose Your Character</Text>
        
        <View style={styles.charactersContainer}>
          {CHARACTERS.map((character) => {
            const isLocked = unlocked.length > 0 && !unlocked.includes(character.name);
            return (
            <TouchableOpacity
              key={character.id}
              style={[
                styles.characterButton,
                selectedCharacter?.id === character.id && styles.selectedCharacter
              ]}
              onPress={() => {
                if (!isLocked) {
                  soundManager.playClick();
                  handleCharacterSelect(character);
                }
              }}
              disabled={isLocked}
            >
              <Image source={character.image} style={styles.characterImage} />
              <Text style={styles.characterName}>
                {character.name}{isLocked ? ' (Locked)' : ''}
              </Text>
            </TouchableOpacity>
          );})}
        </View>

        {/* Chameleon Animation Render */}
        {showChameleonAnimation && (
          <View style={{ position: 'absolute', top: -50 * SCALE, right: 200 * SCALE }}>
            {(chamPhase === 1 || chamPhase === 3) ? (
              <Image source={chamFrames[chamFrame]} style={{ width: 400 * SCALE, height: 800 * SCALE, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
            ) : chamPhase === 4 ? (
              <Image source={chamIdle} style={{ width: 400 * SCALE, height: 800 * SCALE, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
            ) : chamPhase === 5 ? (
              idleWalkToggle ? (
                <Image
                  source={chamIdle}
                  style={{ width: 400 * SCALE, height: 800 * SCALE, transform: [{ scaleX: -1 }] }}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={chamWalk}
                  style={{ width: 440 * SCALE, height: 880 * SCALE, transform: [{ scaleX: -1 }] }}
                  resizeMode="contain"
                />
              )
            ) : chamPhase === 6 ? (
              <Image source={chamFrames[chamFrame]} style={{ width: 400 * SCALE, height: 800 * SCALE, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
            ) : waitingForLoop ? (
              <Image source={chamFrames[10]} style={{ width: 400 * SCALE, height: 800 * SCALE, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
            ) : null}
          </View>
        )}

        {/* Tiger Animation Render */}
        {showTigerAnimation && tigerImageSource && (
          <View style={{ position: 'absolute', top: -300 * SCALE, right: 350 * SCALE, width: 400 * SCALE, height: 800 * SCALE }}>
            <Image
              source={tigerImageSource}
              style={{ width: '150%', height: '150%', transform: [{ scaleX: -1 }] }}
              resizeMode="contain"
            />
          </View>
        )}

        {showCowAnimation && (
          <View style={{ position: 'absolute', top: -300 * SCALE, right: 350 * SCALE, width: 400 * SCALE, height: 800 * SCALE }}>
            <Image
              source={cowFrames[cowFrameIndex]}
              style={{ width: '150%', height: '150%', transform: [{ scaleX: -1 }] }}
              resizeMode="contain"
            />
          </View>
        )}

        {selectedCharacter && (
          <View style={styles.actionsContainer}>
            {selectedTitle && (
              <Text style={styles.titleDisplayText}>Current Title: {selectedTitle}</Text>
            )}
            
            {/* Title Selection - Always show, even if no titles earned yet */}
            <View style={styles.titleSectionContainer}>
              <Text style={styles.titleSectionHeader}>Choose Your Title:</Text>
              {titles.length > 0 ? (
                <View style={styles.titleButtonsContainer}>
                  <TouchableOpacity 
                    onPress={() => {
                      soundManager.playClick();
                      handleSelectTitle(null);
                    }} 
                    style={[styles.titleButton, !selectedTitle && styles.titleButtonSelected]}
                  >
                    <Text style={[styles.titleButtonText, !selectedTitle && styles.titleButtonTextSelected]}>None</Text>
                  </TouchableOpacity>
                  {titles.map(t => (
                    <View key={t} style={{ alignItems: 'center', margin: 4 }}>
                      <TouchableOpacity 
                        onPress={() => {
                          soundManager.playClick();
                          handleSelectTitle(t);
                        }} 
                        style={[styles.titleButton, selectedTitle === t && styles.titleButtonSelected]}
                      >
                        <Text style={[styles.titleButtonText, selectedTitle === t && styles.titleButtonTextSelected]}>{t}</Text>
                      </TouchableOpacity>
                      <Text style={styles.titleHintText}>
                        {t === 'Obvious Liar' ? 'Have age >100 or <1.5 years' :
                         t === 'Did the Impossible' ? 'Win vs someone ≥200 years older' :
                         t === 'Spammer' ? 'Win using only 1 move type' :
                         t === 'Winner' ? 'Win rate ≥ 60%' :
                         t === 'Master' ? 'Unlock all achievements' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noTitlesText}>
                  No titles earned yet. Win games and unlock achievements to earn titles!
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                soundManager.playClick();
                createGameRoom();
              }}
              disabled={isWaiting}
            >
              <Text style={styles.buttonText}>
                {isWaiting ? 'Waiting for opponent...' : 'Create Game Room'}
              </Text>
            </TouchableOpacity>

            <View style={styles.roomsList}>
              <Text style={styles.roomsTitle}>Open Game Rooms</Text>
              {openRooms.length === 0 && <Text>No open rooms</Text>}
              {openRooms.map(room => (
            <TouchableOpacity
                  key={room.id}
                  style={styles.roomItem}
                  onPress={() => {
                    soundManager.playClick();
                    joinGameRoom(room.id);
                  }}
            >
                  <Text style={styles.roomName}>{room.name}</Text>
            </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 40 * SCALE,
    left: 20 * SCALE,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 8 * SCALE,
    paddingHorizontal: 16 * SCALE,
    borderRadius: 8 * SCALE,
  },
  backButtonText: {
    fontSize: 18 * SCALE,
    color: '#333',
    fontWeight: 'bold',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20 * SCALE,
  },
  title: {
    fontSize: 32 * SCALE,
    fontWeight: 'bold',
    marginBottom: 30 * SCALE,
    color: '#333',
  },
  charactersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 30 * SCALE,
  },
  characterButton: {
    alignItems: 'center',
    margin: 10 * SCALE,
    padding: 10 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  selectedCharacter: {
    borderWidth: 3 * SCALE,
    borderColor: '#4CAF50',
  },
  characterImage: {
    width: 100 * SCALE,
    height: 100 * SCALE,
    marginBottom: 10 * SCALE,
  },
  characterName: {
    fontSize: 16 * SCALE,
    fontWeight: 'bold',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15 * SCALE,
    borderRadius: 10 * SCALE,
    marginVertical: 10 * SCALE,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18 * SCALE,
    fontWeight: 'bold',
  },
  roomsList: {
    width: '100%',
    marginTop: 20 * SCALE,
    padding: 10 * SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10 * SCALE,
    borderWidth: 1 * SCALE,
    borderColor: '#ccc',
  },
  roomsTitle: {
    fontSize: 20 * SCALE,
    fontWeight: 'bold',
    marginBottom: 10 * SCALE,
    color: '#333',
  },
  roomItem: {
    paddingVertical: 10 * SCALE,
    paddingHorizontal: 15 * SCALE,
    borderBottomWidth: 1 * SCALE,
    borderBottomColor: '#eee',
  },
  roomName: {
    fontSize: 16 * SCALE,
    color: '#555',
  },
  titleDisplayText: {
    marginBottom: 8 * SCALE,
    fontWeight: 'bold',
    fontSize: 16 * SCALE,
    color: '#333',
    textAlign: 'center',
  },
  titleSectionContainer: {
    marginBottom: 12 * SCALE,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12 * SCALE,
    borderRadius: 10 * SCALE,
    borderWidth: 1 * SCALE,
    borderColor: '#ddd',
  },
  titleSectionHeader: {
    marginBottom: 8 * SCALE,
    fontSize: 16 * SCALE,
    fontWeight: 'bold',
    color: '#333',
  },
  titleButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  titleButton: {
    padding: 8 * SCALE,
    margin: 4 * SCALE,
    backgroundColor: '#eee',
    borderRadius: 8 * SCALE,
    minWidth: 60 * SCALE,
    alignItems: 'center',
  },
  titleButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  titleButtonText: {
    color: '#000',
    fontSize: 14 * SCALE,
    fontWeight: '500',
  },
  titleButtonTextSelected: {
    color: '#fff',
  },
  noTitlesText: {
    fontSize: 14 * SCALE,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10 * SCALE,
  },
  titleHintText: {
    fontSize: 12 * SCALE,
    color: '#555',
    marginTop: 4 * SCALE,
  },
});

export default CharacterChoosing; 