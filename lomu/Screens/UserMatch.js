import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

const UserMatch = ({ route }) => {
  const { user } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color="#FF0050"
          style={styles.backIcon}
          onPress={() => {}}
        />
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={styles.profileContainer}>
        <Image source={{ uri: user.profileImage }} style={styles.image} />
        <Text style={styles.bio}>{user.bio}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={20} color="#FF0050" />
          <Text style={styles.infoText}>
            {new Date(user.dateOfBirth).toDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color="#FF0050" />
          <Text style={styles.infoText}>{user.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="heart" size={20} color="#FF0050" />
          <Text style={styles.infoText}>{user.interests?.join(", ")}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#FF0050" />
          <Text style={styles.infoText}>{user.email}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backIcon: {
    marginRight: 10,
  },
  username: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  profileContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "#FF0050",
    marginBottom: 10,
  },
  bio: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 20,
  },
  infoSection: {
    marginTop: 20,
    paddingHorizontal: 20,
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
});

export default UserMatch;
