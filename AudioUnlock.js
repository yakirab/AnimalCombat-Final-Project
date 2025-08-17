import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import soundManager from './SoundManager';

const AudioUnlock = ({ onAudioUnlocked }) => {
  const [showUnlock, setShowUnlock] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    console.log('AudioUnlock useEffect triggered, Platform.OS:', Platform.OS);
    
    // Only show on web platform
    if (Platform.OS === 'web') {
      console.log('Running on web platform, setting up audio unlock');
      
      // Force show the unlock modal on web immediately
      console.log('Setting showUnlock to true immediately');
      setShowUnlock(true);
      console.log('Audio unlock modal should be visible');
    } else {
      // On non-web platforms, audio is always available
      console.log('Running on non-web platform, audio always available');
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

  console.log('AudioUnlock render - showUnlock:', showUnlock, 'audioUnlocked:', audioUnlocked);
  
  if (!showUnlock || audioUnlocked) {
    console.log('AudioUnlock not rendering - showUnlock:', showUnlock, 'audioUnlocked:', audioUnlocked);
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  modal: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    margin: 20,
    maxWidth: 450,
    minWidth: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
