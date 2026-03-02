import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackgroundProvider } from './BackgroundContext';
import { authentication } from './Config';
import { onAuthStateChanged } from 'firebase/auth';
import LoadingScreen from './LoadingScreen';
import LoginScreen from './LoginScreen';
import GameSession from './GameSession';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import Leaderboard from './Leaderboard';
import AdminPanel from './AdminPanel';

const Stack = createNativeStackNavigator();

// Proper wrapper component defined outside of render to avoid remounting
const GameSessionWithLoading = (props) => {
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <GameSession {...props} />;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Listen for auth state changes (persists login across app restarts)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authentication, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  if (isCheckingAuth) {
    return (
      <BackgroundProvider>
        <LoadingScreen />
      </BackgroundProvider>
    );
  }

  return (
    <BackgroundProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={user ? "GameSession" : "Login"}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="GameSession"
            component={GameSessionWithLoading}
          />
          <Stack.Screen
            name="Register"
            component={Register}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPassword}
          />
          <Stack.Screen
            name="Leaderboard"
            component={Leaderboard}
          />
          <Stack.Screen
            name="AdminPanel"
            component={AdminPanel}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </BackgroundProvider>
  );
}
