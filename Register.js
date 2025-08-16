import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import CustomButton from './CustomButton';
import { authentication, firebase } from './Config';
import soundManager from './SoundManager';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useBackground } from './BackgroundContext';
import { firestore } from './Config'; // Your initialized Firestore instance
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y) * 1.5; // Use the smaller scale to maintain proportions, increased by 1.5x

const Register = ({ navigation }) => {
  const { currentIndex } = useBackground();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  const passwordPattern = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()?]).{6,12}$/, []);
  const datePattern = useMemo(() => /^\d{4}-\d{2}-\d{2}$/, []);

  const validateName = useCallback((name) => {
    if (name.length < 2) {
      setNameError("Name must be at least 2 characters long");
    } else {
      setNameError("");
    }
  }, []);

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

  const validateBirthDate = useCallback((date) => {
    if (!datePattern.test(date)) {
      setBirthDateError("Please enter date in YYYY-MM-DD format");
      return;
    }
    const [yStr, mStr, dStr] = date.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      setBirthDateError("Invalid date components");
      return;
    }
    if (month < 1 || month > 12) {
      setBirthDateError("Month must be between 1 and 12");
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      setBirthDateError(`Day must be between 1 and ${daysInMonth}`);
      return;
    }
    const birth = new Date(year, month - 1, day);
    const now = new Date();
    if (birth.getTime() > now.getTime()) {
      setBirthDateError("Birth date cannot be in the future");
      return;
    }
    setBirthDateError("");
  }, [datePattern]);

  const validateConfirmPassword = useCallback((confirmPass) => {
    if (confirmPass !== password) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  }, [password]);

  const handleRegister = useCallback(async () => {
    try {
      setIsLoading(true);
      validateName(name);
    validateEmail(email);
    validatePassword(password);
      validateBirthDate(birthDate);

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
        setIsLoading(false);
        return;
    }

      if (nameError || emailError || passwordError || confirmPasswordError || birthDateError || 
          !name || !email || !password || !confirmPassword || !birthDate) {
        setIsLoading(false);
        return;
      }

      try {
        // Ensure unique username (name)
        const q = query(collection(firestore, 'Users'), where('name', '==', name));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          Alert.alert('Username Taken', 'This username is already in use. Please choose another name.');
          setIsLoading(false);
          return;
        }

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(authentication, email, password);
        const user = userCredential.user;

        // Parse birth date
        const [year, month, day] = birthDate.split('-');

        // Create the user document
        const ALL_CHARACTER_NAMES = ['Cow', 'Tiger', 'Chameleon'];
        const initialUnlocked = [ALL_CHARACTER_NAMES[Math.floor(Math.random() * ALL_CHARACTER_NAMES.length)]];
        // Age calculation for initial achievements
        const now = new Date();
        const birthDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const ageYears = (now.getTime() - birthDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const initialObviousLiar = Number.isFinite(ageYears) && (ageYears > 100 || ageYears < 1.5);
        const userDoc = {
          userId: user.uid,
          name,
          email,
          birthDate: {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day)
          },
          createdAt: serverTimestamp(),
          // Progress tracking
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          unlockedCharacters: initialUnlocked,
          achievements: {
            obviousLiar: initialObviousLiar,
            didTheImpossible: false,
            spammer: false,
            winner: false,
            master: false,
          },
          titles: initialObviousLiar ? ['Obvious Liar'] : [],
          selectedTitle: null,
        };

        // Save to Firestore
        const encodeEmail = (email) => email.replace(/\./g, ',');
        await setDoc(doc(firestore, 'Users', encodeEmail(email)), userDoc);

        const postMsg = initialObviousLiar 
          ? 'Registration successful!\n\n🏆 Achievement Unlocked: "Obvious Liar"'
          : 'Registration successful!';
        Alert.alert('Success', postMsg);
        // Faster navigation
        setTimeout(() => {
        navigation.navigate('Login');
        }, 100);
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          Alert.alert('Error', 'This email is already registered. Please use a different email or login.');
        } else {
          throw authError;
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, confirmPassword, birthDate, nameError, emailError, passwordError, confirmPasswordError, birthDateError, validateName, validateEmail, validatePassword, validateBirthDate, navigation]);

  // Optimized input handlers
  const handleNameChange = useCallback((text) => {
    setName(text);
    validateName(text);
  }, [validateName]);

  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    validateEmail(text);
  }, [validateEmail]);

  const handlePasswordChange = useCallback((text) => {
    setPassword(text);
    validatePassword(text);
  }, [validatePassword]);

  const handleConfirmPasswordChange = useCallback((text) => {
    setConfirmPassword(text);
    validateConfirmPassword(text);
  }, [validateConfirmPassword]);

  const handleBirthDateChange = useCallback((text) => {
    setBirthDate(text);
    validateBirthDate(text);
  }, [validateBirthDate]);

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
      width: '80%',
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
    loginContainer: {
      marginTop: 20 * SCALE,
      padding: 10 * SCALE,
    },
    loginText: {
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
        <Text style={dynamicStyles.title}>Register</Text>

        <TextInput 
          placeholder="Full Name" 
          value={name} 
          onChangeText={handleNameChange}
          style={dynamicStyles.input}
          autoCapitalize="words"
          returnKeyType="next"
        />
        {nameError ? <Text style={dynamicStyles.errorText}>{nameError}</Text> : null}
        
        <TextInput 
          placeholder="Email" 
          value={email} 
          onChangeText={handleEmailChange}
          style={dynamicStyles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        {emailError ? <Text style={dynamicStyles.errorText}>{emailError}</Text> : null}
        
        <TextInput 
          placeholder="Birth Date (YYYY-MM-DD)" 
          value={birthDate} 
          onChangeText={handleBirthDateChange}
          style={dynamicStyles.input}
          returnKeyType="next"
        />
        {birthDateError ? <Text style={dynamicStyles.errorText}>{birthDateError}</Text> : null}

        <TextInput 
          placeholder="Password" 
          value={password} 
          onChangeText={handlePasswordChange}
          secureTextEntry 
          style={dynamicStyles.input}
          returnKeyType="next"
        />
        {passwordError ? <Text style={dynamicStyles.errorText}>{passwordError}</Text> : null}

        <TextInput 
          placeholder="Confirm Password" 
          value={confirmPassword} 
          onChangeText={handleConfirmPasswordChange}
          secureTextEntry 
          style={dynamicStyles.input}
          returnKeyType="done"
        />
        {confirmPasswordError ? <Text style={dynamicStyles.errorText}>{confirmPasswordError}</Text> : null}

        <TouchableOpacity onPress={navigateToLogin} style={dynamicStyles.loginContainer}>
          <Text style={dynamicStyles.loginText}>Already have an account? Login now!</Text>
        </TouchableOpacity>

        <CustomButton 
          title={isLoading ? "Registering..." : "Register"} 
          onPress={handleRegister}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

export default Register; 