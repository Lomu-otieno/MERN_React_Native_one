import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const UserMatch = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("photos");

  useEffect(() => {
    const fetchMatchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("Authentication required");

        const res = await axios.get(`${SERVER_URL}/api/users/match/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
      } catch (err) {
        setError(err.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchProfile();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF0050" />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>{error || "User not found"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with back and username */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FF0050"
            style={styles.backIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Profile image */}
      <View style={styles.profileContainer}>
        <Image
          source={{
            uri:
              user.profileImage ||
              "https://i.pinimg.com/1200x/cf/a9/c1/cfa9c1d868f8ba76a23a93150516787d.jpg",
          }}
          style={styles.image}
        />
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      {/* Toggle Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setSelectedTab("photos")}
          style={[
            styles.tabButton,
            selectedTab === "photos" && styles.activeTab,
          ]}
        >
          <Text style={styles.tabText}>Posts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedTab("details")}
          style={[
            styles.tabButton,
            selectedTab === "details" && styles.activeTab,
          ]}
        >
          <Text style={styles.tabText}>Details</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === "photos" ? (
        <FlatList
          data={user.photos || []}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          contentContainerStyle={styles.photosGrid}
          renderItem={({ item }) => (
            <Image
              source={{ uri: typeof item === "string" ? item : item.url }}
              style={styles.photoGridItem}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.noPhotosText}>No photos available</Text>
          }
        />
      ) : (
        <ScrollView
          style={styles.detailsContainer}
          showsVerticalScrollIndicator={false}
        >
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {user.dateOfBirth && (
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#FF0050" />
              <Text style={styles.infoText}>
                {new Date(user.dateOfBirth).toDateString()}
              </Text>
            </View>
          )}
          {user.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#FF0050" />
              <Text style={styles.infoText}>{user.location}</Text>
            </View>
          )}

          {user.interests?.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="heart" size={20} color="#FF0050" />
              <Text style={styles.infoText}>{user.interests.join(", ")}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  backIcon: { marginRight: 10 },
  username: { fontSize: 22, color: "#fff", fontWeight: "bold" },
  profileContainer: { alignItems: "center", marginVertical: 10 },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FF0050",
    marginBottom: 5,
  },
  tabs: { flexDirection: "row", justifyContent: "center", marginVertical: 10 },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF0050",
  },
  activeTab: { backgroundColor: "#FF0050" },
  tabText: { color: "#fff", fontWeight: "bold" },
  photosGrid: { paddingHorizontal: 10 },
  photoGridItem: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.66%",
    borderRadius: 8,
  },
  noPhotosText: { color: "#888", textAlign: "center", marginTop: 20 },
  detailsContainer: { paddingHorizontal: 20 },
  bio: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 20 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  infoText: { color: "#fff", fontSize: 16, marginLeft: 10 },
  errorText: { color: "#fff" },
});

export default UserMatch;
