import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../Screens/LoginScreen";
import RegisterScreen from "../Screens/RegisterScreen";
import ExploreScreen from "../Screens/ExploreScreen";
import ForgotPasswordScreen from "../Screens/ForgetPasswordScreen";
import AuthLoadingScreen from "../Screens/AuthLoadingScreen";
import ResetPasswordScreen from "../Screens/ResetPasswordScreen";
import TabNavigator from "./TabNavigator";
import UserMatch from "../Screens/UserMatch";
import EditProfileScreen from "../Screens/EditProfileScreen";
import SetGenderScreen from "../Screens/SetGenderScreen";
import UserAdminChatScreen from "../Screens/UserAdminChatScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AuthLoading"
        component={AuthLoadingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserMatch"
        component={UserMatch}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SetGender"
        component={SetGenderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserAdminChatScreen"
        component={UserAdminChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
