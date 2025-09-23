import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_URI } from "@env";

const LOGIN_URL = `${BACKEND_URI}/api/auth/login`;

// Message Component
const Message = ({ visible, type, message, onClose }) => {
  if (!visible) return null;

  const backgroundColor = type === "error" ? "#FF0050" : "#4CAF50";
  const textColor = "#FFFFFF";

  return (
    <View style={[styles.messageContainer, { backgroundColor }]}>
      <Text style={[styles.messageText, { color: textColor }]}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={[styles.closeButtonText, { color: textColor }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const LoginScreen = () => {
  const navigation = useNavigation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    visible: false,
    type: "",
    text: "",
  });

  // Function to show message
  const showMessage = (text, type = "error") => {
    setMessage({ visible: true, type, text });
  };

  // Function to hide message
  const hideMessage = () => {
    setMessage({ visible: false, type: "", text: "" });
  };

  // Function to remove spaces from username
  const handleUsernameChange = (text) => {
    // Remove any spaces from the username
    const cleanedUsername = text.replace(/\s/g, "");
    setUsername(cleanedUsername);
  };

  const handleLogin = async () => {
    // Trim and validate inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword) {
      showMessage("Please enter all fields.", "error");
      return;
    }

    // Additional validation for username (no spaces allowed)
    if (username.includes(" ")) {
      showMessage("Username cannot contain spaces.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(LOGIN_URL, {
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const { token, user } = response.data;
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("userId", user.id);

      navigation.replace("Main");
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Splash screen during login
  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator
          size="large"
          color="#E91E63"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Message
        visible={message.visible}
        type={message.type}
        message={message.text}
        onClose={hideMessage}
      />

      <TextInput
        placeholder="Username"
        placeholderTextColor="#fff"
        autoCapitalize="none"
        value={username}
        onChangeText={handleUsernameChange}
        style={styles.input}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#fff"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#fff"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        autoCorrect={false}
      />

      <TouchableOpacity onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
    color: "#FF0050",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#1E1E1E",
    color: "#FFFFFF",
    placeholderTextColor: "#fff",
  },
  button: {
    backgroundColor: "#FF0050",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#FF0050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: "#FF0050",
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  // Message component styles
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    marginTop: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default LoginScreen;
