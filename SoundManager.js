import { Audio as ExpoAudio } from 'expo-av';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

class SoundManager {
  constructor() {
    this.sounds = {};
    this.htmlAudioElements = {}; // For web compatibility
    this.backgroundMusic = null;
    this.currentBgTrack = 0; // 0 = background.mp3, 1 = background2.mp3
    this.sfxVolume = 1.0;
    this.bgMusicVolume = 1.0;
    this.isInitialized = false;
    this.backgroundTracks = [];
    this.isWeb = Platform.OS === 'web';
    // Polyphony support
    this.poolMax = 6; // maximum overlapping instances per SFX
    this.poolBaseSize = 3; // initial instances to prepare
    this.webSfxPools = {}; // { name: HTMLAudioElement[] }
    this.webSfxSources = {}; // { name: resolvedUri }
    this.mobileSfxPools = {}; // { name: ExpoAudio.Sound[] }
    this.mobileSfxSources = {}; // { name: module require() }
    this.walkingSound = null; // Dedicated walking sound instance for looping
    this.isMuted = false; // Global mute state
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // console.log('Initializing SoundManager..., Platform:', Platform.OS);
      
      if (this.isWeb) {
        // Web-specific initialization using HTML5 Audio
        // console.log('Using HTML5 Audio for web...');
        await this.initializeWebAudio();
      } else {
        // Mobile initialization using expo-av
        // console.log('Using expo-av for mobile...');
        await this.initializeMobileAudio();
      }

      this.isInitialized = true;
      // console.log('SoundManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  async initializeWebAudio() {
    const resolveWebUri = async (modOrPath) => {
      if (typeof modOrPath === 'string') return modOrPath;
      try {
        const asset = Asset.fromModule(modOrPath);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        return asset.uri;
      } catch (e) {
        return modOrPath?.default || '';
      }
    };

    // Create HTML Audio elements for web
    const bgFiles = {
      background: require('./assets/Sounds/BG/background.mp3'),
      background2: require('./assets/Sounds/BG/background2.mp3'),
      fighting: require('./assets/Sounds/BG/Fighting.mp3')
    };

    const sfxFiles = {
      click: require('./assets/Sounds/SFX/click.mp3'),
      invisible: require('./assets/Sounds/SFX/invisible.mp3'),
      kick: require('./assets/Sounds/SFX/kick.mp3'),
      lick: require('./assets/Sounds/SFX/Lick.mp3'),
      milk: require('./assets/Sounds/SFX/milk.wav'),
      punch: require('./assets/Sounds/SFX/punch.mp3'),
      scratch: require('./assets/Sounds/SFX/scratch.wav'),
      smash: require('./assets/Sounds/SFX/smash.mp3'),
      walk: require('./assets/Sounds/SFX/walk.wav')
    };

    // Load background music
    this.backgroundTracks = [];
    for (const [name, src] of Object.entries(bgFiles)) {
      try {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.volume = this.bgMusicVolume;
        audio.preload = 'metadata';
        audio.src = await resolveWebUri(src);
        audio.muted = false;
        
        // Add error handling
        audio.addEventListener('error', (e) => {
          // Keep silent to avoid spam in production
        });
        
        audio.addEventListener('canplaythrough', () => {
          // console.log(`BG Music loaded successfully: ${name}`);
        });
        
        this.backgroundTracks.push({ sound: audio });
        console.log(`Loading BG music: ${name} from ${src}`);
      } catch (error) {
        // console.warn(`Failed to load BG music ${name}:`, error);
      }
    }

    // Load SFX
    for (const [name, src] of Object.entries(sfxFiles)) {
      try {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.volume = this.sfxVolume;
        audio.preload = 'metadata';
        const resolved = await resolveWebUri(src);
        audio.src = resolved;
        audio.muted = false;
        
        // Add error handling
        audio.addEventListener('error', (e) => {
          // Keep silent to avoid spam in production
        });
        
        audio.addEventListener('canplaythrough', () => {
          // console.log(`SFX loaded successfully: ${name}`);
        });
        
        this.htmlAudioElements[name] = audio;
        // Store source and initialize pool for polyphony
        this.webSfxSources[name] = resolved;
        this.webSfxPools[name] = [audio];
        for (let i = 1; i < this.poolBaseSize; i += 1) {
          const clone = new Audio(resolved);
          clone.crossOrigin = 'anonymous';
          clone.volume = this.sfxVolume;
          clone.preload = 'metadata';
          clone.muted = false;
          // Ensure each audio element can play independently
          clone.load();
          this.webSfxPools[name].push(clone);
        }
        // console.log(`Loading SFX: ${name} from ${resolved}`);
      } catch (error) {
        // console.warn(`Failed to load SFX ${name}:`, error);
      }
    }
  }

  async initializeMobileAudio() {
    // Set audio mode for mobile (using simplified config for compatibility)
    try {
      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('Audio mode setup warning (non-critical):', error.message);
    }

    // Preload background music
    try {
      const bg1 = await ExpoAudio.Sound.createAsync(require('./assets/Sounds/BG/background.mp3'));
      const bg2 = await ExpoAudio.Sound.createAsync(require('./assets/Sounds/BG/background2.mp3'));
      const fighting = await ExpoAudio.Sound.createAsync(require('./assets/Sounds/BG/Fighting.mp3'));
      
      this.backgroundTracks = [bg1, bg2, fighting];
      console.log('Background music loaded successfully');
    } catch (bgError) {
      console.warn('Failed to load background music:', bgError);
      this.backgroundTracks = [];
    }

    // Preload SFX
    const sfxFiles = {
      click: require('./assets/Sounds/SFX/click.mp3'),
      invisible: require('./assets/Sounds/SFX/invisible.mp3'),
      kick: require('./assets/Sounds/SFX/kick.mp3'),
      lick: require('./assets/Sounds/SFX/Lick.mp3'),
      milk: require('./assets/Sounds/SFX/milk.wav'),
      punch: require('./assets/Sounds/SFX/punch.mp3'),
      scratch: require('./assets/Sounds/SFX/scratch.wav'),
      smash: require('./assets/Sounds/SFX/smash.mp3'),
      walk: require('./assets/Sounds/SFX/walk.wav')
    };

    this.mobileSfxSources = sfxFiles;
    for (const [name, file] of Object.entries(sfxFiles)) {
      try {
        this.mobileSfxPools[name] = [];
        for (let i = 0; i < this.poolBaseSize; i += 1) {
          const { sound } = await ExpoAudio.Sound.createAsync(file);
          await sound.setVolumeAsync(this.sfxVolume);
          this.mobileSfxPools[name].push(sound);
        }
        // Keep representative reference for compatibility
        this.sounds[name] = this.mobileSfxPools[name][0];
        // console.log(`Loaded SFX pool: ${name} (${this.mobileSfxPools[name].length})`);
      } catch (sfxError) {
        // console.warn(`Failed to load SFX ${name}:`, sfxError);
      }
    }
  }

  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    // console.log(`Setting SFX volume to: ${this.sfxVolume}`);
    
    if (this.isWeb) {
      // Update HTML Audio elements volume
      Object.values(this.htmlAudioElements).forEach(audio => {
        audio.volume = this.sfxVolume;
      });
      Object.values(this.webSfxPools).forEach(pool => {
        pool.forEach(el => { el.volume = this.sfxVolume; });
      });
    } else {
      // Update expo-av SFX volumes
      Object.values(this.mobileSfxPools).forEach(pool => {
        pool.forEach(sound => { sound.setVolumeAsync(this.sfxVolume); });
      });
    }
  }

  setBGMusicVolume(volume) {
    this.bgMusicVolume = Math.max(0, Math.min(1, volume));
    // console.log(`Setting BG Music volume to: ${this.bgMusicVolume}`);
    
    if (this.isWeb) {
      // Update HTML Audio background music volume
      if (this.backgroundMusic) {
        this.backgroundMusic.volume = this.bgMusicVolume;
      }
    } else {
      // Update expo-av background music volume
      if (this.backgroundMusic) {
        this.backgroundMusic.setVolumeAsync(this.bgMusicVolume);
      }
    }
  }

  // Legacy method for backwards compatibility
  setVolume(volume) {
    this.setSFXVolume(volume);
    this.setBGMusicVolume(volume);
  }

  async playBackgroundMusic(inGame = false) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
    } catch {}
    
    if (this.isMuted) {
      // If muted, still set up the music but with 0 volume
      this.stopBackgroundMusic();
    }
    if (!this.backgroundTracks || this.backgroundTracks.length === 0) {
      console.log('No background tracks available');
      return;
    }

    // On web, check if audio context is suspended (autoplay blocked)
    if (this.isWeb && this.audioContext && this.audioContext.state === 'suspended') {
      console.log('Audio context suspended - waiting for user interaction');
      return;
    }

    console.log('Starting background music, inGame:', inGame, 'tracks available:', this.backgroundTracks.length);

    try {
      // console.log(`Playing background music, inGame: ${inGame}`);
      
      // Stop current background music
      if (this.backgroundMusic) {
        if (this.isWeb) {
          this.backgroundMusic.pause();
          this.backgroundMusic.currentTime = 0;
        } else {
          await this.backgroundMusic.stopAsync();
        }
      }

      if (inGame) {
        // Play fighting music in game
        if (this.backgroundTracks[2]) {
          this.backgroundMusic = this.backgroundTracks[2].sound;
          
                if (this.isWeb) {
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.bgMusicVolume;
        // Use a separate play call for background music to avoid SFX interference
        const playPromise = this.backgroundMusic.play();
        if (playPromise) {
          playPromise.catch(error => {
            // Retry once if autoplay blocked
            setTimeout(() => {
              if (this.backgroundMusic && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(() => {});
              }
            }, 100);
          });
        }
      } else {
        await this.backgroundMusic.setIsLoopingAsync(true);
        await this.backgroundMusic.setVolumeAsync(this.bgMusicVolume);
        await this.backgroundMusic.playAsync();
      }
           // console.log('Fighting music started');
        }
      } else {
        // Play menu music (alternating background.mp3 and background2.mp3)
        this.playMenuMusic();
      }
    } catch (error) {
      // Swallow autoplay errors on web until user gesture unlocks audio
      if (this.isWeb) {
        return;
      }
      console.error('Failed to play background music:', error);
    }
  }

  async playMenuMusic() {
    if (!this.backgroundTracks[this.currentBgTrack]) {
      console.warn('No menu music track available');
      return;
    }

    try {
         // console.log(`Playing menu music track: ${this.currentBgTrack}`);
      this.backgroundMusic = this.backgroundTracks[this.currentBgTrack].sound;
      
      if (this.isWeb) {
        this.backgroundMusic.volume = this.bgMusicVolume;
        this.backgroundMusic.currentTime = 0;
        
        // Use a separate play call for menu music
        const playPromise = this.backgroundMusic.play();
        if (playPromise) {
          playPromise.catch(error => {
            // Retry once if autoplay blocked
            setTimeout(() => {
              if (this.backgroundMusic && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(() => {});
              }
            }, 100);
          });
        }
        
        // Set up listener for when track ends
        this.backgroundMusic.onended = () => {
          // Switch to the other track
          this.currentBgTrack = this.currentBgTrack === 0 ? 1 : 0;
          this.playMenuMusic();
        };
      } else {
        await this.backgroundMusic.setVolumeAsync(this.bgMusicVolume);
        await this.backgroundMusic.playAsync();
        
        // Set up listener for when track ends
        this.backgroundMusic.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            // Switch to the other track
            this.currentBgTrack = this.currentBgTrack === 0 ? 1 : 0;
            this.playMenuMusic();
          }
        });
      }
       // console.log('Menu music started');
    } catch (error) {
      console.error('Failed to play menu music:', error);
    }
  }

  async stopBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        if (this.isWeb) {
          this.backgroundMusic.pause();
          this.backgroundMusic.currentTime = 0;
        } else {
          await this.backgroundMusic.stopAsync();
        }
      }
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }

  async playSFX(soundName) {
    if (this.isMuted) return; // Don't play if muted
    
    try {
      if (!this.isInitialized) {
        try { await this.initialize(); } catch {}
      }

      // On web, resume audio context if suspended (autoplay blocked)
      if (this.isWeb && this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // console.log(`Playing SFX: ${soundName}`);
      
      if (this.isWeb) {
        // Don't unlock during SFX playback to avoid interfering with background music
        // Use a pooled instance for overlapping playback
        let pool = this.webSfxPools[soundName];
        if (!pool || pool.length === 0) {
          await this.initializeWebAudio();
          pool = this.webSfxPools[soundName] || [];
        }
        // Find a free instance
        let instance = pool.find(a => a.paused || a.ended || a.currentTime === 0);
        if (!instance && pool.length < this.poolMax) {
          const src = this.webSfxSources[soundName];
          if (src) {
            instance = new Audio(src);
            instance.crossOrigin = 'anonymous';
            instance.volume = this.sfxVolume;
            instance.preload = 'metadata';
            instance.muted = false;
            // Ensure this is a separate audio context from background music
            instance.load();
            pool.push(instance);
            this.webSfxPools[soundName] = pool;
          }
        }
        if (instance) {
          instance.volume = this.sfxVolume;
          try { 
            instance.currentTime = 0; 
          } catch {}
          // Play without interfering with other audio
          const playPromise = instance.play();
          if (playPromise) {
            playPromise.catch(() => {
              // Silent fail - don't interfere with background music
            });
          }
        }
      } else {
        // Mobile (expo-av) pooled playback
        let pool = this.mobileSfxPools[soundName];
        if (!pool || pool.length === 0) {
          await this.initializeMobileAudio();
          pool = this.mobileSfxPools[soundName] || [];
        }
        let chosen = null;
        for (const s of pool) {
          try {
            const status = await s.getStatusAsync();
            if (!status.isPlaying) { chosen = s; break; }
          } catch {}
        }
        if (!chosen && pool.length < this.poolMax) {
          try {
            const file = this.mobileSfxSources[soundName];
            const { sound } = await ExpoAudio.Sound.createAsync(file);
            await sound.setVolumeAsync(this.sfxVolume);
            pool.push(sound);
            this.mobileSfxPools[soundName] = pool;
            chosen = sound;
          } catch {}
        }
        if (chosen) {
          await chosen.setVolumeAsync(this.sfxVolume);
          await chosen.replayAsync();
        }
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundName}:`, error);
    }
  }

  // Convenience methods for specific actions
  playClick() { this.playSFX('click'); }
  playPunch() { this.playSFX('punch'); }
  playKick() { this.playSFX('kick'); }
  playLick() { this.playSFX('lick'); }
  playMilk() { this.playSFX('milk'); }
  playScratch() { this.playSFX('scratch'); }
  playSmash() { this.playSFX('smash'); }
  playInvisible() { this.playSFX('invisible'); }
  
  // Walk sound management for continuous looping
  playWalk() { 
    if (!this.walkingSound || this.walkingSound.paused || this.walkingSound.ended) {
      this.startWalkLoop();
    }
  }
  
  startWalkLoop() {
    if (this.isWeb) {
      // Find a free walk sound instance or create one
      let pool = this.webSfxPools['walk'];
      if (!pool || pool.length === 0) {
        this.initializeWebAudio().then(() => {
          pool = this.webSfxPools['walk'] || [];
          if (pool.length > 0) {
            this.walkingSound = pool[0];
            this.walkingSound.loop = true;
            this.walkingSound.volume = this.sfxVolume;
            this.walkingSound.currentTime = 0;
            this.walkingSound.play().catch(() => {});
          }
        });
      } else {
        this.walkingSound = pool[0]; // Use first instance for walking loop
        this.walkingSound.loop = true;
        this.walkingSound.volume = this.sfxVolume;
        this.walkingSound.currentTime = 0;
        this.walkingSound.play().catch(() => {});
      }
    } else {
      // Mobile: use expo-av
      const pool = this.mobileSfxPools?.['walk'];
      if (pool && pool.length > 0) {
        this.walkingSound = pool[0];
        this.walkingSound.setIsLoopingAsync(true);
        this.walkingSound.setVolumeAsync(this.sfxVolume);
        this.walkingSound.replayAsync();
      }
    }
  }
  
  stopWalk() {
    if (this.walkingSound) {
      if (this.isWeb) {
        this.walkingSound.pause();
        this.walkingSound.currentTime = 0;
        this.walkingSound.loop = false;
      } else {
        this.walkingSound.pauseAsync();
        this.walkingSound.setIsLoopingAsync(false);
      }
      this.walkingSound = null;
    }
  }
  
  // Mute control
  setMuted(muted) {
    this.isMuted = muted;
    
    // Mute/unmute background music
    if (this.backgroundMusic) {
      if (this.isWeb) {
        this.backgroundMusic.volume = muted ? 0 : this.bgMusicVolume;
      } else {
        this.backgroundMusic.setVolumeAsync(muted ? 0 : this.bgMusicVolume);
      }
    }
    
    // Mute/unmute all SFX pools
    if (this.isWeb) {
      Object.values(this.webSfxPools).forEach(pool => {
        pool.forEach(audio => {
          audio.volume = muted ? 0 : this.sfxVolume;
        });
      });
    } else {
      Object.values(this.mobileSfxPools).forEach(pool => {
        pool.forEach(sound => {
          sound.setVolumeAsync(muted ? 0 : this.sfxVolume);
        });
      });
    }
    
    // Mute/unmute walking sound
    if (this.walkingSound) {
      if (this.isWeb) {
        this.walkingSound.volume = muted ? 0 : this.sfxVolume;
      } else {
        this.walkingSound.setVolumeAsync(muted ? 0 : this.sfxVolume);
      }
    }
  }
  
  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
  
  getMuted() {
    return this.isMuted;
  }

  // On web, unlock all audio elements by briefly playing them muted within a user gesture
  async unlockWebAudio() {
    if (!this.isWeb) return;
    try {
      const unlockElement = async (el) => {
        try {
          const prevMuted = el.muted;
          const prevVol = el.volume;
          const prevLoop = el.loop;
          el.muted = true;
          el.volume = 0;
          el.loop = false;
          const playPromise = el.play();
          if (playPromise) {
            await playPromise.catch(() => {});
          }
          el.pause();
          el.currentTime = 0;
          el.muted = prevMuted;
          el.volume = prevVol;
          el.loop = prevLoop;
        } catch {}
      };

      // Unlock background music tracks separately
      if (this.backgroundTracks?.length) {
        for (const t of this.backgroundTracks) {
          if (t?.sound) await unlockElement(t.sound);
        }
      }
      
      // Unlock SFX elements separately
      for (const el of Object.values(this.htmlAudioElements)) {
        await unlockElement(el);
      }
      
      // Unlock all pooled SFX elements
      for (const pool of Object.values(this.webSfxPools)) {
        for (const el of pool) {
          await unlockElement(el);
        }
      }
    } catch {}
  }

  // Output device selection (web only)
  async listOutputDevices() {
    if (!this.isWeb || !navigator?.mediaDevices?.enumerateDevices) return [];
    try {
      // Request audio permission so labels are populated
      if (navigator.mediaDevices.getUserMedia) {
        try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audiooutput');
    } catch {
      return [];
    }
  }

  setOutputDevice(deviceId) {
    if (!this.isWeb) return;
    if (!('setSinkId' in HTMLMediaElement.prototype)) return; // Not supported

    const applySink = (el) => {
      if (el && typeof el.setSinkId === 'function') {
        try { el.setSinkId(deviceId || ''); } catch {}
      }
    };

    // Apply to BG music and all SFX elements
    if (this.backgroundMusic) applySink(this.backgroundMusic);
    Object.values(this.htmlAudioElements).forEach(applySink);
    // Also apply to all pooled elements
    Object.values(this.webSfxPools).forEach(pool => {
      pool.forEach(applySink);
    });
  }

  async cleanup() {
    try {
      // Stop and unload background music
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
      }

      // Unload all background tracks
      for (const track of this.backgroundTracks || []) {
        if (track.sound) {
          await track.sound.unloadAsync();
        }
      }

      // Unload all SFX
      for (const sound of Object.values(this.sounds)) {
        await sound.unloadAsync();
      }

      this.sounds = {};
      this.backgroundMusic = null;
      this.backgroundTracks = [];
      this.isInitialized = false;
    } catch (error) {
      console.warn('Failed to cleanup sounds:', error);
    }
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;

