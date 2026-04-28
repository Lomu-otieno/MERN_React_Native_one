import React, { useEffect, useState, useRef } from "react";
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
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BACKEND_URI } from "@env";

const SERVER_URL = `${BACKEND_URI}`;
const { width, height } = Dimensions.get("window");

const UserMatch = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("photos");
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const flatListRef = useRef(null);

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

  const openFullscreen = (index) => {
    setSelectedPhotoIndex(index);
    setFullscreenVisible(true);
  };

  const closeFullscreen = () => {
    setFullscreenVisible(false);
    setSelectedPhotoIndex(0);
  };

  const renderFullscreenItem = ({ item, index }) => {
    const photoUrl = typeof item === "string" ? item : item.url;
    return (
      <View style={styles.fullscreenPage}>
        <Image
          source={{ uri: photoUrl }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
      </View>
    );
  };

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

  const photos = user.photos || [];

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
        <Text style={styles.headerUsername}>@{user.username}</Text>
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
          data={photos}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          contentContainerStyle={styles.photosGrid}
          renderItem={({ item, index }) => {
            const photoUrl = typeof item === "string" ? item : item.url;
            return (
              <TouchableOpacity
                onPress={() => openFullscreen(index)}
                activeOpacity={0.9}
                style={styles.photoItem}
              >
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.photoGridItem}
                />
              </TouchableOpacity>
            );
          }}
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

      {/* Fullscreen Modal with Horizontal FlatList */}
      <Modal
        visible={fullscreenVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFullscreen}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <FlatList
            ref={flatListRef}
            data={photos}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={renderFullscreenItem}
            onScrollToIndexFailed={() => {}}
          />

          {/* Photo Counter */}
          {/* {photos.length > 1 && (
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {selectedPhotoIndex + 1} / {photos.length}
              </Text>
            </View>
          )} */}
        </View>
      </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backIcon: { marginRight: 10 },
  headerUsername: {
    fontSize: 18,
    color: "#FF0050",
    fontWeight: "600",
  },
  username: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  profileContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FF0050",
    marginBottom: 5,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF0050",
  },
  activeTab: {
    backgroundColor: "#FF0050",
  },
  tabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  photosGrid: {
    paddingHorizontal: 8,
  },
  photoItem: {
    flex: 1,
    margin: 4,
  },
  photoGridItem: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  noPhotosText: {
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  detailsContainer: {
    paddingHorizontal: 20,
  },
  bio: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  errorText: {
    color: "#fff",
  },
  // Fullscreen Modal Styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    padding: 8,
  },
  fullscreenPage: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  fullscreenImage: {
    width: width,
    height: height,
  },
  counterContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  counterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default UserMatch;
