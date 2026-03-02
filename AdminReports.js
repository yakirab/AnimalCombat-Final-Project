import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from './Config';
import { useBackground } from './BackgroundContext';
import soundManager from './SoundManager';
import BACKGROUND_IMAGES from './backgroundImages';

const { width, height } = Dimensions.get('window');
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5;

const AdminReports = () => {
    const { currentIndex } = useBackground();
    const navigation = useNavigation();
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadReports = useCallback(async () => {
        try {
            setIsLoading(true);
            const snap = await getDocs(collection(firestore, 'Reports'));
            const list = [];
            snap.forEach(d => {
                list.push({ id: d.id, ...d.data() });
            });
            // Sort by createdAt descending (newest first)
            list.sort((a, b) => {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
                return bTime - aTime;
            });
            setReports(list);
        } catch (err) {
            console.error('Failed to load reports:', err);
            Alert.alert('Error', 'Failed to load reports');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadReports(); }, [loadReports]);

    const handleDeleteReport = useCallback(async (reportId) => {
        Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteDoc(doc(firestore, 'Reports', reportId));
                        setReports(prev => prev.filter(r => r.id !== reportId));
                    } catch (err) {
                        console.error('Failed to delete report:', err);
                        Alert.alert('Error', 'Failed to delete report');
                    }
                }
            }
        ]);
    }, []);

    const handleBack = useCallback(() => {
        soundManager.playClick();
        navigation.goBack();
    }, [navigation]);

    // Group reports by reported player
    const groupedReports = useMemo(() => {
        const groups = {};
        reports.forEach(r => {
            const key = r.reportedEmail || r.reportedName || 'Unknown';
            if (!groups[key]) {
                groups[key] = { name: r.reportedName, email: r.reportedEmail, reports: [] };
            }
            groups[key].reports.push(r);
        });
        return Object.values(groups);
    }, [reports]);

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
        backBtn: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingVertical: 10 * SCALE,
            paddingHorizontal: 20 * SCALE,
            borderRadius: 10 * SCALE,
            alignSelf: 'flex-start',
            marginBottom: 12 * SCALE,
        },
        backBtnText: { color: '#fff', fontSize: 16 * SCALE, fontWeight: '600' },
        playerGroup: {
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12 * SCALE,
            marginBottom: 16 * SCALE,
            overflow: 'hidden',
        },
        playerHeader: {
            backgroundColor: 'rgba(231,76,60,0.4)',
            padding: 12 * SCALE,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        playerHeaderName: { color: '#fff', fontSize: 18 * SCALE, fontWeight: 'bold' },
        playerHeaderEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 12 * SCALE },
        reportCount: { color: '#e74c3c', fontSize: 14 * SCALE, fontWeight: 'bold' },
        reportItem: {
            padding: 12 * SCALE,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
        },
        reportReason: { color: '#fff', fontSize: 14 * SCALE, marginBottom: 4 * SCALE },
        reportMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11 * SCALE },
        deleteBtn: {
            backgroundColor: 'rgba(231,76,60,0.6)',
            paddingVertical: 6 * SCALE,
            paddingHorizontal: 12 * SCALE,
            borderRadius: 6 * SCALE,
            alignSelf: 'flex-end',
            marginTop: 6 * SCALE,
        },
        deleteBtnText: { color: '#fff', fontSize: 12 * SCALE, fontWeight: '600' },
        emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 16 * SCALE, marginTop: 40 * SCALE },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 20 * SCALE,
            marginBottom: 16 * SCALE,
        },
        statBadge: {
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingVertical: 6 * SCALE,
            paddingHorizontal: 14 * SCALE,
            borderRadius: 20 * SCALE,
        },
        statText: { color: '#fff', fontSize: 14 * SCALE, fontWeight: '600' },
    }), []);

    const formatDate = useCallback((ts) => {
        if (!ts) return 'Unknown date';
        const ms = ts.toMillis ? ts.toMillis() : ts;
        return new Date(ms).toLocaleString();
    }, []);

    const renderGroup = useCallback(({ item: group }) => (
        <View style={styles.playerGroup}>
            <View style={styles.playerHeader}>
                <View>
                    <Text style={styles.playerHeaderName}>{group.name}</Text>
                    <Text style={styles.playerHeaderEmail}>{group.email}</Text>
                </View>
                <Text style={styles.reportCount}>{group.reports.length} report{group.reports.length !== 1 ? 's' : ''}</Text>
            </View>
            {group.reports.map(report => (
                <View key={report.id} style={styles.reportItem}>
                    <Text style={styles.reportReason}>"{report.reason}"</Text>
                    <Text style={styles.reportMeta}>
                        Reported by: {report.reporterName} • {formatDate(report.createdAt)}
                    </Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteReport(report.id)}>
                        <Text style={styles.deleteBtnText}>🗑 Delete Report</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    ), [styles, handleDeleteReport, formatDate]);

    return (
        <View style={styles.container}>
            <Image source={BACKGROUND_IMAGES[currentIndex % BACKGROUND_IMAGES.length]} style={styles.backgroundImage} />
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>📋 Player Reports</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>{reports.length} Total Reports</Text>
                    </View>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>{groupedReports.length} Reported Players</Text>
                    </View>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : groupedReports.length === 0 ? (
                    <Text style={styles.emptyText}>No reports yet ✅</Text>
                ) : (
                    <FlatList
                        data={groupedReports}
                        keyExtractor={(item, idx) => item.email || String(idx)}
                        renderItem={renderGroup}
                    />
                )}
            </View>
        </View>
    );
};

export default AdminReports;
