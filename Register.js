import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import CustomButton from './CustomButton';
import { authentication, db } from './Config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useBackground } from './BackgroundContext';
import backgroundImages from './backgroundImages';



const Register = ({ navigation }) => {
  const { currentIndex } = useBackground();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateName = (name) => {
    if (name.length < 2) {
      setNameError("Name must be at least 2 characters long");
      return false;
    } else {
      setNameError("");
      return true;
    }
  };

  const validateUsername = (username) => {
    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernamePattern.test(username)) {
      setUsernameError("Username must be 3-20 characters (letters, numbers, underscores only)");
      return false;
    } else {
      setUsernameError("");
      return true;
    }
  };

  const validateEmail = (email) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@.+\..+$/;
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email format. Please include '@' and a domain.");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  const validatePassword = (password) => {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()?]).{6,12}$/;
    if (!passwordPattern.test(password)) {
      setPasswordError("Password must be 6-12 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character.");
      return false;
    } else {
      setPasswordError("");
      return true;
    }
  };

  const validateBirthDate = (date) => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      setBirthDateError("Please enter date in YYYY-MM-DD format");
      return false;
    } else {
      setBirthDateError("");
      return true;
    }
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      const isNameValid = validateName(name);
      const isUsernameValid = validateUsername(username);
      const isEmailValid = validateEmail(email);
      const isPasswordValid = validatePassword(password);
      const isBirthDateValid = validateBirthDate(birthDate);

      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match.");
        setIsLoading(false);
        return;
      }

      if (!isNameValid || !isUsernameValid || !isEmailValid || !isPasswordValid || !isBirthDateValid ||
        !name || !username || !email || !password || !confirmPassword || !birthDate) {
        setIsLoading(false);
        return;
      }

      try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(authentication, email, password);
        const user = userCredential.user;

        // Parse birth date
        const [year, month, day] = birthDate.split('-');

        // Create the user document
        const userDoc = {
          userId: user.uid,
          name,
          username,
          email,
          birthDate: {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day)
          },
          score: 0,
          gamesPlayed: 0,
          isAdmin: false,
          createdAt: serverTimestamp()
        };

        // Save to Firestore
        await setDoc(doc(db, 'Users', user.uid), userDoc);

        Alert.alert('Success', 'Registration successful!');
        navigation.navigate('Login');
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          Alert.alert('Error', 'This email is already registered. Please use a different email or login.');
        } else {
          throw authError;
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={backgroundImages[currentIndex]} style={styles.backgroundImage} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Register</Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            validateName(text);
          }}
          style={styles.input}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            validateUsername(text);
          }}
          style={styles.input}
          autoCapitalize="none"
        />
        {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            validateEmail(text);
          }}
          style={styles.input}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <TextInput
          placeholder="Birth Date (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={(text) => {
            setBirthDate(text);
            validateBirthDate(text);
          }}
          style={styles.input}
        />
        {birthDateError ? <Text style={styles.errorText}>{birthDateError}</Text> : null}

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            validatePassword(text);
          }}
          secureTextEntry
          style={styles.input}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TextInput
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
        />
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? Login now!</Text>
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
  loginContainer: {
    marginTop: 20,
  },
  loginText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
});

export default Register; 