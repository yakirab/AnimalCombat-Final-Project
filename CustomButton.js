import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import soundManager from './SoundManager';

const CustomButton = ({ title, onPress }) => {
  const handlePress = () => {
    soundManager.playClick();
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');
// Use a simple scale to make buttons comfortably large on all screens
const BASE_WIDTH = 390;
const SCALE = Math.max(1, Math.min(1.6, width / BASE_WIDTH));

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 28 * SCALE,
    paddingVertical: 16 * SCALE,
    paddingHorizontal: 32 * SCALE,
    minWidth: 240 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12 * SCALE,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.28,
    shadowRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20 * SCALE,
    fontWeight: '900',
  },
});

export default CustomButton; 
