import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, Image, Platform, Pressable } from 'react-native';
import { useBackground } from './BackgroundContext';
import { authentication, firestore } from './Config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import soundManager from './SoundManager';

const { width, height } = Dimensions.get('window');
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 2.5; // Increased by 2.5x for much bigger settings

const Settings = ({ navigation }) => {
  const { currentIndex } = useBackground();
  const [controls, setControls] = useState({ left: 'a', right: 'd', block: 'f', light: 'e', heavy: 'q', special: 'r' });
  const [sfxVolume, setSfxVolume] = useState(1);
  const [bgMusicVolume, setBgMusicVolume] = useState(1);
  const sfxSliderWidthRef = useRef(1);
  const bgMusicSliderWidthRef = useRef(1);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const images = useMemo(() => [
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
    require('./assets/MenuBackGround/background/bg37.png')
  ], []);

  const encodeEmail = (email) => email.replace(/\./g, ',');

  const normalizeKey = useCallback((k) => (k || '').toString().trim().toLowerCase().slice(0, 1), []);

  useEffect(() => {
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
          // Legacy support for old volume field
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
      } catch {}
    };
    load();
  }, []);

  // Load available output devices (web only)
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        if (Platform.OS === 'web') {
          const devices = await soundManager.listOutputDevices();
          setOutputDevices(devices);
        }
      } catch {}
    };
    fetchDevices();
  }, []);

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
      
      // Update sound manager volumes
      soundManager.setSFXVolume(sfxVolume);
      soundManager.setBGMusicVolume(bgMusicVolume);
      soundManager.setOutputDevice(selectedDeviceId);
      
      navigation.goBack();
    } catch {}
  }, [controls, sfxVolume, bgMusicVolume, selectedDeviceId, navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    backgroundImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
    card: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -width * 0.4 }, { translateY: -height * 0.3 }], width: width * 0.8, backgroundColor: 'transparent', borderRadius: 16 * SCALE, padding: 24 * SCALE },
    title: { fontSize: 36 * SCALE, fontWeight: '900', textAlign: 'center', marginBottom: 20 * SCALE, color: '#2c3e50' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 * SCALE },
    label: { fontSize: 20 * SCALE, fontWeight: '700', color: '#2c3e50', width: 220 * SCALE },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8 * SCALE, paddingHorizontal: 12 * SCALE, paddingVertical: 8 * SCALE, width: 120 * SCALE, fontSize: 20 * SCALE, textAlign: 'center', backgroundColor: '#f9f9f9' },
    sliderTrack: { flex: 1, height: 28 * SCALE, backgroundColor: '#ecf0f1', borderRadius: 14 * SCALE, overflow: 'hidden', marginHorizontal: 12 * SCALE },
    sliderFill: { height: '100%', backgroundColor: '#27ae60', opacity: 1 },
    sliderThumb: { position: 'absolute', top: 0, bottom: 0, width: 28 * SCALE, borderRadius: 14 * SCALE, backgroundColor: '#2ecc71' },
    volumeValue: { fontSize: 18 * SCALE, fontWeight: '700', width: 80 * SCALE, textAlign: 'right', color: '#2c3e50' },
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 * SCALE },
    actionBtn: { paddingVertical: 10 * SCALE, paddingHorizontal: 20 * SCALE, borderRadius: 10 * SCALE, marginLeft: 12 * SCALE },
    actionBtnText: { fontSize: 18 * SCALE, fontWeight: '700', color: '#2c3e50' },
    select: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 * SCALE, paddingHorizontal: 12 * SCALE, paddingVertical: 8 * SCALE, backgroundColor: '#f9f9f9' },
  }), []);

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex % images.length]} style={styles.backgroundImage} />
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
            <View style={[styles.sliderThumb, { left: Math.max(0, Math.min((sfxSliderWidthRef.current || 0) - (28 * SCALE), (Math.max(0, Math.min(1, Number(sfxVolume) || 0)) * (sfxSliderWidthRef.current || 0)) - (14 * SCALE))) }]} />
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
            <View style={[styles.sliderThumb, { left: Math.max(0, Math.min((bgMusicSliderWidthRef.current || 0) - (28 * SCALE), (Math.max(0, Math.min(1, Number(bgMusicVolume) || 0)) * (bgMusicSliderWidthRef.current || 0)) - (14 * SCALE))) }]} />
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
    </View>
  );
};

export default Settings;


