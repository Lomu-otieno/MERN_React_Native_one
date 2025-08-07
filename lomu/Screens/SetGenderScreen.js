import React, { useState } from "react";
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

  const handleSubmit = async () => {
    if (!gender) {
      setMessage({ text: "Please select your gender", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      console.log("Fetched userId from storage:", userId);

      const response = await axios.post(GENDER_UPDATE_URL, {
        userId,
        gender,
      });

      console.log("Gender update response:", response.data);

      setMessage({ text: "Gender updated successfully", type: "success" });
      setTimeout(() => navigation.replace("Main"), 1500);
    } catch (error) {
      console.error("Gender update error:", error.response?.data || error);
      setMessage({
        text: error.response?.data?.message || "Something went wrong",
        type: "error",
      });
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
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Gender</Text>

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
          onValueChange={(itemValue) => setGender(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select gender" value="" />
          <Picker.Item label="male" value="male" />
          <Picker.Item label="female" value="female" />
        </Picker>
      </View>

      <TouchableOpacity onPress={handleSubmit} style={styles.button}>
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
    marginBottom: 30,
    textAlign: "center",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 30,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: "#FF0050",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Message styles
  messageContainer: {
    padding: 15,
    borderRadius: 5,
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
