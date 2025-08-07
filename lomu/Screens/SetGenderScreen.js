import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { BACKEND_URI } from "@env";

const GENDER_UPDATE_URL = `${BACKEND_URI}/api/user/update-profile`;

const SetGenderScreen = () => {
  const navigation = useNavigation();
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!gender) {
      Alert.alert("Required", "Please select your gender.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.put(
        GENDER_UPDATE_URL,
        { gender },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Gender updated successfully");
      navigation.replace("Main");
    } catch (error) {
      console.error("Gender update error:", error.response?.data || error);
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
      <Text style={styles.title}>Select Your Gender</Text>

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

export default SetGenderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  pickerWrapper: {
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 30,
  },
  picker: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#FF0050",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
