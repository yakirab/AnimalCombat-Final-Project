import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

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

  // Background image animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % 37);
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