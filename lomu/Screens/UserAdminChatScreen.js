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
  const flatListRef = useRef(null);

  // Fetch userId from storage and load messages
  useEffect(() => {
    let interval;

    const initializeChat = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (!storedUserId) {
          setError("Please login to continue");
          return;
        }

        setUserId(storedUserId);
        await fetchMessages(storedUserId, true); // first load shows spinner
        interval = setInterval(() => {
          fetchMessages(storedUserId); // no spinner for polling
        }, 2000);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to load chat");
      }
    };

    initializeChat();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []); // empty dependency so it runs once

  const fetchMessages = async (id, showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await axios.get(`${BACKEND_URI}/api/chatAdmin/user/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
        },
        timeout: 10000,
      });
      setMessages(res.data.messages || []);
      setError(null);
    } catch (error) {
      // ...same error handling
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !userId) return;

    // Create temp ID here so it's available in catch block
    const tempId = Date.now().toString();

    try {
      setLoading(true);
      const newMessage = {
        _id: tempId,
        sender: userId,
        message: messageText,
        timestamp: new Date(),
        status: "sent",
      };

      // Optimistically update UI
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");

      // Send to backend
      await axios.post(
        `${BACKEND_URI}/api/chatAdmin/send`,
        {
          userId,
          message: messageText,
        },
        {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
          },
        }
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Send error:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      // Remove the optimistic update if failed
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
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
    const isAdmin = !isUser;
    return (
      <View
        style={[styles.messageRow, isUser ? styles.userRow : styles.otherRow]}
      >
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessage : styles.otherMessage, // admin's will be otherMessage
          ]}
        >
          <Text
            style={isUser ? styles.userMessageText : styles.otherMessageText}
          >
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isUser && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color="#4CAF50"
                style={styles.statusIcon}
              />
            )}
          </View>
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
          <Text style={styles.headerTitle}>Support Messages</Text>
          <Text style={styles.headerSubtitle}>
            We'll respond as soon as possible
          </Text>
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
          ios: 0,
          android: 0,
        })}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0050" />
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
            keyExtractor={(item) => item._id.toString()}
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
    padding: 15,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 30,
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
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userMessageTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: "transparent",
    borderTopWidth: 8,
    borderTopColor: "#FF0050",
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  otherRow: {
    alignSelf: "flex-start",
  },
  messageContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: "#FF0050",
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    marginLeft: 50, // keep away from left
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  otherMessage: {
    backgroundColor: "#252525",
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    marginRight: 50, // keep away from right
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 3,
  },

  userMessageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  otherMessageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
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
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  statusIcon: {
    marginLeft: 5,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#1E1E1E",
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
