// Simple audio test component
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Platform } from 'react-native';

const AudioTest = () => {
  const [audioStatus, setAudioStatus] = useState('Not initialized');
  const [testAudio, setTestAudio] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAudioStatus('Web platform detected');
    }
  }, []);

  const testSimpleAudio = () => {
    try {
      console.log('Testing simple audio...');
      setAudioStatus('Creating audio element...');
      
      // Try a more direct approach
      const audio = document.createElement('audio');
      audio.src = '/assets/Sounds/SFX/click.mp3';
      audio.preload = 'metadata';
      setTestAudio(audio);
      
      audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully');
        setAudioStatus('Audio loaded, ready to play');
      });
      
      audio.addEventListener('error', (error) => {
        console.error('Audio error:', error);
        setAudioStatus('Audio error: ' + error.type);
      });
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play');
        setAudioStatus('Audio can play');
      });
      
      // Start loading
      audio.load();
      
    } catch (error) {
      console.error('Error creating audio:', error);
      setAudioStatus('Error: ' + error.message);
    }
  };

  const playAudio = () => {
    if (testAudio) {
      console.log('Attempting to play audio...');
      setAudioStatus('Attempting to play...');
      
      testAudio.play()
        .then(() => {
          console.log('Audio playing successfully');
          setAudioStatus('Audio playing!');
        })
        .catch((error) => {
          console.error('Play error:', error);
          setAudioStatus('Play error: ' + error.message);
        });
    } else {
      setAudioStatus('No audio loaded');
    }
  };

  const testDirectUrl = () => {
    // Test direct URL access
    console.log('Testing direct URL...');
    fetch('/assets/Sounds/SFX/click.mp3')
      .then(response => {
        if (response.ok) {
          setAudioStatus('File accessible via URL');
          console.log('File accessible via URL');
        } else {
          setAudioStatus('File NOT accessible: ' + response.status);
          console.log('File NOT accessible:', response.status);
        }
      })
      .catch(error => {
        setAudioStatus('URL test error: ' + error.message);
        console.log('URL test error:', error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Debug Test</Text>
      <Text style={styles.status}>Status: {audioStatus}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testDirectUrl}>
        <Text style={styles.buttonText}>Test File URL</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testSimpleAudio}>
        <Text style={styles.buttonText}>Load Audio</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={playAudio}>
        <Text style={styles.buttonText}>Play Audio</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default AudioTest;
