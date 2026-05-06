// File Overview: Settings.js
// What this file is: Player settings screen for controls and audio preferences.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, Image, Platform, ScrollView } from 'react-native';
import { useBackground } from './BackgroundContext';
import { authentication, firestore } from './Config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import soundManager from './SoundManager';
import { encodeEmail, responsiveScale } from './utils';
import BACKGROUND_IMAGES from './backgroundImages';

const { width, height } = Dimensions.get('window');
const SCALE = responsiveScale(width, height, 1, 0.82, 1.08);

const Settings = ({ navigation }) => {
  const { currentIndex } = useBackground();
  // Keyboard bindings used by gameplay input handlers.
  const [controls, setControls] = useState({ left: 'a', right: 'd', block: 'f', light: 'e', heavy: 'q', special: 'r' });
  // Audio levels are normalized floats in [0, 1].
  const [sfxVolume, setSfxVolume] = useState(1);
  const [bgMusicVolume, setBgMusicVolume] = useState(1);
  const sfxSliderWidthRef = useRef(1);
  const bgMusicSliderWidthRef = useRef(1);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const images = BACKGROUND_IMAGES;

  // Restricts each control binding to a single lowercase character.
  const normalizeKey = useCallback((k) => (k || '').toString().trim().toLowerCase().slice(0, 1), []);

  useEffect(() => {
    // Loads persisted settings from Firestore and applies them to local state and audio engine.
    const load = async () => {
      try {
        const me = authentication.currentUser;
        if (!me?.email) return;
        const snap = await getDoc(doc(firestore, 'Users', encodeEmail(me.email)));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.controls) setControls(prev => ({ ...prev, ...data.controls }));
          if (typeof data?.sfxVolume === 'number') {
            const loadedSfxVolume = Math.max(0, Math.min(1, data.sfxVolume));
            setSfxVolume(loadedSfxVolume);
            soundManager.setSFXVolume(loadedSfxVolume);
          }
          if (typeof data?.bgMusicVolume === 'number') {
            const loadedBgVolume = Math.max(0, Math.min(1, data.bgMusicVolume));
            setBgMusicVolume(loadedBgVolume);
            soundManager.setBGMusicVolume(loadedBgVolume);
          }
          // Backward compatibility for old schema that stored one shared `volume` field.
          if (typeof data?.volume === 'number' && !data?.sfxVolume && !data?.bgMusicVolume) {
            const loadedVolume = Math.max(0, Math.min(1, data.volume));
            setSfxVolume(loadedVolume);
            setBgMusicVolume(loadedVolume);
            soundManager.setSFXVolume(loadedVolume);
            soundManager.setBGMusicVolume(loadedVolume);
          }
          if (typeof data?.outputDeviceId === 'string') {
            setSelectedDeviceId(data.outputDeviceId);
            soundManager.setOutputDevice(data.outputDeviceId);
          }
        }
      } catch (err) { console.error('Failed to load settings:', err); }
    };
    load();
  }, []);

  // Web-only: list output devices (headphones/speakers/etc.) for manual routing.
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        if (Platform.OS === 'web') {
          const devices = await soundManager.listOutputDevices();
          setOutputDevices(devices);
        }
      } catch (err) { console.error('Failed to fetch audio devices:', err); }
    };
    fetchDevices();
  }, []);

  // Saves controls + audio preferences and immediately applies them.
  const save = useCallback(async () => {
    try {
      const me = authentication.currentUser;
      if (!me?.email) return;
      const ref = doc(firestore, 'Users', encodeEmail(me.email));
      const payload = {
        controls,
        sfxVolume: Math.max(0, Math.min(1, sfxVolume)),
        bgMusicVolume: Math.max(0, Math.min(1, bgMusicVolume)),
        outputDeviceId: selectedDeviceId || ''
      };
      await setDoc(ref, payload, { merge: true });

      // Keep runtime audio state in sync with saved values.
      soundManager.setSFXVolume(sfxVolume);
      soundManager.setBGMusicVolume(bgMusicVolume);
      soundManager.setOutputDevice(selectedDeviceId);

      navigation.goBack();
    } catch (err) { console.error('Failed to save settings:', err); }
  }, [controls, sfxVolume, bgMusicVolume, selectedDeviceId, navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    backgroundImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 * SCALE },
    card: { width: '100%', maxWidth: 860 * SCALE, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 12 * SCALE, padding: 22 * SCALE },
    title: { fontSize: 30 * SCALE, fontWeight: '900', textAlign: 'center', marginBottom: 18 * SCALE, color: '#2c3e50' },
    row: { flexDirection: width < 700 ? 'column' : 'row', alignItems: width < 700 ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: 10 * SCALE, gap: 8 * SCALE },
    label: { fontSize: 17 * SCALE, fontWeight: '700', color: '#2c3e50', width: width < 700 ? '100%' : 190 * SCALE },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8 * SCALE, paddingHorizontal: 12 * SCALE, paddingVertical: 8 * SCALE, width: width < 700 ? '100%' : 100 * SCALE, fontSize: 17 * SCALE, textAlign: 'center', backgroundColor: '#f9f9f9' },
    sliderTrack: { flex: 1, minWidth: 180 * SCALE, height: 24 * SCALE, backgroundColor: '#ecf0f1', borderRadius: 12 * SCALE, overflow: 'hidden', marginHorizontal: width < 700 ? 0 : 10 * SCALE },
    sliderFill: { height: '100%', backgroundColor: '#27ae60', opacity: 1 },
    sliderThumb: { position: 'absolute', top: 0, bottom: 0, width: 24 * SCALE, borderRadius: 12 * SCALE, backgroundColor: '#2ecc71' },
    volumeValue: { fontSize: 16 * SCALE, fontWeight: '700', width: width < 700 ? '100%' : 70 * SCALE, textAlign: width < 700 ? 'left' : 'right', color: '#2c3e50' },
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 * SCALE },
    actionBtn: { minWidth: 100 * SCALE, alignItems: 'center', paddingVertical: 10 * SCALE, paddingHorizontal: 18 * SCALE, borderRadius: 10 * SCALE, marginLeft: 10 * SCALE },
    actionBtnText: { fontSize: 16 * SCALE, fontWeight: '700', color: '#2c3e50' },
    select: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 * SCALE, paddingHorizontal: 12 * SCALE, paddingVertical: 8 * SCALE, backgroundColor: '#f9f9f9' },
  }), []);

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex % images.length]} style={styles.backgroundImage} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Move Left</Text>
          <TextInput value={controls.left} onChangeText={(t) => setControls(prev => ({ ...prev, left: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Move Right</Text>
          <TextInput value={controls.right} onChangeText={(t) => setControls(prev => ({ ...prev, right: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Block</Text>
          <TextInput value={controls.block} onChangeText={(t) => setControls(prev => ({ ...prev, block: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Light</Text>
          <TextInput value={controls.light} onChangeText={(t) => setControls(prev => ({ ...prev, light: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Heavy</Text>
          <TextInput value={controls.heavy} onChangeText={(t) => setControls(prev => ({ ...prev, heavy: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Special</Text>
          <TextInput value={controls.special} onChangeText={(t) => setControls(prev => ({ ...prev, special: normalizeKey(t) }))} style={styles.input} maxLength={1} autoCapitalize='none' />
        </View>

        <View style={[styles.row, { alignItems: 'center' }]}>
          <Text style={styles.label}>SFX Volume</Text>
          <View
            style={styles.sliderTrack}
            onLayout={(e) => { sfxSliderWidthRef.current = e.nativeEvent.layout.width; }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              const w = sfxSliderWidthRef.current || 1;
              const x = Math.max(0, Math.min(w, e.nativeEvent.locationX || 0));
              const newVolume = Math.max(0, Math.min(1, x / w));
              setSfxVolume(newVolume);
              soundManager.setSFXVolume(newVolume);
              soundManager.playClick();
            }}
            onResponderMove={(e) => {
              const w = sfxSliderWidthRef.current || 1;
              const x = Math.max(0, Math.min(w, e.nativeEvent.locationX || 0));
              const newVolume = Math.max(0, Math.min(1, x / w));
              setSfxVolume(newVolume);
              soundManager.setSFXVolume(newVolume);
            }}
          >
            <View style={[styles.sliderFill, { width: `${Math.round(Math.max(0, Math.min(1, Number(sfxVolume) || 0)) * 100)}%` }]} />
            <View style={[styles.sliderThumb, { left: Math.max(0, Math.min((sfxSliderWidthRef.current || 0) - (24 * SCALE), (Math.max(0, Math.min(1, Number(sfxVolume) || 0)) * (sfxSliderWidthRef.current || 0)) - (12 * SCALE))) }]} />
          </View>
          <Text style={styles.volumeValue}>{Math.round(Math.max(0, Math.min(1, Number(sfxVolume) || 0)) * 100)}%</Text>
        </View>

        <View style={[styles.row, { alignItems: 'center' }]}>
          <Text style={styles.label}>BG Music Volume</Text>
          <View
            style={styles.sliderTrack}
            onLayout={(e) => { bgMusicSliderWidthRef.current = e.nativeEvent.layout.width; }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              const w = bgMusicSliderWidthRef.current || 1;
              const x = Math.max(0, Math.min(w, e.nativeEvent.locationX || 0));
              const newVolume = Math.max(0, Math.min(1, x / w));
              setBgMusicVolume(newVolume);
              soundManager.setBGMusicVolume(newVolume);
            }}
            onResponderMove={(e) => {
              const w = bgMusicSliderWidthRef.current || 1;
              const x = Math.max(0, Math.min(w, e.nativeEvent.locationX || 0));
              const newVolume = Math.max(0, Math.min(1, x / w));
              setBgMusicVolume(newVolume);
              soundManager.setBGMusicVolume(newVolume);
            }}
          >
            <View style={[styles.sliderFill, { width: `${Math.round(Math.max(0, Math.min(1, Number(bgMusicVolume) || 0)) * 100)}%` }]} />
            <View style={[styles.sliderThumb, { left: Math.max(0, Math.min((bgMusicSliderWidthRef.current || 0) - (24 * SCALE), (Math.max(0, Math.min(1, Number(bgMusicVolume) || 0)) * (bgMusicSliderWidthRef.current || 0)) - (12 * SCALE))) }]} />
          </View>
          <Text style={styles.volumeValue}>{Math.round(Math.max(0, Math.min(1, Number(bgMusicVolume) || 0)) * 100)}%</Text>
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.row}>
            <Text style={styles.label}>Output Device</Text>
            <View style={styles.select}>
              <select
                style={{ width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  soundManager.setOutputDevice(e.target.value);
                }}
              >
                <option value="">System Default</option>
                {outputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                ))}
              </select>
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#bdc3c7' }]} onPress={() => { soundManager.playClick(); navigation.goBack(); }}>
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#27ae60' }]} onPress={() => { soundManager.playClick(); save(); }}>
            <Text style={[styles.actionBtnText, { color: 'white' }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

export default Settings;



