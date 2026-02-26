import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import TurbinesStackNavigator from "@/navigation/TurbinesStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";

export type MainTabParamList = {
  TurbinesTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator26() {
  return (
    <Tab.Navigator
      initialRouteName="TurbinesTab"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="TurbinesTab"
        component={TurbinesStackNavigator}
        options={{
          title: "Turbines",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
