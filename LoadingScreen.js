// File Overview: LoadingScreen.js
// What this file is: Temporary loading screen shown while data/assets are preparing.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import RunningAnimation from './RunningAnimation';
import { responsiveScale } from './utils';

const { width, height } = Dimensions.get('window');
const SCALE = responsiveScale(width, height, 1, 0.78, 1.05);

const LoadingScreen = () => {
  const [dots, setDots] = useState('.');
  
  // Optimized dots updater
  const updateDots = useCallback(() => {
    setDots(prev => {
      if (prev === '...') return '.';
      return prev + '.';
    });
  }, []);
  
  useEffect(() => {
    // Animate dots - faster animation
    const dotsInterval = setInterval(updateDots, 300); // Faster dots

    return () => {
      clearInterval(dotsInterval);
    };
  }, [updateDots]);

  // Memoize styles for better performance
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#4CAF50',
      zIndex: 0,
      position: 'relative',
    },
    loadingText: {
      fontSize: 64 * SCALE, // Increased font size
      color: '#800000',
      fontWeight: 'bold',
      marginBottom: 150 * SCALE, // Increased margin
      zIndex: 1,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
    progressBar: {
      width: width * 0.8,
      height: 20 * SCALE,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 10 * SCALE,
      marginTop: 50 * SCALE,
      zIndex: 1,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#800000',
      borderRadius: 10 * SCALE,
      width: '0%', // Will be animated
    },
  }), [SCALE]);

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.loadingText}>Loading{dots}</Text>
      <View style={dynamicStyles.progressBar}>
        <View style={dynamicStyles.progressFill} />
      </View>
      <RunningAnimation 
        isVisible={true} 
        isLoadingScreen={true}
      />
    </View>
  );
};

export default LoadingScreen; 
