import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Animated, TouchableOpacity, Image } from 'react-native';
import CustomButton from './CustomButton'; // Import the reusable button
import { authentication } from './Config'; // Changed from './config' to './Config'
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import Firebase auth method
import { useBackground } from './BackgroundContext'; // Import useBackground


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

const Register = ({ navigation }) => {
  const { currentIndex } = useBackground();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0)); // Initial opacity
  let passwordInput;
  let confirmPasswordInput;

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

  const handleRegister = () => {
    validateEmail(email);
    validatePassword(password);

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }

    if (emailError || passwordError || confirmPasswordError || !email || !password || !confirmPassword) {
      return; // Prevent registration if there's an error
    }

    // Proceed with registration logic using Firebase
    createUserWithEmailAndPassword(authentication, email, password)
      .then((userCredential) => {
        // Successfully registered
        const user = userCredential.user;
        console.log('User registered:', user);
        
        // Optionally navigate to the login screen or show a success message
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }).start(() => {
          navigation.navigate('Login'); // Navigate to Login screen
        });
      })
      .catch((error) => {
        const errorMessage = error.message;
        console.error('Registration error:', errorMessage);
        // Handle registration errors (e.g., show an alert)
      });
  };

  const handleKeyPress = (e, nextField, isSubmit = false) => {
    if (e.nativeEvent.key === 'Enter') {
      if (isSubmit) {
        handleRegister();
      } else if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.backgroundImage} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Register</Text>
        
        <TextInput 
          placeholder="Email" 
          value={email} 
          onChangeText={(text) => {
            setEmail(text);
            validateEmail(text);
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
          }} 
          secureTextEntry 
          style={styles.input} 
          onKeyPress={(e) => handleKeyPress(e, confirmPasswordInput)}
          returnKeyType="next"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TextInput 
          ref={(input) => { confirmPasswordInput = input; }}
          placeholder="Confirm Password" 
          value={confirmPassword} 
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (text !== password) {
              setConfirmPasswordError("Passwords do not match.");
            } else {
              setConfirmPasswordError("");
            }
          }} 
          secureTextEntry 
          style={styles.input} 
          onKeyPress={(e) => handleKeyPress(e, null, true)}
          returnKeyType="done"
        />
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? Login now!</Text>
        </TouchableOpacity>

        <CustomButton title="Register" onPress={handleRegister} />

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.successText}>Registration successful!</Text>
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
    zIndex: 1, // Ensure content is above background
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
  loginContainer: {
    marginTop: 20,
  },
  loginText: {
    color: '#007BFF', // Link color
    textDecorationLine: 'underline', // Underline to indicate it's a link
  },
});

export default Register; 