import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Picker } from "@react-native-picker/picker"; // <- Picker for dropdown

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const EditProfileScreen = ({ navigation }) => {
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");

  const [genderLocked, setGenderLocked] = useState(false);
  const [dobLocked, setDobLocked] = useState(false);

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

        if (gender) setGenderLocked(true);
        if (dateOfBirth) setDobLocked(true);
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    loadProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const updatedData = {
        bio,
        interests,
        location,
      };

      if (!genderLocked) updatedData.gender = gender;
      if (!dobLocked) updatedData.dateOfBirth = dateOfBirth;

      await axios.put(
        `${SERVER_URL}/api/settings/update-details`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      {genderLocked ? (
        <Text style={styles.lockedText}>{gender}</Text>
      ) : (
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={gender}
            onValueChange={(value) => setGender(value)}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Select Gender" value="" color="#aaa" />
            <Picker.Item label="male" value="male" />
            <Picker.Item label="female" value="female" />
          </Picker>
        </View>
      )}

      <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
      <TextInput
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        style={[styles.input, dobLocked && styles.disabledInput]}
        editable={!dobLocked}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#777"
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
  disabledInput: {
    backgroundColor: "#333",
    color: "#666",
  },
  pickerWrapper: {
    backgroundColor: "#222",
    borderRadius: 8,
    marginTop: 5,
  },
  picker: {
    color: "#fff",
  },
  lockedText: {
    color: "#aaa",
    backgroundColor: "#222",
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
