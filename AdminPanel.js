import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Alert, TouchableOpacity } from 'react-native';
import { db, authentication } from './Config';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useBackground } from './BackgroundContext';
import backgroundImages from './backgroundImages';
import CustomButton from './CustomButton';

const AdminPanel = ({ navigation }) => {
    const { currentIndex } = useBackground();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    const checkAdminAndFetch = async () => {
        try {
            const currentUser = authentication.currentUser;
            if (!currentUser) {
                navigation.goBack();
                return;
            }

            // Check if current user is admin
            const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
            if (!userDoc.exists() || !userDoc.data().isAdmin) {
                Alert.alert('Access Denied', 'You do not have admin privileges.');
                navigation.goBack();
                return;
            }

            setIsAdmin(true);
            await fetchUsers();
        } catch (error) {
            console.error('Admin check error:', error);
            Alert.alert('Error', 'Failed to verify admin access.');
            navigation.goBack();
        }
    };

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const snapshot = await getDocs(collection(db, 'Users'));
            const usersList = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetScore = (userId, username) => {
        Alert.alert(
            'Reset Score',
            `Reset score for "${username}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'Users', userId), {
                                score: 0,
                                gamesPlayed: 0,
                            });
                            await fetchUsers();
                            Alert.alert('Success', `Score reset for ${username}`);
                        } catch (error) {
                            console.error('Reset error:', error);
                            Alert.alert('Error', 'Failed to reset score.');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteUser = (userId, username) => {
        Alert.alert(
            'Delete User',
            `Permanently delete "${username}"? This only removes their Firestore data, not their Auth account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'Users', userId));
                            await fetchUsers();
                            Alert.alert('Success', `User ${username} data deleted.`);
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete user.');
                        }
                    },
                },
            ]
        );
    };

    const renderUser = ({ item }) => {
        const isCurrentUser = item.id === authentication.currentUser?.uid;

        return (
            <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
                <View style={styles.userInfo}>
                    <Text style={styles.usernameText}>
                        {item.username || item.name || 'Unknown'}
                        {item.isAdmin && ' 👑'}
                        {isCurrentUser && ' (You)'}
                    </Text>
                    <Text style={styles.emailText}>{item.email}</Text>
                    <Text style={styles.statsText}>
                        Score: {item.score || 0} | Games: {item.gamesPlayed || 0}
                    </Text>
                </View>
                {!isCurrentUser && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => handleResetScore(item.id, item.username || item.name)}
                        >
                            <Text style={styles.actionButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteUser(item.id, item.username || item.name)}
                        >
                            <Text style={styles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (!isAdmin) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Image source={backgroundImages[currentIndex]} style={styles.backgroundImage} />
            <View style={styles.contentContainer}>
                <Text style={styles.title}>👑 Admin Panel</Text>
                <Text style={styles.subtitle}>{users.length} registered users</Text>

                <View style={styles.tableContainer}>
                    {isLoading ? (
                        <Text style={styles.loadingText}>Loading users...</Text>
                    ) : (
                        <FlatList
                            data={users}
                            renderItem={renderUser}
                            keyExtractor={(item) => item.id}
                            style={styles.list}
                        />
                    )}
                </View>

                <CustomButton
                    title="Back"
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 20,
    },
    tableContainer: {
        width: '90%',
        maxWidth: 600,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 15,
        padding: 15,
        flex: 1,
        maxHeight: '65%',
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    currentUserRow: {
        backgroundColor: 'rgba(0, 123, 255, 0.3)',
        borderRadius: 8,
    },
    userInfo: {
        flex: 1,
    },
    usernameText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emailText: {
        color: '#aaa',
        fontSize: 13,
        marginTop: 2,
    },
    statsText: {
        color: '#4CAF50',
        fontSize: 13,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    resetButton: {
        backgroundColor: '#FFA000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    deleteButton: {
        backgroundColor: '#F44336',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    list: {
        flex: 1,
    },
    backButton: {
        marginTop: 20,
        marginBottom: 30,
        backgroundColor: '#6c757d',
    },
});

export default AdminPanel;
