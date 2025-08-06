import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const SERVER_URL = "https://lomu-dating-backend.onrender.com";
const DEFAULT_IMAGE = "https://i.imgur.com/5WzFNgi.jpg";

const MatchesScreen = () => {
  const navigation = useNavigation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${SERVER_URL}/api/users/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(res.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load matches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF0050" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={[styles.container, styles.centeredEmpty]}>
        <Ionicons name="heart-dislike" size={64} color="#333" />
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptySubtitle}>
          Keep swiping to find your perfect match!
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#FF0050" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}></View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF0050"]}
            tintColor="#FF0050"
            progressBackgroundColor="#1A1A1A"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.matchCard}
            onPress={() =>
              navigation.navigate("UserMatch", { userId: item._id })
            }
          >
            <Image
              source={{ uri: item.profileImage || DEFAULT_IMAGE }}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.lastSeen}>Active recently</Text>
            </View>
            <Feather name="message-circle" size={24} color="#666" />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#333",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#FF0050",
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
    color: "#666",
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
  separator: {
    height: 1,
    backgroundColor: "#333",
    marginLeft: 72,
  },
});

export default MatchesScreen;
