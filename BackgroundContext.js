// File Overview: BackgroundContext.js
// What this file is: Global context for selected background/theme state.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, Image } from 'react-native';
import { Asset } from 'expo-asset';
import BACKGROUND_IMAGES from './backgroundImages';

const { width } = Dimensions.get('window');
const START_POSITION = -300;
const END_POSITION = width + 400;
const DELAY_BETWEEN_RUNS = 15000;


const BackgroundContext = createContext();

export const BackgroundProvider = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMovingRight, setIsMovingRight] = useState(true);
  const position = useRef(new Animated.Value(START_POSITION)).current;
  const timeoutRef = useRef(null);
  const animationStarted = useRef(false);

  // Preload all background frames to avoid flashes when swapping
  useEffect(() => {
    (async () => {
      try {
        await Asset.loadAsync(BACKGROUND_IMAGES);
        await Promise.all(BACKGROUND_IMAGES.map(src => {
          const uri = Asset.fromModule(src).uri;
          return Image.prefetch(uri).catch(() => null);
        }));
      } catch (err) {
        console.warn('Background preload failed', err);
      }
    })();
  }, []);

  // Background image animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Running animation
  const startAnimation = () => {
    if (animationStarted.current) return;

    animationStarted.current = true;

    position.setValue(isMovingRight ? START_POSITION : END_POSITION);

    Animated.timing(position, {
      toValue: isMovingRight ? END_POSITION : START_POSITION,
      duration: 5000,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) {
        timeoutRef.current = setTimeout(() => {
          animationStarted.current = false;
          setIsMovingRight(prev => !prev);
        }, DELAY_BETWEEN_RUNS);
      }
    });
  };

  useEffect(() => {
    startAnimation();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isMovingRight]);

  // Handle sprite animation
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % 6); // assuming 6 frames
    }, 80);

    return () => clearInterval(frameInterval);
  }, []);

  return (
    <BackgroundContext.Provider value={{
      currentIndex,
      currentFrame,
      isMovingRight,
      position,
      startAnimation // Expose the startAnimation function
    }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => useContext(BackgroundContext); 

