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
  RefreshControl,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BACKEND_URI, ADMIN_ID } from "@env";

const { width, height } = Dimensions.get("window");

const UserAdminChatScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);

  // Enhanced message fetching with typing indicators
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

      // Check admin status and typing indicators
      setAdminOnline(res.data.adminOnline || false);
      setIsTyping(res.data.isTyping || false);

      setMessages(res.data.messages || []);
      setError(null);
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to load messages. Pull to refresh.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Optimized send message function
  const sendMessage = async () => {
    if (!messageText.trim() || !userId || loading) return;

    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      sender: userId,
      message: messageText,
      timestamp: new Date(),
      read: false,
    };

    try {
      // Optimistic update
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");

      // Auto-scroll with smooth animation
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send to backend
      await axios.post(
        `${BACKEND_URI}/api/chatAdmin/send`,
        { userId, message: messageText },
        {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
          },
        }
      );
    } catch (error) {
      console.error("Send error:", error);
      // Revert optimistic update
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      Alert.alert("Error", "Message failed to send. Please try again.");
    }
  };

  // Enhanced message rendering
  const renderItem = ({ item, index }) => {
    const isAdminMessage = item.sender === ADMIN_ID;
    const isSameSender =
      index > 0 && messages[index - 1].sender === item.sender;
    const showHeader = !isSameSender || index === 0;

    return (
      <View
        style={[
          styles.messageContainer,
          isAdminMessage ? styles.adminContainer : styles.userContainer,
          showHeader ? null : styles.continuation,
        ]}
      >
        {showHeader && isAdminMessage && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>Support Agent</Text>
            {adminOnline && (
              <View style={styles.onlineIndicator}>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isAdminMessage ? styles.adminBubble : styles.userBubble,
          ]}
        >
          <Text style={styles.messageText}>{item.message}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {!isAdminMessage && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.read ? "#4CAF50" : "#999"}
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
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Customer Support</Text>
          <Text style={styles.headerSubtitle}>
            {adminOnline ? "Online now" : "Typically replies within 1 hour"}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuButton}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Chat Area */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : null}
        keyboardVerticalOffset={Platform.select({
          ios: 0,
          android: 20,
        })}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0050" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color="#FF0050" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchMessages(userId, true)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item) => item._id.toString()}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#FF0050"]}
                  tintColor="#FF0050"
                />
              }
              ListHeaderComponent={
                <View style={styles.chatStartIndicator}>
                  <Text style={styles.chatStartText}>Conversation started</Text>
                </View>
              }
            />

            {isTyping && (
              <View style={styles.typingIndicator}>
                <Image
                  source={require("../assets/typing-dots.gif")} // Add your typing indicator GIF
                  style={styles.typingImage}
                />
                <Text style={styles.typingText}>Support is typing...</Text>
              </View>
            )}
          </>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#888"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            editable={!loading}
            onSubmitEditing={sendMessage}
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

// Enhanced Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "#252525",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 15,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  messagesContainer: {
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  messageContainer: {
    marginBottom: 4,
    maxWidth: "80%",
  },
  adminContainer: {
    alignSelf: "flex-start",
  },
  userContainer: {
    alignSelf: "flex-end",
  },
  continuation: {
    marginTop: -6,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 8,
  },
  senderName: {
    color: "#FF0050",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  onlineIndicator: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineText: {
    color: "#4CAF50",
    fontSize: 10,
    fontWeight: "600",
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  adminBubble: {
    backgroundColor: "#252525",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: "#FF0050",
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginRight: 4,
  },
  statusIcon: {
    marginLeft: 2,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#252525",
    borderRadius: 18,
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 8,
  },
  typingImage: {
    width: 24,
    height: 12,
    marginRight: 8,
  },
  typingText: {
    color: "#aaa",
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#1E1E1E",
    borderTopWidth: 1,
    borderTopColor: "#252525",
  },
  textInput: {
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
    backgroundColor: "#252525",
  },
  chatStartIndicator: {
    alignSelf: "center",
    backgroundColor: "rgba(255,0,80,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  chatStartText: {
    color: "#FF0050",
    fontSize: 12,
    fontWeight: "500",
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
});

export default UserAdminChatScreen;
