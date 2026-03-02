import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, Dimensions, View } from 'react-native';

const { width, height } = Dimensions.get('window');

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

const RunningAnimation = ({ isVisible = true, isLoadingScreen = false }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState('cow');
  
  const frames = ANIMATIONS[currentAnimation];

  useEffect(() => {
    let frameInterval;
    if (isVisible && isLoadingScreen) {
      frameInterval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frames.length);
      }, 80);
    }
    return () => {
      if (frameInterval) {
        clearInterval(frameInterval);
      }
    };
  }, [frames, isVisible, isLoadingScreen]);

  useEffect(() => {
    const characterInterval = setInterval(() => {
      setCurrentAnimation(prev => {
        const currentIndex = ANIMATION_TYPES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % ANIMATION_TYPES.length;
        return ANIMATION_TYPES[nextIndex];
      });
    }, 70000);

    return () => clearInterval(characterInterval);
  }, []);

  if (!isVisible || !isLoadingScreen) return null;

  return (
    <View style={styles.container}>
      <Image 
        source={frames[currentFrame]}
        style={styles.runningCharacter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 150, // Increased from 100 to give more space
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  runningCharacter: {
    width: 300, // Increased from 200
    height: 300, // Increased from 200
    resizeMode: 'contain',
    zIndex: 99999,
  },
});

export default RunningAnimation; 