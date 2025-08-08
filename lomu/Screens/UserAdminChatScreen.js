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
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URI } from "@env";

const UserAdminChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  // Fetch userId from storage and load messages
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (!storedUserId) {
          setError("User not authenticated");
          return;
        }

        setUserId(storedUserId);
        await fetchMessages(storedUserId);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize chat");
      }
    };

    initializeChat();
  }, []);

  // Fetch messages
  const fetchMessages = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URI}/api/chatAdmin/user/${id}`);
      setMessages(res.data.messages);
      setError(null);
    } catch (error) {
      console.error("Fetch error:", error.response?.data || error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !userId) return;

    try {
      setLoading(true);
      const res = await axios.post(`${BACKEND_URI}/api/chatAdmin/send`, {
        userId,
        message: messageText,
      });

      setMessages((prev) => [...prev, res.data.newMessage]);
      setMessageText("");
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error("Send error:", error.response?.data || error);
      setError("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  // Render each message
  const renderItem = ({ item }) => {
    const isUser = item.sender === userId;
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.adminMessage,
        ]}
      >
        <Text style={isUser ? styles.userMessageText : styles.adminMessageText}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" />

      {loading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0050" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchMessages(userId)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item._id || Date.now().toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={setMessageText}
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!messageText.trim() || loading}
        >
          <Ionicons
            name="send"
            size={24}
            color={!messageText.trim() || loading ? "#666" : "#FF0050"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#FF0050",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  retryText: {
    color: "#FF0050",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  messagesList: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  messageContainer: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#FF0050",
    borderTopRightRadius: 0,
  },
  adminMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#2A2A2A",
    borderTopLeftRadius: 0,
  },
  userMessageText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  adminMessageText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    color: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    padding: 10,
  },
});

export default UserAdminChatScreen;
