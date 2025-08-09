import React, { useEffect, useState, useRef, useCallback } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BACKEND_URI } from "@env";
import { ADMIN_ID } from "@env";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const UserAdminChatScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chatDetails, setChatDetails] = useState(null);
  const flatListRef = useRef(null);

  // Get chatId from route params if available
  const chatId = route.params?.chatId;

  const fetchChat = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);

        let response;
        if (chatId) {
          // Fetch by chat ID
          response = await axios.get(`${BACKEND_URI}/api/chatAdmin/${chatId}`, {
            headers: {
              Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
            },
          });
        } else if (userId) {
          // Fetch by user ID
          response = await axios.get(
            `${BACKEND_URI}/api/chatAdmin/user/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
              },
            }
          );
        }

        setChatDetails({
          id: response.data.chatId,
          userId: response.data.userId,
          adminId: response.data.adminId,
          status: response.data.status,
        });
        setMessages(response.data.messages || []);
        setError(null);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error("Fetch error:", error);
          setError(error.response?.data?.message || "Failed to load chat");
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [chatId, userId]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchChat();
    } catch (error) {
      console.error("Refresh error:", error);
      setError("Failed to refresh messages");
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize chat and set up polling
  useEffect(() => {
    let interval;
    let isMounted = true;

    const initializeChat = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (!storedUserId) return;

        setUserId(storedUserId);
        await fetchChat(true);

        // Only start polling if we have a valid chat
        if (messages.length > 0 || chatId) {
          interval = setInterval(fetchChat, 5000); // Poll every 5 seconds
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    if (isMounted) {
      initializeChat();
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [chatId]);
  const sendMessage = async () => {
    if (!messageText.trim() || !userId) return;

    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      sender: userId,
      message: messageText,
      timestamp: new Date(),
      read: false,
    };

    try {
      // Optimistic UI update
      setMessages((prev) => [...prev, tempMessage]);
      setMessageText("");

      // Send to backend
      const response = await axios.post(
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

      // Replace temp message with actual message from server
      setMessages((prev) => [
        ...prev.filter((msg) => msg._id !== tempId),
        {
          ...response.data.newMessage,
          _id: response.data.newMessage._id || tempId, // Fallback to tempId if missing
        },
      ]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Send error:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      // Remove the optimistic update if failed
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
    }
  };

  const renderItem = ({ item }) => {
    const isAdminMessage = item.sender === ADMIN_ID || item.isAdmin;
    const isSystemMessage = item.systemMessage;

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.message}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isAdminMessage ? styles.adminRow : styles.userRow,
        ]}
      >
        <View
          style={[
            styles.messageContainer,
            isAdminMessage ? styles.adminMessage : styles.userMessage,
          ]}
        >
          {isAdminMessage && (
            <Text style={styles.senderName}>
              {chatDetails?.adminId?.name || "Agent"}
            </Text>
          )}
          {!isAdminMessage && (
            <Text style={styles.senderName}>
              {chatDetails?.userId?.name || "You"}
            </Text>
          )}

          <Text
            style={
              isAdminMessage ? styles.adminMessageText : styles.userMessageText
            }
          >
            {item.message}
          </Text>

          {item.reply && (
            <View
              style={[
                styles.replyContainer,
                item.reply.sender === ADMIN_ID
                  ? styles.adminReply
                  : styles.userReply,
              ]}
            >
              <Text style={styles.replyText}>
                {item.reply.sender === ADMIN_ID
                  ? "Agent replied: "
                  : "You replied: "}
                {item.reply.message}
              </Text>
            </View>
          )}

          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {!isAdminMessage && (
              <Ionicons
                name="checkmark-done"
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
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {chatDetails?.adminId?.name
              ? `Chat with ${chatDetails.adminId.name}`
              : "Support Chat"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {chatDetails?.status || "..."}
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
          android: 20,
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
              onPress={() => fetchChat(true)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) =>
              item._id?.toString() || Math.random().toString()
            } // Safe key extractor
            contentContainerStyle={styles.messagesList}
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
                backgroundColor="#000"
                progressBackgroundColor="#1E1E1E"
              />
            }
          />
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputArea,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
          ]}
        >
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
    marginBottom: 12,
    maxWidth: width * 0.85,
  },
  userRow: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  adminRow: {
    justifyContent: "flex-start",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  adminMessage: {
    backgroundColor: "#252525",
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
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
  adminMessageText: {
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
  senderName: {
    color: "#FF0050",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "bold",
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
