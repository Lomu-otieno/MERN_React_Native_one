import React, { useEffect } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  Text,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const AuthLoadingScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setTimeout(() => {
          navigation.replace(token ? "Explore" : "Login");
        }, 2000); // slight delay to show animation
      } catch (error) {
        console.error("Error checking auth:", error);
        navigation.replace("Login");
      }
    };

    checkAuth();

    // Fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ ...styles.content, opacity: fadeAnim }}>
        <Image
          source={require("../assets/splash_icon.png")} // Replace with your logo/image
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Lomu Dating</Text>
        <ActivityIndicator
          size="large"
          color="#E91E63"
          style={{ marginTop: 20 }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // match your splash theme
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    color: "#E91E63",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default AuthLoadingScreen;
