import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ExploreScreen from "../Screens/ExploreScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import MatchesScreen from "../Screens/MatchesScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#E91E63",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Explore") iconName = "compass";
          else if (route.name === "Matches") iconName = "heart";
          else if (route.name === "Profile") iconName = "person";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
