import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import RunningAnimation from './RunningAnimation';

const LoadingScreen = () => {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading{dots}</Text>
      <RunningAnimation 
        isVisible={true} 
        isLoadingScreen={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    zIndex: 0,
  },
  loadingText: {
    fontSize: 48,
    color: '#800000',
    fontWeight: 'bold',
    marginBottom: 100,
    zIndex: 1,
  },
});

export default LoadingScreen; 