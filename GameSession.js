import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text } from 'react-native';
import RunningAnimation from './RunningAnimation';
const images = [
  require('./assets/MenuBackGround/background2.png'), // Adjust the path
  require('./assets/MenuBackGround/background3.png'), // Adjust the path
  require('./assets/MenuBackGround/menubackground.png'), // Adjust the path
];

const GameSession = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimationVisible, setIsAnimationVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 1000); // Change image every 1 second

    return () => {
      clearInterval(interval); // Clear interval on unmount
      setIsAnimationVisible(false); // Stop animation when component unmounts
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.image} />
      <RunningAnimation isVisible={isAnimationVisible} />
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
});
export default GameSession; 