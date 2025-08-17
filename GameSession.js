import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useBackground } from './BackgroundContext';
import { useNavigation } from '@react-navigation/native';
import soundManager from './SoundManager';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5; // Use the smaller scale to maintain proportions, increased by 1.5x

const GameSession = () => {
  const { currentIndex } = useBackground();
  const navigation = useNavigation();

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

  const handlePlay = useCallback(() => {
    soundManager.playClick();
    navigation.navigate('CharacterChoosing');
  }, [navigation]);
  const handleSettings = useCallback(() => {
    soundManager.playClick();
    navigation.navigate('Settings');
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
    buttonContainer: {
      position: 'absolute',
      bottom: 100 * SCALE,
      left: 500 * SCALE,
      right: 0,
      alignItems: 'flex-start',
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
          style={[dynamicStyles.button, { position: 'absolute', right: 500 * SCALE, backgroundColor: '#800000' }]}
          onPress={handleSettings}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GameSession; 