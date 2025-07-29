import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axios from "axios";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) return Alert.alert("Validation", "Please enter your email");

    setLoading(true);
    try {
      const response = await axios.post(`${SERVER_URL}/forgot-password`, { email });
      Alert.alert("Success", response.data.message);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 15 },
  button: { backgroundColor: "#007bff", padding: 15, borderRadius: 5 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
