import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import RunningAnimation from './RunningAnimation';

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Simulate loading progress - faster now
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4; // Increment by 4% each time for faster loading
      });
    }, 20); // Update every 20ms for faster and still smooth animation

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
          <RunningAnimation 
            isVisible={true} 
            progress={progress} 
            isLoadingScreen={true}
          />
        </View>
        <Text style={styles.loadingText}>{`Loading... ${Math.round(progress)}%`}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBarContainer: {
    width: '80%',
    height: 50, // Increased height to accommodate the running character
    backgroundColor: '#ddd',
    borderRadius: 25,
    marginTop: 20,
    overflow: 'hidden',
    position: 'relative', // For absolute positioning of the character
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#800000',
    borderRadius: 25,
  },
  loadingText: {
    fontSize: 24,
    color: '#800000',
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default LoadingScreen; 