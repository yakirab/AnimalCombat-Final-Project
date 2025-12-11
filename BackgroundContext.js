import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, Image } from 'react-native';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');
const START_POSITION = -300;
const END_POSITION = width + 400;
const DELAY_BETWEEN_RUNS = 15000;
const BACKGROUND_IMAGES = [
  require('./assets/MenuBackGround/background/bg1.png'),
  require('./assets/MenuBackGround/background/bg2.png'),
  require('./assets/MenuBackGround/background/bg3.png'),
  require('./assets/MenuBackGround/background/bg4.png'),
  require('./assets/MenuBackGround/background/bg5.png'),
  require('./assets/MenuBackGround/background/bg6.png'),
  require('./assets/MenuBackGround/background/bg7.png'),
  require('./assets/MenuBackGround/background/bg8.png'),
  require('./assets/MenuBackGround/background/bg9.png'),
  require('./assets/MenuBackGround/background/bg10.png'),
  require('./assets/MenuBackGround/background/bg11.png'),
  require('./assets/MenuBackGround/background/bg12.png'),
  require('./assets/MenuBackGround/background/bg13.png'),
  require('./assets/MenuBackGround/background/bg132.png'),
  require('./assets/MenuBackGround/background/bg133.png'),
  require('./assets/MenuBackGround/background/bg14.png'),
  require('./assets/MenuBackGround/background/bg15.png'),
  require('./assets/MenuBackGround/background/bg16.png'),
  require('./assets/MenuBackGround/background/bg17.png'),
  require('./assets/MenuBackGround/background/bg18.png'),
  require('./assets/MenuBackGround/background/bg19.png'),
  require('./assets/MenuBackGround/background/bg20.png'),
  require('./assets/MenuBackGround/background/bg21.png'),
  require('./assets/MenuBackGround/background/bg22.png'),
  require('./assets/MenuBackGround/background/bg23.png'),
  require('./assets/MenuBackGround/background/bg24.png'),
  require('./assets/MenuBackGround/background/bg25.png'),
  require('./assets/MenuBackGround/background/bg26.png'),
  require('./assets/MenuBackGround/background/bg27.png'),
  require('./assets/MenuBackGround/background/bg28.png'),
  require('./assets/MenuBackGround/background/bg29.png'),
  require('./assets/MenuBackGround/background/bg30.png'),
  require('./assets/MenuBackGround/background/bg31.png'),
  require('./assets/MenuBackGround/background/bg32.png'),
  require('./assets/MenuBackGround/background/bg33.png'),
  require('./assets/MenuBackGround/background/bg34.png'),
  require('./assets/MenuBackGround/background/bg35.png'),
  require('./assets/MenuBackGround/background/bg36.png'),
  require('./assets/MenuBackGround/background/bg37.png'),
];

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
