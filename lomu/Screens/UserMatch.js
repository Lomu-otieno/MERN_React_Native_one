// screens/UserMatch.js
import React from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";

const UserMatch = ({ route }) => {
  const { user } = route.params;

  return (
    <View style={styles.container}>
      <Image source={{ uri: user.profileImage }} style={styles.image} />
      <Text style={styles.username}>@{user.username}</Text>
      <Text style={styles.email}>{user.email}</Text>
      {/* Add more user details here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FF0050",
  },
  username: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  email: {
    fontSize: 16,
    color: "#888",
    marginTop: 8,
  },
});

export default UserMatch;
