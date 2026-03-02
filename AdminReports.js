import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
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
    const [players, setPlayers] = useState([]);
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const safeBackgrounds = useMemo(
        () => (Array.isArray(BACKGROUND_IMAGES) && BACKGROUND_IMAGES.length > 0
            ? BACKGROUND_IMAGES
            : [require('./assets/MenuBackGround/background/bg1.png')]),
        []
    );

    useEffect(() => {
        setIsLoading(true);
        const unsubUsers = onSnapshot(
            collection(firestore, 'Users'),
            (usersSnap) => {
                const userList = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
                userList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setPlayers(userList);
            },
            (err) => {
                console.error('Failed to subscribe users:', err);
                Alert.alert('Error', 'Failed to load players');
                setIsLoading(false);
            }
        );

        const unsubReports = onSnapshot(
            collection(firestore, 'Reports'),
            (reportsSnap) => {
                const reportList = reportsSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
                reportList.sort((a, b) => {
                    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
                    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
                    return bTime - aTime;
                });
                setReports(reportList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Failed to subscribe reports:', err);
                Alert.alert('Error', 'Failed to load reports');
                setIsLoading(false);
            }
        );

        return () => {
            unsubUsers();
            unsubReports();
        };
    }, []);

    const handleDeleteReport = useCallback(async (reportId) => {
        Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(firestore, 'Reports', reportId));
                        setReports((prev) => prev.filter((r) => r.id !== reportId));
                    } catch (err) {
                        console.error('Failed to delete report:', err);
                        Alert.alert('Error', 'Failed to delete report');
                    }
                }
            }
        ]);
    }, []);

    const handleMarkDone = useCallback(async (reportId) => {
        try {
            const resolvedAt = Date.now();
            await updateDoc(doc(firestore, 'Reports', reportId), { status: 'done', resolvedAt });
            setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'done', resolvedAt } : r)));
        } catch (err) {
            console.error('Failed to mark report done:', err);
            Alert.alert('Error', 'Failed to mark report as done');
        }
    }, []);

    const handleDeleteAllForPlayer = useCallback((playerReports, playerLabel) => {
        if (!playerReports.length) return;
        Alert.alert('Delete All Reports', `Delete all reports for ${playerLabel}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete All',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const batch = writeBatch(firestore);
                        playerReports.forEach((r) => batch.delete(doc(firestore, 'Reports', r.id)));
                        await batch.commit();
                        setReports((prev) => prev.filter((r) => !playerReports.some((pr) => pr.id === r.id)));
                    } catch (err) {
                        console.error('Failed to delete player reports:', err);
                        Alert.alert('Error', 'Failed to delete all reports for this player');
                    }
                }
            }
        ]);
    }, []);

    const handleMarkAllDoneForPlayer = useCallback(async (playerReports) => {
        if (!playerReports.length) return;
        try {
            const resolvedAt = Date.now();
            const batch = writeBatch(firestore);
            playerReports.forEach((r) => {
                batch.update(doc(firestore, 'Reports', r.id), { status: 'done', resolvedAt });
            });
            await batch.commit();
            setReports((prev) => prev.map((r) => (
                playerReports.some((pr) => pr.id === r.id) ? { ...r, status: 'done', resolvedAt } : r
            )));
        } catch (err) {
            console.error('Failed to mark player reports done:', err);
            Alert.alert('Error', 'Failed to mark all reports as done');
        }
    }, []);

    const handleBack = useCallback(() => {
        soundManager.playClick();
        navigation.goBack();
    }, [navigation]);

    const groupedReports = useMemo(() => {
        const groups = {};

        players.forEach((p) => {
            const key = p.email || p.name || p.id;
            groups[key] = {
                key,
                name: p.name || 'Unknown',
                email: p.email || '',
                reports: [],
            };
        });

        reports.forEach((r) => {
            const key = r.reportedEmail || r.reportedName || 'Unknown';
            if (!groups[key]) {
                groups[key] = {
                    key,
                    name: r.reportedName || 'Unknown',
                    email: r.reportedEmail || '',
                    reports: [],
                };
            }
            groups[key].reports.push(r);
        });

        const values = Object.values(groups);
        values.sort((a, b) => (b.reports.length - a.reports.length) || a.name.localeCompare(b.name));
        return values;
    }, [reports, players]);

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
        groupActionsRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8 * SCALE,
            paddingHorizontal: 12 * SCALE,
            paddingVertical: 8 * SCALE,
        },
        groupActionBtn: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingVertical: 6 * SCALE,
            paddingHorizontal: 10 * SCALE,
            borderRadius: 6 * SCALE,
        },
        groupActionText: { color: '#fff', fontSize: 12 * SCALE, fontWeight: '600' },
        reportItem: {
            padding: 12 * SCALE,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
        },
        reportReason: { color: '#fff', fontSize: 14 * SCALE, marginBottom: 4 * SCALE },
        reportMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11 * SCALE },
        statusText: { color: '#ffd166', fontSize: 11 * SCALE, marginTop: 4 * SCALE, fontWeight: '700' },
        reportActionsRow: {
            flexDirection: 'row',
            gap: 8 * SCALE,
            marginTop: 6 * SCALE,
            justifyContent: 'flex-end',
        },
        deleteBtn: {
            backgroundColor: 'rgba(231,76,60,0.6)',
            paddingVertical: 6 * SCALE,
            paddingHorizontal: 12 * SCALE,
            borderRadius: 6 * SCALE,
        },
        deleteBtnText: { color: '#fff', fontSize: 12 * SCALE, fontWeight: '600' },
        doneBtn: {
            backgroundColor: 'rgba(76,175,80,0.7)',
            paddingVertical: 6 * SCALE,
            paddingHorizontal: 12 * SCALE,
            borderRadius: 6 * SCALE,
        },
        doneBtnText: { color: '#fff', fontSize: 12 * SCALE, fontWeight: '600' },
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

            {group.reports.length > 0 && (
                <View style={styles.groupActionsRow}>
                    <TouchableOpacity style={styles.groupActionBtn} onPress={() => handleMarkAllDoneForPlayer(group.reports)}>
                        <Text style={styles.groupActionText}>Mark All Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.groupActionBtn, { backgroundColor: 'rgba(231,76,60,0.6)' }]}
                        onPress={() => handleDeleteAllForPlayer(group.reports, group.name)}
                    >
                        <Text style={styles.groupActionText}>Delete All</Text>
                    </TouchableOpacity>
                </View>
            )}

            {group.reports.map((report) => (
                <View key={report.id} style={styles.reportItem}>
                    <Text style={styles.reportReason}>"{report.reason}"</Text>
                    <Text style={styles.reportMeta}>
                        Reported by: {report.reporterName} | {formatDate(report.createdAt)}
                    </Text>
                    <Text style={styles.statusText}>Status: {(report.status || 'open').toUpperCase()}</Text>
                    <View style={styles.reportActionsRow}>
                        {report.status !== 'done' && (
                            <TouchableOpacity style={styles.doneBtn} onPress={() => handleMarkDone(report.id)}>
                                <Text style={styles.doneBtnText}>Mark Done</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteReport(report.id)}>
                            <Text style={styles.deleteBtnText}>Delete Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    ), [styles, handleDeleteReport, handleMarkDone, handleDeleteAllForPlayer, handleMarkAllDoneForPlayer, formatDate]);

    return (
        <View style={styles.container}>
            <Image source={safeBackgrounds[currentIndex % safeBackgrounds.length]} style={styles.backgroundImage} />
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Player Reports</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>{reports.length} Total Reports</Text>
                    </View>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>{players.length} Total Players</Text>
                    </View>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : groupedReports.length === 0 ? (
                    <Text style={styles.emptyText}>No players found</Text>
                ) : (
                    <FlatList
                        data={groupedReports}
                        keyExtractor={(item) => item.key}
                        renderItem={renderGroup}
                    />
                )}
            </View>
        </View>
    );
};

export default AdminReports;
