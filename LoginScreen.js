import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Animated, TouchableOpacity, Alert, Image } from 'react-native';
import CustomButton from './CustomButton'; // Import the reusable button
import { authentication } from './Config';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useBackground } from './BackgroundContext';
import RunningAnimation from './RunningAnimation';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0)); // Initial opacity
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { currentIndex, setIsAnimationRunning } = useBackground();
  let passwordInput;

  const images = [
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
  ];

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@.+\..+$/; // Ensure it contains @ and .
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email format. Please include '@' and a domain.");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (password) => {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()?]).{6,12}$/; // Updated regex
    if (!passwordPattern.test(password)) {
      setPasswordError("Password must be 6-12 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character.");
    } else {
      setPasswordError("");
    }
  };

  const handleLogin = () => {
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
        console.log('User logged in:', user.email);
        
        setTimeout(() => {
          navigation.navigate('GameSession');
        }, 500);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 750,
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
        console.error('Login error:', error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleForgotPassword = () => {
    if (!email) {
      setEmailError("Please enter your email address first");
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@.+\..+$/;
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
        console.error('Password reset error:', error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleKeyPress = (e, nextField, isSubmit = false) => {
    if (e.nativeEvent.key === 'Enter') {
      if (isSubmit) {
        handleLogin();
      } else if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.backgroundImage} />
      {/* <RunningAnimation /> */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Login</Text>
        
        <TextInput 
          placeholder="Email" 
          value={email} 
          onChangeText={(text) => {
            setEmail(text);
            validateEmail(text);
            setLoginError('');
          }} 
          style={styles.input} 
          onKeyPress={(e) => handleKeyPress(e, passwordInput)}
          returnKeyType="next"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        
        <TextInput 
          ref={(input) => { passwordInput = input; }}
          placeholder="Password" 
          value={password} 
          onChangeText={(text) => {
            setPassword(text);
            validatePassword(text);
            setLoginError('');
          }} 
          secureTextEntry 
          style={styles.input} 
          onKeyPress={(e) => handleKeyPress(e, null, true)}
          returnKeyType="done"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        
        {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

        <View style={styles.linkContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
            <Text style={styles.linkText}>Don't have an account? Register now!</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('ForgotPassword')} 
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <CustomButton 
          title={isLoading ? "Please wait..." : "Login"} 
          onPress={handleLogin}
          disabled={isLoading}
        />

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.successText}>Login successful!</Text>
        </Animated.View>
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
    width: '20%', // Set width to 20% for better input field size
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
  successText: {
    color: 'green',
    fontSize: 18,
    marginTop: 20,
  },
  registerContainer: {
    marginTop: 20,
  },
  registerText: {
    color: '#007BFF', // Link color
    textDecorationLine: 'underline', // Underline to indicate it's a link
  },
  linkContainer: {
    width: '20%',
    marginVertical: 10,
    alignItems: 'center',
  },
  linkButton: {
    marginVertical: 5,
  },
  linkText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});

export default LoginScreen; 