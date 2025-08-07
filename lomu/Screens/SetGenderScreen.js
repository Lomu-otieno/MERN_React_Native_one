import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_URI } from "@env";

const GENDER_UPDATE_URL = `${BACKEND_URI}/api/users/gender`;

const SetGenderScreen = () => {
  const navigation = useNavigation();
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Check if user already has gender set
  useEffect(() => {
    const checkGender = async () => {
      const userGender = await AsyncStorage.getItem("userGender");
      if (userGender) {
        navigation.replace("Main");
      }
    };
    checkGender();
  }, []);

  const handleSubmit = async () => {
    if (!gender) {
      setMessage({ text: "Please select your gender", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");

      if (!userId) {
        setMessage({ text: "User not found", type: "error" });
        return;
      }

      const response = await axios.post(GENDER_UPDATE_URL, {
        userId,
        gender,
      });

      // Store gender locally for immediate access
      await AsyncStorage.setItem("userGender", gender);

      setMessage({ text: "Gender updated successfully", type: "success" });
      setTimeout(() => navigation.replace("Main"), 1500);
    } catch (error) {
      console.error("Gender update error:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to update gender";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Gender</Text>
      <Text style={styles.subtitle}>
        This helps us show you relevant matches
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

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={gender}
          onValueChange={setGender}
          style={styles.picker}
          dropdownIconColor="#FF0050"
        >
          <Picker.Item label="Select gender" value="" color="#999" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
        </Picker>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        style={styles.button}
        disabled={loading || !gender}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 30,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  button: {
    backgroundColor: "#FF0050",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    opacity: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  messageContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  successMessage: {
    backgroundColor: "#4BB543",
  },
  errorMessage: {
    backgroundColor: "#FF0033",
  },
  messageText: {
    color: "#fff",
    textAlign: "center",
  },
});

export default SetGenderScreen;
