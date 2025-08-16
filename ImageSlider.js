import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const images = [
  require('./assets/MenuBackGround/background2.png'), // Adjust the path
  require('./assets/MenuBackGround/background3.png'), // Adjust the path
  require('./assets/MenuBackGround/menubackground.png'), // Adjust the path
];

const ImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 1000); // Change image every 1 second

    return () => clearInterval(interval); // Clear interval on unmount
  }, []);

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    backgroundColor: '#fff', // Optional: background color
  },
  image: {
    width: '100%', // Full width
    height: '100%', // Full height
    resizeMode: 'cover', // Adjust as needed
  },
});

export default ImageSlider; 