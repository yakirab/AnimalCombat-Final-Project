import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Animated, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import CustomButton from './CustomButton'; // Import the reusable button
import { authentication } from './Config';
import soundManager from './SoundManager';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useBackground } from './BackgroundContext';
import RunningAnimation from './RunningAnimation';
import { firestore } from './Config';
import { doc, getDoc } from "firebase/firestore";

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5; // Use the smaller scale to maintain proportions, increased by 1.5x

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0)); // Initial opacity
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const { currentIndex, setIsAnimationRunning } = useBackground();
  let passwordInput;

  // Memoize images array to prevent recreation on every render
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

  // Memoize validation patterns
  const emailPattern = useMemo(() => /^[a-zA-Z0-9._%+-]+@.+\..+$/, []);
  const passwordPattern = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()?]).{6,12}$/, []);

  const validateEmail = useCallback((email) => {
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email format. Please include '@' and a domain.");
    } else {
      setEmailError("");
    }
  }, [emailPattern]);

  const validatePassword = useCallback((password) => {
    if (!passwordPattern.test(password)) {
      setPasswordError("Password must be 6-12 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character.");
    } else {
      setPasswordError("");
    }
  }, [passwordPattern]);

  const handleLogin = useCallback(() => {
    validateEmail(email);
    validatePassword(password);
    setLoginError('');

    if (emailError || passwordError || !email || !password) {
      return;
    }

    setIsLoading(true);

    signInWithEmailAndPassword(authentication, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        
        // Faster navigation - reduced delay
        setTimeout(() => {
          navigation.navigate('GameSession');
        }, 200);

        // Faster animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400, // Faster animation
          useNativeDriver: true,
        }).start();
      })
      .catch((error) => {
        let errorMessage = "";
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = "The email or password is incorrect";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email format";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many login attempts. Please try again later";
            break;
          default:
            errorMessage = "Login error. Please try again";
        }
        setLoginError(errorMessage);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [email, password, emailError, passwordError, validateEmail, validatePassword, navigation, fadeAnim]);

  const handleForgotPassword = useCallback(() => {
    if (!email) {
      setEmailError("Please enter your email address first");
      return;
    }

    if (!emailPattern.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    sendPasswordResetEmail(authentication, email)
      .then(() => {
        Alert.alert(
          "Password Reset Email Sent",
          "Please check your email to reset your password. Make sure to check your spam folder.",
          [{ text: "OK" }]
        );
      })
      .catch((error) => {
        let errorMessage = "";
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email format";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many attempts. Please try again later";
            break;
          default:
            errorMessage = "Error sending reset email. Please try again";
        }
        setLoginError(errorMessage);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [email, emailPattern]);

  const handleKeyPress = useCallback((e, nextField, isSubmit = false) => {
    if (e.nativeEvent.key === 'Enter') {
      if (isSubmit) {
        handleLogin();
      } else if (nextField) {
        nextField.focus();
      }
    }
  }, [handleLogin]);

  // Optimized email change handler
  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    validateEmail(text);
    setLoginError('');
  }, [validateEmail]);

  // Optimized password change handler
  const handlePasswordChange = useCallback((text) => {
    setPassword(text);
    validatePassword(text);
    setLoginError('');
  }, [validatePassword]);

  // Navigation handlers
  const navigateToRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  const navigateToForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  const toggleMute = useCallback(() => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
  }, []);

  // Memoize styles for better performance
  const dynamicStyles = useMemo(() => StyleSheet.create({
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
      justifyContent: 'center',
      padding: 20 * SCALE,
      zIndex: 1,
    },
    title: {
      fontSize: 28 * SCALE,
      fontWeight: 'bold',
      marginBottom: 20 * SCALE,
      color: '#333',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
    input: {
      width: '20%',
      borderWidth: 1,
      borderColor: '#ced4da',
      borderRadius: 25 * SCALE,
      marginBottom: 15 * SCALE,
      padding: 15 * SCALE,
      backgroundColor: '#fff',
      fontSize: 16 * SCALE,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    errorText: {
      color: 'red',
      marginBottom: 10 * SCALE,
      fontSize: 14 * SCALE,
      textAlign: 'center',
    },
    successText: {
      color: 'green',
      fontSize: 18 * SCALE,
      marginTop: 20 * SCALE,
      fontWeight: 'bold',
    },
    linkContainer: {
      width: '20%',
      marginVertical: 10 * SCALE,
      alignItems: 'center',
    },
    linkButton: {
      marginVertical: 5 * SCALE,
      padding: 5 * SCALE,
    },
    linkText: {
      color: '#007BFF',
      textDecorationLine: 'underline',
      fontSize: 14 * SCALE,
      fontWeight: '500',
    },
    muteButton: {
      position: 'absolute',
      top: 40 * SCALE,
      right: 20 * SCALE,
      width: 50 * SCALE,
      height: 50 * SCALE,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 25 * SCALE,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    muteButtonText: {
      fontSize: 24 * SCALE,
      color: 'white',
    },
  }), [SCALE]);

  return (
    <View style={dynamicStyles.container}>
      <Image source={images[currentIndex]} style={dynamicStyles.backgroundImage} />
      
      {/* Mute Button */}
      <TouchableOpacity 
        style={dynamicStyles.muteButton}
        onPress={toggleMute}
      >
        <Text style={dynamicStyles.muteButtonText}>
          {isMuted ? '🔇' : '🔊'}
        </Text>
      </TouchableOpacity>
      
      <View style={dynamicStyles.contentContainer}>
        <Text style={dynamicStyles.title}>Login</Text>
        
        <TextInput 
          placeholder="Email" 
          value={email} 
          onChangeText={handleEmailChange}
          style={dynamicStyles.input} 
          onKeyPress={(e) => handleKeyPress(e, passwordInput)}
          returnKeyType="next"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {emailError ? <Text style={dynamicStyles.errorText}>{emailError}</Text> : null}
        
        <TextInput 
          ref={(input) => { passwordInput = input; }}
          placeholder="Password" 
          value={password} 
          onChangeText={handlePasswordChange}
          secureTextEntry 
          style={dynamicStyles.input} 
          onKeyPress={(e) => handleKeyPress(e, null, true)}
          returnKeyType="done"
        />
        {passwordError ? <Text style={dynamicStyles.errorText}>{passwordError}</Text> : null}
        
        {loginError ? <Text style={dynamicStyles.errorText}>{loginError}</Text> : null}

        <View style={dynamicStyles.linkContainer}>
          <TouchableOpacity onPress={() => {
            soundManager.playClick();
            navigateToRegister();
          }} style={dynamicStyles.linkButton}>
            <Text style={dynamicStyles.linkText}>Don't have an account? Register now!</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              soundManager.playClick();
              navigateToForgotPassword();
            }} 
            style={dynamicStyles.linkButton}
          >
            <Text style={dynamicStyles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <CustomButton 
          title={isLoading ? "Please wait..." : "Login"} 
          onPress={handleLogin}
          disabled={isLoading}
        />

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={dynamicStyles.successText}>Login successful!</Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default LoginScreen; 