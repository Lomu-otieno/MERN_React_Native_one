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

const SERVER_URL = `${BACKEND_URI}/api/password/forgot-password`;

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

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
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

  const handleForgotPassword = async () => {
    // Trim email input
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showMessage("Please enter your email.", "error");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(SERVER_URL, { email: trimmedEmail });

      // Show success message
      showMessage(
        res.data.message || "Check your email for reset link.",
        "success"
      );

      // Navigate to login after a brief delay to show success message
      setTimeout(() => {
        navigation.navigate("Login");
      }, 3000);
    } catch (err) {
      console.error(
        "Forgot password error:",
        err.response?.data || err.message
      );
      showMessage(
        err.response?.data?.message || "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your
        password.
      </Text>
      <Message
        visible={message.visible}
        type={message.type}
        message={message.text}
        onClose={hideMessage}
      />

      <TextInput
        placeholder="Enter your email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        disabled={loading}
      >
        <Text style={styles.link}>Login</Text>
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
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#E91E63",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    color: "#999",
    lineHeight: 20,
    paddingHorizontal: 20,
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
    color: "#FF0050",
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
    fontSize: 16,
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

export default ForgotPasswordScreen;
