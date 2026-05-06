// File Overview: CustomButton.js
// What this file is: Reusable button component with shared styling behavior.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import soundManager from './SoundManager';
import { responsiveScale } from './utils';

const CustomButton = ({ title, onPress, disabled = false, style, textStyle }) => {
  const handlePress = () => {
    if (disabled) return;
    soundManager.playClick();
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.82}
    >
      <Text style={[styles.buttonText, textStyle]} numberOfLines={2} adjustsFontSizeToFit>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const { width, height } = Dimensions.get('window');
const SCALE = responsiveScale(width, height, 1, 0.85, 1.1);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 14 * SCALE,
    paddingVertical: 12 * SCALE,
    paddingHorizontal: 22 * SCALE,
    minWidth: 180 * SCALE,
    maxWidth: 360 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 8 * SCALE,
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
    fontSize: 18 * SCALE,
    fontWeight: '900',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
});

export default CustomButton; 

