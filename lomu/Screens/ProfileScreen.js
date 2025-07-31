import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${SERVER_URL}/api/users/view-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setLikesCount(res.data.likesCount || 0);
      setImages(res.data.photos || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please enable photo library access in settings"
      );
    }
  };

  const pickImage = async (isProfilePhoto = false) => {
    try {
      if (images.length >= 5 && !isProfilePhoto) {
        Alert.alert("Limit Reached", "You can only upload up to 5 photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: isProfilePhoto ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        if (isProfilePhoto) {
          await uploadProfileImage(result.assets[0].uri);
        } else {
          await uploadPhoto(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadProfileImage = async (uri) => {
    try {
      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", {
        uri,
        name: "profile.jpg",
        type: "image/jpeg",
      });

      const res = await axios.post(
        `${SERVER_URL}/api/users/upload-profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUser({ ...user, profileImage: res.data.profileImage });
      Alert.alert("Success", "Profile photo updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload profile photo");
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async (uri) => {
    try {
      setUploading(true);
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("photo", {
        uri,
        name: `photo_${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      const res = await axios.post(
        `${SERVER_URL}/api/users/upload-photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setImages(res.data.photos);
      Alert.alert("Success", "Photo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (index) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${SERVER_URL}/api/users/delete-photo/${index}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedImages = [...images];
      updatedImages.splice(index, 1);
      setImages(updatedImages);
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete photo");
    }
  };

  useEffect(() => {
    fetchUser();
    requestMediaPermission();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUser();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF0050" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load profile.</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#010101", "#131313", "#212121"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF0050"]}
              tintColor="#FF0050"
              progressBackgroundColor="#1A1A1A"
            />
          }
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => pickImage(true)}
              disabled={uploading}
            >
              <Image
                source={{
                  uri: user.profileImage || "https://i.imgur.com/5WzFNgi.jpg",
                }}
                style={styles.avatar}
              />
              <View style={styles.plusBadge}>
                <Ionicons name="add" size={20} color="white" />
              </View>
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{likesCount}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.bio}>{user.bio || "No bio yet"}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate("EditProfile")}
            disabled={uploading}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Photos Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Photos</Text>
            <View style={styles.photosContainer}>
              {images.length > 0 ? (
                images.map((img, idx) => (
                  <View key={idx} style={styles.photoWrapper}>
                    <Image source={{ uri: img }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.deletePhotoButton}
                      onPress={() => deletePhoto(idx)}
                    >
                      <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noPhotosText}>No photos yet</Text>
              )}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => pickImage(false)}
                  disabled={uploading}
                >
                  <Feather name="plus" size={24} color="#FF0050" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={uploading}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 50,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FF0050",
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF0050",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flex: 1,
    marginLeft: 20,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  statNumber: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: "gray",
    fontSize: 14,
    marginTop: 5,
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  username: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  bio: {
    color: "white",
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  email: {
    color: "gray",
    fontSize: 14,
    marginTop: 5,
  },
  editButton: {
    backgroundColor: "#252525",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: "center",
    marginTop: 20,
  },
  editButtonText: {
    color: "white",
    fontWeight: "600",
  },
  sectionContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  photoWrapper: {
    width: "30%",
    aspectRatio: 1,
    margin: 5,
    borderRadius: 10,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  deletePhotoButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 3,
  },
  addPhotoButton: {
    width: "30%",
    aspectRatio: 1,
    margin: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF0050",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,0,80,0.1)",
  },
  noPhotosText: {
    color: "gray",
    fontSize: 14,
    alignSelf: "center",
    marginVertical: 20,
  },
  logoutButton: {
    backgroundColor: "#FF0050",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: "center",
    marginTop: 40,
  },
  logoutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: "white",
    fontSize: 16,
  },
});

export default ProfileScreen;
