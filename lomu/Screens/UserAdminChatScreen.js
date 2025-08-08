import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const UserAdminChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const flatListRef = useRef(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL; // hide server link here

  // Fetch userId from storage
  useEffect(() => {
    (async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      setUserId(storedUserId);
      if (storedUserId) {
        fetchMessages(storedUserId);
      }
    })();
  }, []);

  // Fetch messages
  const fetchMessages = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/user-chats/${id}`);
      setMessages(res.data.messages);
    } catch (error) {
      console.log("Error fetching messages:", error.response?.data || error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/api/user-chats/send`, {
        userId,
        message: messageText,
      });
      setMessages((prev) => [...prev, res.data.newMessage]);
      setMessageText("");
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.log("Error sending message:", error.response?.data || error);
    }
  };

  // Render each message bubble
  const renderItem = ({ item }) => {
    const isUser = item.sender === userId;
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.adminMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default UserAdminChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messageContainer: {
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4CAF50",
  },
  adminMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ddd",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#007BFF",
    borderRadius: 20,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
