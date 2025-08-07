import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { BACKEND_URI } from "@env";
import { LinearGradient } from "expo-linear-gradient";

const SetGenderScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSetGender = async () => {
    if (!email || !gender) {
      setMessage({
        text: "Please provide both email and gender",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URI}/api/users/set-gender`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, gender }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "Gender updated successfully!", type: "success" });
        setTimeout(() => navigation.replace("Login"), 2000);
      } else {
        setMessage({
          text: data.message || "Something went wrong",
          type: "error",
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: "Could not update gender", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-clear message after 3 seconds
  React.useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient colors={["#121212", "#1E1E1E"]} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Let us know your gender to find better matches
          </Text>

          {message.text ? (
            <View
              style={[
                styles.messageContainer,
                message.type === "success"
                  ? styles.successMessage
                  : styles.errorMessage,
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === "male" && styles.maleSelected,
              ]}
              onPress={() => setGender("male")}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === "male" && styles.genderSelectedText,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === "female" && styles.femaleSelected,
              ]}
              onPress={() => setGender("female")}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === "female" && styles.genderSelectedText,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSetGender}
            disabled={loading || !email || !gender}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
        <StatusBar barStyle={"light-content"} backgroundColor="#000" />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#FF0050",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#AAA",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: "#252525",
    color: "#FFFFFF",
    placeholderTextColor: "#666",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  genderButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#333",
  },
  maleSelected: {
    backgroundColor: "#1E3A8A",
    borderColor: "#3B82F6",
  },
  femaleSelected: {
    backgroundColor: "#1E3A8A",
    borderColor: "#3B82F6",
  },
  genderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DDD",
  },
  genderSelectedText: {
    color: "#FFF",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#FF0050",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
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
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: "#333",
  },
  successMessage: {
    backgroundColor: "#0000",
  },
  errorMessage: {
    backgroundColor: "#000",
  },
  messageText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SetGenderScreen;
