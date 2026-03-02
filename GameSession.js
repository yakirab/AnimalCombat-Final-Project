import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, Keyboard, BackHandler, TextInput } from 'react-native';
import RunningAnimation from './RunningAnimation';
const images = [
  require('./assets/MenuBackGround/background2.png'), // Adjust the path
  require('./assets/MenuBackGround/background3.png'), // Adjust the path
  require('./assets/MenuBackGround/menubackground.png'), // Adjust the path
];

const GameSession = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimationVisible, setIsAnimationVisible] = useState(true);
  const keyboardShownRef = useRef(false);
  const textInputRef = useRef(null);

  useEffect(() => {
    // Show keyboard for player input on mount
    Keyboard.dismiss();

    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 1000); // Change image every 1 second

    return () => {
      clearInterval(interval); // Clear interval on unmount
      setIsAnimationVisible(false); // Stop animation when component unmounts
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleKeyboardShow = () => {
    keyboardShownRef.current = true;
  };

  const handleKeyboardHide = () => {
    keyboardShownRef.current = false;
  };

  const handleKeyPress = (event) => {
    // Handle arrow keys or game controls
    const { key } = event;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      // Handle up movement
      console.log('Up pressed');
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      // Handle down movement
      console.log('Down pressed');
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      // Handle left movement
      console.log('Left pressed');
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      // Handle right movement
      console.log('Right pressed');
    } else if (key === ' ') {
      // Handle space for jump/attack
      console.log('Space pressed');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.image} />
      <RunningAnimation isVisible={isAnimationVisible} />
      <TextInput
        ref={textInputRef}
        style={styles.hiddenInput}
        onKeyPress={handleKeyPress}
        autoFocus
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Settings</Text>
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
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row', // Changed to row for horizontal layout
    justifyContent: 'center', // Center the buttons container
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#800000', // Changed to burgundy
    width: 250, // Made buttons wider
    height: 100, // Made buttons taller
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20, // Space between buttons horizontally
    borderRadius: 0, // Square corners
  },
  buttonText: {
    color: 'black',
    fontSize: 48, // Increased from 36 to 48
    fontWeight: '900', // Changed from 'bold' to '900' for maximum boldness
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Add shadow for more emphasis
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});
export default GameSession; 