import React, { useEffect, useState } from "react";
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  StatusBar,
  TouchableOpacity,
  Animated,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import * as Location from "expo-location";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";
const { width, height } = Dimensions.get("window");

const ExploreScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  // const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showMessage = (message) => {
    setErrorMessage(message);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setErrorMessage(null));
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${SERVER_URL}/api/users/explore`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      showMessage("Failed to load users");
    } finally {
      setLoading(false);
      // setRefreshing(false);
    }
  };

  const updateLocation = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const response = await axios.put(
        `${SERVER_URL}/api/users/location`,
        { latitude, longitude },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }
      );

      if (response.status === 404) {
        console.warn("Endpoint not found - check your backend routes");
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Full error response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
      throw error;
    }
  };

  const handleAction = async (userId, action) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const endpoint =
        action === "like"
          ? `/api/user/like/${userId}`
          : `/api/user/pass/${userId}`;
      await axios.post(
        `${SERVER_URL}${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error(`${action} error:`, err.response?.data || err.message);
      showMessage(`Failed to ${action} user`);
    }
  };

  const onRefresh = () => {
    // setRefreshing(true);
    fetchUsers();
  };

  useEffect(() => {
    updateLocation();
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF0050" />
      </View>
    );
  }

  if (!users.length) {
    return (
      <View style={[styles.container, styles.centeredEmpty]}>
        <Ionicons name="people-outline" size={64} color="#333" />
        <Text style={styles.emptyTitle}>No users available</Text>
        <Text style={styles.emptySubtitle}>
          Check back later for new profiles
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#FF0050" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {errorMessage && (
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.messageText}>{errorMessage}</Text>
        </Animated.View>
      )}

      <Swiper
        cards={users}
        renderCard={(user) => (
          <View style={styles.card}>
            <Image
              source={{
                uri: user.profileImage || "https://i.imgur.com/5WzFNgi.jpg",
              }}
              style={styles.image}
            />
            <View style={styles.overlay} />
            <View style={styles.info}>
              <Text style={styles.name}>@{user.username}</Text>
              <Text style={styles.age}>{user.age || "Age not specified"}</Text>
              <Text style={styles.bio} numberOfLines={2}>
                {user.bio || "No bio yet"}
              </Text>
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={16} color="#FF0050" />
                <Text style={styles.distance}>
                  {user.distance
                    ? `${(user.distance / 1000).toFixed(1)} km away`
                    : "Distance unknown"}
                </Text>
              </View>
            </View>
          </View>
        )}
        onSwipedRight={(cardIndex) =>
          handleAction(users[cardIndex]._id, "like")
        }
        onSwipedLeft={(cardIndex) => handleAction(users[cardIndex]._id, "pass")}
        cardIndex={0}
        backgroundColor={"#000"}
        stackSize={3}
        stackSeparation={-10}
        overlayLabels={{
          left: {
            title: "NOPE",
            style: {
              label: {
                backgroundColor: "#FF0050",
                borderColor: "#FF0050",
                color: "#fff",
                borderWidth: 1,
                fontSize: 24,
              },
              wrapper: {
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                marginTop: 30,
                marginLeft: -30,
              },
            },
          },
          right: {
            title: "LIKE",
            style: {
              label: {
                backgroundColor: "#FF0050",
                borderColor: "#FF0050",
                color: "#fff",
                borderWidth: 1,
                fontSize: 24,
              },
              wrapper: {
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                marginTop: 30,
                marginLeft: 30,
              },
            },
          },
        }}
        animateOverlayLabelsOpacity
        animateCardOpacity
      />

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAction(users[0]._id, "pass")}
        >
          <Ionicons name="close" size={32} color="#FF0050" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAction(users[0]._id, "like")}
        >
          <Ionicons name="heart" size={32} color="#FF0050" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  card: {
    width: width * 0.9,
    height: height * 0.75,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    shadowColor: "#FF0050",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 0,
    elevation: 10,
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  info: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "rgba(26, 26, 26, 0.8)",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  age: {
    fontSize: 18,
    color: "#FF0050",
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: "#ddd",
    marginBottom: 12,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: 14,
    color: "#FF0050",
    marginLeft: 5,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  centeredEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF0050",
  },
  refreshText: {
    color: "#FF0050",
    fontWeight: "500",
    marginLeft: 8,
  },
  actionsContainer: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "60%",
    alignSelf: "center",
  },
  actionButton: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    padding: 15,
    borderRadius: 30,
    shadowColor: "#FF0050",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  messageContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 30,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 0, 80, 0.8)",
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
    alignItems: "center",
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ExploreScreen;
