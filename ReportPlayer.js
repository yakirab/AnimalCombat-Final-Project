import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, authentication } from './Config';
import { useBackground } from './BackgroundContext';
import soundManager from './SoundManager';
import BACKGROUND_IMAGES from './backgroundImages';

const { width, height } = Dimensions.get('window');
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5;

const ReportPlayer = () => {
    const { currentIndex } = useBackground();
    const navigation = useNavigation();
    const [searchQuery, setSearchQuery] = useState('');
    const [allPlayers, setAllPlayers] = useState([]);
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load all players on mount
    useEffect(() => {
        const loadPlayers = async () => {
            try {
                const snap = await getDocs(collection(firestore, 'Users'));
                const currentEmail = authentication.currentUser?.email || '';
                const players = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    // Don't show current user in the list
                    if (data.email !== currentEmail) {
                        players.push({ id: doc.id, name: data.name || 'Unknown', email: data.email || '' });
                    }
                });
                setAllPlayers(players);
                setFilteredPlayers(players);
            } catch (err) {
                console.error('Failed to load players:', err);
                Alert.alert('Error', 'Failed to load players');
            } finally {
                setIsLoading(false);
            }
        };
        loadPlayers();
    }, []);

    // Filter players based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPlayers(allPlayers);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredPlayers(allPlayers.filter(p => p.name.toLowerCase().includes(q)));
        }
    }, [searchQuery, allPlayers]);

    const handleSelectPlayer = useCallback((player) => {
        soundManager.playClick();
        setSelectedPlayer(player);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!selectedPlayer) {
            Alert.alert('Error', 'Please select a player to report');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Please enter a reason for the report');
            return;
        }

        setIsSubmitting(true);
        try {
            const currentUser = authentication.currentUser;
            await addDoc(collection(firestore, 'Reports'), {
                reporterEmail: currentUser?.email || '',
                reporterName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Unknown',
                reportedEmail: selectedPlayer.email,
                reportedName: selectedPlayer.name,
                reason: reason.trim(),
                createdAt: serverTimestamp()
            });
            Alert.alert('Success', 'Report submitted successfully. An admin will review it.');
            navigation.goBack();
        } catch (err) {
            console.error('Failed to submit report:', err);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedPlayer, reason, navigation]);

    const handleBack = useCallback(() => {
        soundManager.playClick();
        navigation.goBack();
    }, [navigation]);

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1 },
        backgroundImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            padding: 20 * SCALE,
            paddingTop: 50 * SCALE,
        },
        title: {
            fontSize: 28 * SCALE,
            fontWeight: 'bold',
            color: '#fff',
            textAlign: 'center',
            marginBottom: 16 * SCALE,
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 4,
        },
        searchInput: {
            backgroundColor: '#fff',
            borderRadius: 12 * SCALE,
            paddingHorizontal: 16 * SCALE,
            paddingVertical: 10 * SCALE,
            fontSize: 16 * SCALE,
            marginBottom: 12 * SCALE,
        },
        playerItem: {
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingVertical: 12 * SCALE,
            paddingHorizontal: 16 * SCALE,
            borderRadius: 8 * SCALE,
            marginBottom: 6 * SCALE,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        playerItemSelected: {
            backgroundColor: 'rgba(231, 76, 60, 0.5)',
            borderWidth: 2,
            borderColor: '#e74c3c',
        },
        playerName: { color: '#fff', fontSize: 16 * SCALE, fontWeight: '600' },
        playerEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 12 * SCALE },
        selectedBadge: { color: '#e74c3c', fontSize: 14 * SCALE, fontWeight: 'bold' },
        sectionTitle: {
            fontSize: 18 * SCALE,
            fontWeight: '700',
            color: '#fff',
            marginTop: 16 * SCALE,
            marginBottom: 8 * SCALE,
        },
        reasonInput: {
            backgroundColor: '#fff',
            borderRadius: 12 * SCALE,
            paddingHorizontal: 16 * SCALE,
            paddingVertical: 12 * SCALE,
            fontSize: 16 * SCALE,
            minHeight: 80 * SCALE,
            textAlignVertical: 'top',
        },
        submitBtn: {
            backgroundColor: '#e74c3c',
            paddingVertical: 14 * SCALE,
            borderRadius: 12 * SCALE,
            marginTop: 16 * SCALE,
            alignItems: 'center',
        },
        submitBtnDisabled: { opacity: 0.5 },
        submitBtnText: { color: '#fff', fontSize: 18 * SCALE, fontWeight: 'bold' },
        backBtn: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingVertical: 10 * SCALE,
            paddingHorizontal: 20 * SCALE,
            borderRadius: 10 * SCALE,
            alignSelf: 'flex-start',
            marginBottom: 12 * SCALE,
        },
        backBtnText: { color: '#fff', fontSize: 16 * SCALE, fontWeight: '600' },
        listContainer: { maxHeight: 200 * SCALE },
        emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14 * SCALE, marginVertical: 20 * SCALE },
        selectedInfo: {
            backgroundColor: 'rgba(231,76,60,0.3)',
            padding: 12 * SCALE,
            borderRadius: 8 * SCALE,
            marginBottom: 12 * SCALE,
        },
        selectedInfoText: { color: '#fff', fontSize: 16 * SCALE, fontWeight: '600' },
    }), []);

    const renderPlayer = useCallback(({ item }) => {
        const isSelected = selectedPlayer?.id === item.id;
        return (
            <TouchableOpacity
                style={[styles.playerItem, isSelected && styles.playerItemSelected]}
                onPress={() => handleSelectPlayer(item)}
                activeOpacity={0.7}
            >
                <View>
                    <Text style={styles.playerName}>{item.name}</Text>
                    <Text style={styles.playerEmail}>{item.email}</Text>
                </View>
                {isSelected && <Text style={styles.selectedBadge}>✓ Selected</Text>}
            </TouchableOpacity>
        );
    }, [selectedPlayer, handleSelectPlayer, styles]);

    return (
        <View style={styles.container}>
            <Image source={BACKGROUND_IMAGES[currentIndex % BACKGROUND_IMAGES.length]} style={styles.backgroundImage} />
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>⚠️ Report a Player</Text>

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search player by name..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />

                {selectedPlayer && (
                    <View style={styles.selectedInfo}>
                        <Text style={styles.selectedInfoText}>Reporting: {selectedPlayer.name}</Text>
                    </View>
                )}

                {isLoading ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <View style={styles.listContainer}>
                        <FlatList
                            data={filteredPlayers}
                            keyExtractor={item => item.id}
                            renderItem={renderPlayer}
                            ListEmptyComponent={<Text style={styles.emptyText}>No players found</Text>}
                        />
                    </View>
                )}

                <Text style={styles.sectionTitle}>Reason for report:</Text>
                <TextInput
                    style={styles.reasonInput}
                    placeholder="Describe the issue..."
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={3}
                />

                <TouchableOpacity
                    style={[styles.submitBtn, (isSubmitting || !selectedPlayer || !reason.trim()) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !selectedPlayer || !reason.trim()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ReportPlayer;
