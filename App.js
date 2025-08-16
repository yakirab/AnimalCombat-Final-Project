import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackgroundProvider } from './BackgroundContext';
import LoadingScreen from './LoadingScreen';
import LoginScreen from './LoginScreen';
import GameSession from './GameSession';
import Register from './Register';
import ForgotPassword from './ForgotPassword';


const Stack = createNativeStackNavigator();

// Create a wrapper component to handle loading states only for GameSession
const GameSessionWrapper = ({ component: Component, ...props }) => {
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

  return <Component {...props} />;
};

export default function App() {
  return (
    <BackgroundProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login" 
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
            component={(props) => <GameSessionWrapper component={GameSession} {...props} />} 
          />
          <Stack.Screen 
            name="Register" 
            component={Register}
          />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPassword}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </BackgroundProvider>
  );
}
