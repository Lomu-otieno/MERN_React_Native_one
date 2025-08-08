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
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BACKEND_URI } from "@env";

const { width } = Dimensions.get("window");

const UserAdminChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const flatListRef = useRef(null);

  // Fetch userId from storage and load messages
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (!storedUserId) {
          setError("Please login to continue");
          return;
        }

        setUserId(storedUserId);
        await fetchMessages(storedUserId);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to load chat");
      }
    };

    initializeChat();
  }, []);

  const fetchMessages = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URI}/api/chatAdmin/user/${id}`, {
        headers: {
          "Content-Type": "application/json",
          // Add authorization if needed
          Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
        },
        timeout: 10000, // 10 second timeout
      });

      if (!res.data) {
        throw new Error("No data received from server");
      }

      if (res.data.code === "NO_ADMIN_AVAILABLE") {
        setError("Our support team is currently busy. We'll connect you soon.");
        setMessages([]);
      } else {
        setMessages(res.data.messages || []);
        setAdminInfo(res.data.admin);
        setError(null);

        if (!res.data.messages?.length) {
          setMessages([
            {
              _id: "welcome",
              sender: "system",
              message: "Hello! How can we help you today?",
              timestamp: new Date(),
              systemMessage: true,
            },
          ]);
        }
      }
    } catch (error) {
      let errorMsg = "Connection error. Please try again.";

      if (error.response) {
        // Server responded with error status
        errorMsg =
          error.response.data?.message ||
          `Server error (${error.response.status})`;
      } else if (error.request) {
        // Request was made but no response
        errorMsg = "No response from server. Check your connection.";
      } else if (error.message.includes("timeout")) {
        errorMsg = "Request timeout. Please try again.";
      }

      console.error("Detailed fetch error:", {
        message: error.message,
        code: error.code,
        config: error.config?.url,
        response: error.response?.data,
      });

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Send error:", error.response?.data || error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    if (item.systemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.message}</Text>
        </View>
      );
    }

    const isUser = item.sender === userId;
    return (
      <View
        style={[styles.messageRow, isUser ? styles.userRow : styles.adminRow]}
      >
        {!isUser && adminInfo?.profileImage && (
          <Image
            source={{ uri: adminInfo.profileImage }}
            style={styles.avatar}
          />
        )}

        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessage : styles.adminMessage,
          ]}
        >
          <Text
            style={isUser ? styles.userMessageText : styles.adminMessageText}
          >
            {item.message}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {adminInfo ? (
            <>
              <Text style={styles.headerTitle}>Support Team</Text>
              <Text style={styles.headerSubtitle}>
                Typically replies in minutes
              </Text>
            </>
          ) : (
            <Text style={styles.headerTitle}>...</Text>
          )}
        </View>

        <TouchableOpacity>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.select({
          ios: 0, // Adjust this value if needed for iOS
          android: 0, // No offset needed for Android when behavior is null
        })}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0050" />
            <Text style={styles.headerTitle}>sending...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={32} color="#FF0050" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchMessages(userId)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id || Date.now().toString()}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            editable={!loading}
            multiline
          />
          {/* Send button */}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || loading}
          >
            <Ionicons
              name="send"
              size={22}
              color={!messageText.trim() || loading ? "#666" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 30,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
    padding: 30,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FF0050",
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  messagesList: {
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    maxWidth: width * 0.85,
  },
  userRow: {
    alignSelf: "flex-end",
  },
  adminRow: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: "#FF0050",
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    backgroundColor: "#252525",
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  adminMessageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  systemMessageContainer: {
    alignSelf: "center",
    backgroundColor: "rgba(255,0,80,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemMessageText: {
    color: "#FF0050",
    fontSize: 13,
    textAlign: "center",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "#2A2A2A",
    color: "#fff",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF0050",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#333",
  },
});

export default UserAdminChatScreen;
