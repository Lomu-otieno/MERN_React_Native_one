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

const GENDER_UPDATE_URL = `${BACKEND_URI}/api/users/set-gender`;

const SetGenderScreen = () => {
  const navigation = useNavigation();
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Check if gender already set
  useEffect(() => {
    const checkGender = async () => {
      try {
        const userGender = await AsyncStorage.getItem("userGender");
        if (userGender) {
          navigation.replace("Main");
        }
      } catch (error) {
        console.error("Gender check error:", error);
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
        setMessage({ text: "User session expired", type: "error" });
        return navigation.replace("Auth");
      }

      const response = await axios.post(GENDER_UPDATE_URL, {
        userId,
        gender,
      });

      // Store gender locally for immediate access
      await AsyncStorage.setItem("userGender", gender);

      setMessage({
        text: "Profile setup complete!",
        type: "success",
      });

      setTimeout(() => navigation.replace("Main"), 1500);
    } catch (error) {
      let errorMsg = "Failed to update gender";

      // Handle specific error codes
      switch (error.response?.data?.code) {
        case "GENDER_ALREADY_SET":
          errorMsg = "Gender already set";
          navigation.replace("Main");
          break;
        case "INVALID_GENDER":
          errorMsg = "Please select a valid gender";
          break;
      }

      setMessage({
        text: errorMsg,
        type: "error",
      });
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
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Select your gender to get better matches
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
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.button, (!gender || loading) && styles.buttonDisabled]}
        disabled={!gender || loading}
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
    padding: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
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
    borderRadius: 10,
    marginBottom: 30,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: "#FF0050",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
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
    fontWeight: "500",
  },
});

export default SetGenderScreen;
