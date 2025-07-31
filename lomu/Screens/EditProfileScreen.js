// screens/EditProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const EditProfileScreen = ({ navigation }) => {
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await axios.get(`${SERVER_URL}/api/users/view-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { bio, gender, dateOfBirth, interests, location } = res.data;
        setBio(bio || "");
        setGender(gender || "");
        setDateOfBirth(dateOfBirth ? dateOfBirth.split("T")[0] : "");
        setInterests(interests || "");
        setLocation(location || "");
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    loadProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await axios.put(
        `${SERVER_URL}/api/settings/update-details`,
        { bio, gender, dateOfBirth, interests, location },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={styles.input}
        multiline
      />

      <Text style={styles.label}>Gender</Text>
      <TextInput value={gender} onChangeText={setGender} style={styles.input} />

      <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
      <TextInput
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        style={styles.input}
      />

      <Text style={styles.label}>Interests</Text>
      <TextInput
        value={interests}
        onChangeText={setInterests}
        style={styles.input}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#111",
    flexGrow: 1,
  },
  label: {
    color: "#aaa",
    marginTop: 15,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  button: {
    marginTop: 30,
    backgroundColor: "#FF0050",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default EditProfileScreen;
