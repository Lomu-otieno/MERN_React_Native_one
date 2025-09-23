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

const SERVER_URL = `${BACKEND_URI}/api/auth/reset-password`;

// Message Component
const Message = ({ visible, type, message, onClose }) => {
  if (!visible) return null;

  const backgroundColor = type === "error" ? "#FF3B30" : "#4CAF50";
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

const ResetPasswordScreen = () => {
  const navigation = useNavigation();

  const [token, setToken] = useState("");
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

  const handleReset = async () => {
    // Trim inputs
    const trimmedToken = token.trim();
    const trimmedPassword = password.trim();

    if (!trimmedToken || !trimmedPassword) {
      showMessage("Please fill in all fields.", "error");
      return;
    }

    if (trimmedPassword.length < 6) {
      showMessage("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${SERVER_URL}/${trimmedToken}`, {
        password: trimmedPassword,
      });

      // Show success message
      showMessage(
        response.data.message || "Password reset successful.",
        "success"
      );

      // Navigate to login after a brief delay to show success message
      setTimeout(() => {
        navigation.replace("Login");
      }, 2000);
    } catch (error) {
      console.error("Reset error:", error.response?.data || error.message);
      showMessage(
        error.response?.data?.message || "Failed to reset password.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Message
        visible={message.visible}
        type={message.type}
        message={message.text}
        onClose={hideMessage}
      />

      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        placeholder="Reset Token"
        placeholderTextColor="#666"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="New Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleReset}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    color: "#E91E63",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    placeholderTextColor: "#666",
  },
  button: {
    backgroundColor: "#E91E63",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: "#C2185B",
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: "#E91E63",
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
  // Message component styles
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
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

export default ResetPasswordScreen;
