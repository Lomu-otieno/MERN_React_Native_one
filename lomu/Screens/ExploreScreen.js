import React, { useEffect, useState } from "react";
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

const { width, height } = Dimensions.get("window");

const ExploreScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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
      Alert.alert("Error", "Failed to load users.");
    } finally {
      setLoading(false);
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
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!users.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUsersText}>No users available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper
        cards={users}
        renderCard={(user) => (
          <View style={styles.card}>
            <Image source={{ uri: user.profileImage }} style={styles.image} />
            <View style={styles.overlay} />
            <View style={styles.info}>
              <Text style={styles.name}>{user.username}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
        )}
        onSwipedRight={(cardIndex) =>
          handleAction(users[cardIndex]._id, "like")
        }
        onSwipedLeft={(cardIndex) => handleAction(users[cardIndex]._id, "pass")}
        cardIndex={0}
        backgroundColor={"#f8f9fa"}
        stackSize={3}
      />
    </View>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: width * 0.95, // 90% of screen width
    height: height * 0.85, // 70% of screen height
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  info: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#555",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noUsersText: {
    fontSize: 18,
    color: "#777",
  },
});
