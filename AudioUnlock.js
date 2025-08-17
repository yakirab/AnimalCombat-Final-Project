import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import soundManager from './SoundManager';

const AudioUnlock = ({ onAudioUnlocked }) => {
  const [showUnlock, setShowUnlock] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    // Only show on web platform
    if (Platform.OS === 'web') {
      // Check if audio context is suspended
      const checkAudioContext = () => {
        try {
          if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
            setShowUnlock(true);
          } else {
            setShowUnlock(false);
            setAudioUnlocked(true);
            if (onAudioUnlocked) onAudioUnlocked();
          }
        } catch (error) {
          console.log('Audio context check failed:', error);
          // If we can't check audio context, assume it's unlocked
          setShowUnlock(false);
          setAudioUnlocked(true);
          if (onAudioUnlocked) onAudioUnlocked();
        }
      };

      // Check after a short delay to allow initialization
      const timer = setTimeout(checkAudioContext, 1000);
      return () => clearTimeout(timer);
    } else {
      // On non-web platforms, audio is always available
      setAudioUnlocked(true);
      if (onAudioUnlocked) onAudioUnlocked();
    }
  }, [onAudioUnlocked]);

  const handleUnlockAudio = async () => {
    try {
      // Try to resume audio context
      if (soundManager.audioContext) {
        await soundManager.audioContext.resume();
      }
      
      // Play a silent sound to unlock audio
      soundManager.playClick();
      
      // Wait a bit for audio context to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start background music with retry
      let retryCount = 0;
      const startBackgroundMusic = async () => {
        try {
          await soundManager.playBackgroundMusic(false);
        } catch (error) {
          console.log('Background music start failed, retrying...', error);
          if (retryCount < 3) {
            retryCount++;
            setTimeout(startBackgroundMusic, 200);
          }
        }
      };
      
      await startBackgroundMusic();
      
      setAudioUnlocked(true);
      setShowUnlock(false);
      
      if (onAudioUnlocked) onAudioUnlocked();
    } catch (error) {
      console.error('Failed to unlock audio:', error);
      // Even if there's an error, mark as unlocked to not block the UI
      setAudioUnlocked(true);
      setShowUnlock(false);
      if (onAudioUnlocked) onAudioUnlocked();
    }
  };

  if (!showUnlock || audioUnlocked) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Enable Audio</Text>
        <Text style={styles.message}>
          Click the button below to enable background music and sound effects.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleUnlockAudio}>
          <Text style={styles.buttonText}>Enable Audio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AudioUnlock;
