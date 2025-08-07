import React, { useEffect } from "react";
import AppNavigator from "./Navigation/AppNavigator";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BACKEND_URI } from "@env";

const registerPushToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;
  const userToken = await AsyncStorage.getItem("token");

  if (userToken && pushToken) {
    try {
      await axios.put(
        `${BACKEND_URI}/api/users/push-token`,
        { pushToken },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error sending push token:", error.message);
    }
  }
};

export default function App() {
  useEffect(() => {
    registerPushToken();
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );
    return () => subscription.remove(); // Clean up
  }, []);

  return <AppNavigator />;
}
