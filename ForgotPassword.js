import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, Animated, Image } from 'react-native';
import CustomButton from './CustomButton';
import { authentication } from './Config';
import {
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { useBackground } from './BackgroundContext';
import backgroundImages from './backgroundImages';




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
  }, []);

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@.+\..+$/;
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email format. Please include '@' and a domain.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validateNewPassword = (password) => {
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
  };

  const handleResetPassword = () => {
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
  };

  const showTemporaryMessage = () => {
    setShowSuccessMessage(true);
    Animated.sequence([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Wait
      Animated.delay(2000),
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSuccessMessage(false);
      navigation.navigate('Login');
    });
  };

  return (
    <View style={styles.container}>
      <Image source={backgroundImages[currentIndex]} style={styles.backgroundImage} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Reset Password</Text>

        {isResetMode ? (
          // Show new password input when resetting
          <TextInput
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              validateNewPassword(text); // Validate on each change
            }}
            secureTextEntry
            style={styles.input}
          />
        ) : (
          // Show email input when requesting reset
          <TextInput
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            style={styles.input}
          />
        )}

        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <Text style={styles.requirementsText}>
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
          onPress={() => navigation.navigate('Login')}
          style={styles.secondaryButton}
        />

        {showSuccessMessage && (
          <Animated.View
            style={[
              styles.messageContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.messageText}>
              A password reset email has been sent to your inbox!
            </Text>
          </Animated.View>
        )}
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
    justifyContent: 'center',
    padding: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 25,
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#6c757d',
  },
  requirementsText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'left',
    width: '80%',
    lineHeight: 20,
  },
  messageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ForgotPassword; 