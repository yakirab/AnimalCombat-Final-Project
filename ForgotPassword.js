import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, Animated, Image, Dimensions, TouchableOpacity } from 'react-native';
import CustomButton from './CustomButton';
import { authentication } from './Config';
import soundManager from './SoundManager';
import { 
  sendPasswordResetEmail, 
  confirmPasswordReset,
  verifyPasswordResetCode 
} from 'firebase/auth';
import { useBackground } from './BackgroundContext';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5; // Use the smaller scale to maintain proportions, increased by 1.5x

const ForgotPassword = ({ navigation, route }) => {
  const { currentIndex } = useBackground();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [actionCode, setActionCode] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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

  useEffect(() => {
    // Check if we have an action code from the reset link
    if (route.params?.oobCode) {
      setActionCode(route.params.oobCode);
      setIsResetMode(true);
      // Verify the action code
      verifyPasswordResetCode(authentication, route.params.oobCode)
        .then((email) => {
          setEmail(email);
        })
        .catch((error) => {
          Alert.alert(
            "Error",
            "Invalid or expired reset link. Please try again.",
            [{ 
              text: "OK",
              onPress: () => navigation.navigate('Login')
            }]
          );
        });
    }
  }, [navigation, route.params]);

  const validateEmail = useCallback((email) => {
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email format. Please include '@' and a domain.");
      return false;
    }
    setEmailError("");
    return true;
  }, [emailPattern]);

  const validateNewPassword = useCallback((password) => {
    let errors = [];
    
    if (password.length < 6 || password.length > 12) {
      errors.push("Password must be 6-12 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Must contain at least one number");
    }
    if (!/[!@#$%^&*()?]/.test(password)) {
      errors.push("Must contain at least one special character (!@#$%^&*()?)")
    }

    if (errors.length > 0) {
      setPasswordError(errors.join('\n'));
      return false;
    }
    
    setPasswordError('');
    return true;
  }, []);

  const showTemporaryMessage = useCallback(() => {
    setShowSuccessMessage(true);
    Animated.sequence([
      // Fade in - faster animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300, // Faster
        useNativeDriver: Platform.OS !== 'web',
      }),
      // Wait - shorter time
      Animated.delay(1500), // Shorter wait
      // Fade out - faster animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300, // Faster
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start(() => {
      setShowSuccessMessage(false);
      // Faster navigation
      setTimeout(() => {
        navigation.navigate('Login');
      }, 100);
    });
  }, [fadeAnim, navigation]);

  const handleResetPassword = useCallback(() => {
    if (isResetMode) {
      // Handle setting new password
      if (!validateNewPassword(newPassword)) {
        return; // Stop if password validation fails
      }

      setIsLoading(true);
      confirmPasswordReset(authentication, actionCode, newPassword)
        .then(() => {
          Alert.alert(
            "Success",
            "Your password has been reset successfully.",
            [{ 
              text: "OK",
              onPress: () => navigation.navigate('Login')
            }]
          );
        })
        .catch((error) => {
          setPasswordError("Error resetting password. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Handle sending reset email
      if (!email) {
        setEmailError("Please enter your email address");
        return;
      }

      if (!validateEmail(email)) return;

      setIsLoading(true);
      sendPasswordResetEmail(authentication, email)
        .then(() => {
          setIsLoading(false);
          showTemporaryMessage();
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
          setEmailError(errorMessage);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isResetMode, newPassword, email, actionCode, validateNewPassword, validateEmail, showTemporaryMessage, navigation]);

  // Optimized input handlers
  const handleNewPasswordChange = useCallback((text) => {
    setNewPassword(text);
    validateNewPassword(text);
  }, [validateNewPassword]);

  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    setEmailError('');
  }, []);

  const navigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

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
      paddingHorizontal: 20 * SCALE,
    },
    secondaryButton: {
      marginTop: 10 * SCALE,
      backgroundColor: '#6c757d',
    },
    requirementsText: {
      color: '#666',
      fontSize: 14 * SCALE,
      marginBottom: 20 * SCALE,
      textAlign: 'left',
      width: '20%',
      lineHeight: 20 * SCALE,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 10 * SCALE,
      borderRadius: 8 * SCALE,
    },
    messageContainer: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -150 * SCALE }, { translateY: -25 * SCALE }],
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 20 * SCALE,
      borderRadius: 10 * SCALE,
      width: 300 * SCALE,
      alignItems: 'center',
    },
    messageText: {
      color: 'white',
      fontSize: 16 * SCALE,
      textAlign: 'center',
      fontWeight: 'bold',
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

  const toggleMute = useCallback(() => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
  }, []);

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
        <Text style={dynamicStyles.title}>Reset Password</Text>
        
        {isResetMode ? (
          // Show new password input when resetting
          <TextInput 
            placeholder="Enter new password" 
            value={newPassword} 
            onChangeText={handleNewPasswordChange}
            secureTextEntry
            style={dynamicStyles.input} 
            returnKeyType="done"
          />
        ) : (
          // Show email input when requesting reset
          <TextInput 
            placeholder="Enter your email" 
            value={email} 
            onChangeText={handleEmailChange}
            style={dynamicStyles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
          />
        )}
        
        {emailError ? <Text style={dynamicStyles.errorText}>{emailError}</Text> : null}
        {passwordError ? <Text style={dynamicStyles.errorText}>{passwordError}</Text> : null}

        <Text style={dynamicStyles.requirementsText}>
          Your new password must contain:{'\n'}
          • 6-12 characters{'\n'}
          • At least one uppercase letter (A-Z){'\n'}
          • At least one lowercase letter (a-z){'\n'}
          • At least one number (0-9){'\n'}
          • At least one special character (!@#$%^&*()?)
        </Text>

        <CustomButton 
          title={isLoading ? "Processing..." : (isResetMode ? "Set New Password" : "Reset Password")} 
          onPress={handleResetPassword}
          disabled={isLoading}
        />

        <CustomButton 
          title="Back to Login" 
          onPress={navigateToLogin}
          style={dynamicStyles.secondaryButton}
        />

        {showSuccessMessage && (
          <Animated.View 
            style={[
              dynamicStyles.messageContainer, 
              { opacity: fadeAnim }
            ]}
          >
            <Text style={dynamicStyles.messageText}>
              A password reset email has been sent to your inbox!
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

export default ForgotPassword; 