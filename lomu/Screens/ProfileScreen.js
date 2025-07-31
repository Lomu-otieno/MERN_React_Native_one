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

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${SERVER_URL}/api/users/view-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setLikesCount(res.data.likesCount || 0);
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchUser();
  }, []);

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
              colors={["#FF0050"]} // Android
              tintColor="#FF0050" // iOS
              progressBackgroundColor="#1A1A1A" // Background color of refresh indicator
            />
          }
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: user.profileImage,
                  // "https://i.pinimg.com/1200x/c4/ae/63/c4ae63ed12845d4a0e6706bb036d9bd0.jpg",
                }}
                style={styles.avatar}
              />
              <View style={styles.plusBadge}>
                <Ionicons name="add" size={20} color="white" />
              </View>
            </View>
            <View style={styles.statsContainer}>
              {/* <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View> */}
              {/* <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View> */}
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
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Content Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={styles.tabButtonActive}>
              <Feather name="grid" size={24} color="white" />
              <View style={styles.tabIndicatorActive} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton}>
              <Feather name="heart" size={24} color="gray" />
              <View style={styles.tabIndicator} />
            </TouchableOpacity>
          </View>

          {/* Content Placeholder */}
          <View style={styles.contentPlaceholder}>
            <Feather name="camera" size={48} color="#333" />
            <Text style={styles.placeholderText}>Upload your first video</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 30,
    borderTopWidth: 0.5,
    borderTopColor: "#333",
    paddingTop: 10,
  },
  tabButton: {
    alignItems: "center",
    paddingVertical: 10,
    width: "50%",
  },
  tabButtonActive: {
    alignItems: "center",
    paddingVertical: 10,
    width: "50%",
  },
  tabIndicator: {
    height: 2,
    width: "100%",
    backgroundColor: "transparent",
    marginTop: 10,
  },
  tabIndicatorActive: {
    height: 2,
    width: "100%",
    backgroundColor: "#FF0050",
    marginTop: 10,
  },
  contentPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  placeholderText: {
    color: "#333",
    fontSize: 16,
    marginTop: 15,
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
