import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { BACKEND_URI } from "@env";

const API_URL = `${BACKEND_URI}`;

export default function AdminChatScreen({ route }) {
  const { chatId, adminId } = route.params;
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);

  // Fetch chat messages
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/chat/${chatId}`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Send a reply
  const sendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await axios.post(`${API_URL}/reply`, {
        chatId,
        adminId,
        message: replyText,
        messageId: replyTarget, // Optional: replying to a specific message
      });
      setReplyText("");
      setReplyTarget(null);
      fetchMessages();
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  // Poll messages every 2 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  // Render each message
  const renderMessage = ({ item }) => {
    const isAdmin = item.sender === adminId;
    return (
      <View
        style={[
          styles.messageBubble,
          isAdmin ? styles.adminMessage : styles.userMessage,
        ]}
      >
        {item.reply && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>{item.reply.message}</Text>
          </View>
        )}
        <Text style={styles.messageText}>{item.message}</Text>

        {!isAdmin && (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setReplyTarget(item._id)}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 10 }}
      />

      {replyTarget && (
        <View style={styles.replyingToBox}>
          <Text style={{ color: "white" }}>
            Replying to message ID: {replyTarget}
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your reply..."
          value={replyText}
          onChangeText={setReplyText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendReply}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  messageBubble: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: "80%",
  },
  adminMessage: { backgroundColor: "#DCF8C6", alignSelf: "flex-end" },
  userMessage: { backgroundColor: "#E4E6EB", alignSelf: "flex-start" },
  messageText: { fontSize: 16 },
  replyButton: { marginTop: 5 },
  replyButtonText: { color: "blue", fontSize: 12 },
  replyContainer: {
    backgroundColor: "#ccc",
    padding: 5,
    borderRadius: 5,
    marginBottom: 3,
  },
  replyText: { fontSize: 12, color: "#333" },
  replyingToBox: {
    backgroundColor: "#007bff",
    padding: 5,
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: "#007bff",
    padding: 10,
    marginLeft: 5,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
