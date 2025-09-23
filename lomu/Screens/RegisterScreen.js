import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_URI } from "@env";

const REGISTER_URL = `${BACKEND_URI}/api/auth/register`;

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

const RegisterScreen = () => {
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

  const handleRegister = async () => {
    // Trim inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword) {
      showMessage("All fields are required.", "error");
      return;
    }

    if (trimmedPassword.length < 6) {
      showMessage("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(REGISTER_URL, {
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      // Show success message before navigation
      showMessage("Registration successful!", "success");

      // Navigate after a brief delay to show the success message
      setTimeout(() => {
        navigation.replace("SetGender");
      }, 1500);
    } catch (error) {
      console.error(
        "Registration error:",
        error.response?.data || error.message
      );
      showMessage(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
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
        onChangeText={setUsername}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#fff"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#fff"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleRegister}
        style={styles.button}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Login</Text>
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
    placeholderTextColor: "#666",
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

export default RegisterScreen;
