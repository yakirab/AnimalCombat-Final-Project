import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, Platform, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const START_POSITION = -100; // Adjusted for the progress bar
const END_POSITION = width * 0.8 - 100; // Adjusted to match progress bar width

const ANIMATIONS = {
  tiger: [
    require('./assets/MenuBackGround/background/bganimations/tigerun1.png'),
    require('./assets/MenuBackGround/background/bganimations/tigerun2.png'),
    require('./assets/MenuBackGround/background/bganimations/tigerun3.png'),
    require('./assets/MenuBackGround/background/bganimations/tigerun4.png'),
    require('./assets/MenuBackGround/background/bganimations/tigerun5.png'),
  ],
  cow: [
    require('./assets/MenuBackGround/background/bganimations/sillyrun1.png'),
    require('./assets/MenuBackGround/background/bganimations/sillyrun2.png'),
    require('./assets/MenuBackGround/background/bganimations/sillyrun3.png'),
    require('./assets/MenuBackGround/background/bganimations/sillyrun4.png'),
    require('./assets/MenuBackGround/background/bganimations/sillyrun5.png'),
    require('./assets/MenuBackGround/background/bganimations/sillyrun6.png'),
  ]
};

const ANIMATION_TYPES = ['cow', 'tiger'];

const RunningAnimation = ({ isVisible = true, progress = 0, isLoadingScreen = false }) => {
  const position = useRef(new Animated.Value(START_POSITION)).current;
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState('cow');
  const [preloadedUris, setPreloadedUris] = useState({});
  const [isPreloaded, setIsPreloaded] = useState(false);
  
  const frames = ANIMATIONS[currentAnimation];

  // Preload all animation frames
  useEffect(() => {
    let mounted = true;
    
    const preloadAnimations = async () => {
      try {
        const allAnimations = {};
        
        for (const [animType, frameArray] of Object.entries(ANIMATIONS)) {
          const assets = await Asset.loadAsync(frameArray);
          if (mounted) {
            allAnimations[animType] = assets.map(asset => asset.uri);
          }
        }
        
        if (mounted) {
          setPreloadedUris(allAnimations);
          setIsPreloaded(true);
        }
      } catch (error) {
        console.warn('Failed to preload animation frames:', error);
        // Fallback to original method if preloading fails
        if (mounted) {
          setIsPreloaded(true);
        }
      }
    };

    preloadAnimations();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Only run animations if this is the loading screen
  useEffect(() => {
    if (isVisible && isLoadingScreen) {
      const targetPosition = START_POSITION + ((END_POSITION - START_POSITION) * (progress / 100));
      
      Animated.timing(position, {
        toValue: targetPosition,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [progress, isVisible, isLoadingScreen]);

  useEffect(() => {
    let frameInterval;
    if (isVisible && isLoadingScreen && isPreloaded) {
      frameInterval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frames.length);
      }, 80);
    }
    return () => {
      if (frameInterval) {
        clearInterval(frameInterval);
      }
    };
  }, [frames, isVisible, isLoadingScreen, isPreloaded]);

  // Change character every 70 seconds
  useEffect(() => {
    const characterInterval = setInterval(() => {
      setCurrentAnimation(prev => {
        const currentIndex = ANIMATION_TYPES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % ANIMATION_TYPES.length;
        return ANIMATION_TYPES[nextIndex];
      });
    }, 70000); // 70 seconds

    return () => clearInterval(characterInterval);
  }, []);

  // Only show if this is the loading screen
  if (!isVisible || !isLoadingScreen) return null;

  // Show loading state while preloading
  if (!isPreloaded) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: position },
              { scaleX: 1 }
            ],
          },
        ]}
      >
        <View style={styles.runningCharacter} />
      </Animated.View>
    );
  }

  const currentUris = preloadedUris[currentAnimation];
  const currentUri = currentUris ? currentUris[currentFrame] : null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position },
            { scaleX: 1 }
          ],
        },
      ]}
    >
      {currentUri ? (
        <Image 
          source={{ uri: currentUri }}
          style={styles.runningCharacter}
          transition={0} // Eliminates fade-in that causes transparency flash
          cachePolicy="memory-disk" // Keeps frames warm between swaps
        />
      ) : (
        // Fallback to original method if preloading failed
        <Image 
          source={frames[currentFrame]}
          style={styles.runningCharacter}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, // Raised the character position
    zIndex: 2,
  },
  runningCharacter: {
    width: 200, // Increased character size
    height: 200,
    resizeMode: 'contain',
  },
});

export default RunningAnimation; 