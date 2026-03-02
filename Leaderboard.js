import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { db, authentication } from './Config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useBackground } from './BackgroundContext';
import backgroundImages from './backgroundImages';
import CustomButton from './CustomButton';

const Leaderboard = ({ navigation }) => {
    const { currentIndex } = useBackground();
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentUserId = authentication.currentUser?.uid;

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setIsLoading(true);
            const q = query(
                collection(db, 'Users'),
                orderBy('score', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const playersList = snapshot.docs.map((doc, index) => ({
                id: doc.id,
                rank: index + 1,
                ...doc.data(),
            }));
            setPlayers(playersList);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderPlayer = ({ item }) => {
        const isCurrentUser = item.id === currentUserId;
        const rankEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;

        return (
            <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
                <Text style={[styles.rankText, isCurrentUser && styles.currentUserText]}>{rankEmoji}</Text>
                <Text style={[styles.usernameText, isCurrentUser && styles.currentUserText]} numberOfLines={1}>
                    {item.username || item.name || 'Unknown'}
                </Text>
                <Text style={[styles.scoreText, isCurrentUser && styles.currentUserText]}>{item.score || 0}</Text>
                <Text style={[styles.gamesText, isCurrentUser && styles.currentUserText]}>{item.gamesPlayed || 0}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Image source={backgroundImages[currentIndex]} style={styles.backgroundImage} />
            <View style={styles.contentContainer}>
                <Text style={styles.title}>🏆 Leaderboard</Text>

                <View style={styles.tableContainer}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <Text style={styles.headerText}>Rank</Text>
                        <Text style={[styles.headerText, styles.usernameHeader]}>Player</Text>
                        <Text style={styles.headerText}>Score</Text>
                        <Text style={styles.headerText}>Games</Text>
                    </View>

                    {isLoading ? (
                        <Text style={styles.loadingText}>Loading...</Text>
                    ) : players.length === 0 ? (
                        <Text style={styles.loadingText}>No players yet</Text>
                    ) : (
                        <FlatList
                            data={players}
                            renderItem={renderPlayer}
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
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    tableContainer: {
        width: '90%',
        maxWidth: 600,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 15,
        padding: 15,
        flex: 1,
        maxHeight: '70%',
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#FFD700',
        marginBottom: 5,
    },
    headerText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 16,
        flex: 1,
        textAlign: 'center',
    },
    usernameHeader: {
        flex: 2,
        textAlign: 'left',
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    currentUserRow: {
        backgroundColor: 'rgba(0, 123, 255, 0.3)',
        borderRadius: 8,
    },
    rankText: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
        textAlign: 'center',
    },
    usernameText: {
        color: '#fff',
        fontSize: 16,
        flex: 2,
    },
    scoreText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    gamesText: {
        color: '#aaa',
        fontSize: 14,
        flex: 1,
        textAlign: 'center',
    },
    currentUserText: {
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

export default Leaderboard;
