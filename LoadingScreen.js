import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import RunningAnimation from './RunningAnimation';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y); // Use the smaller scale to maintain proportions

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