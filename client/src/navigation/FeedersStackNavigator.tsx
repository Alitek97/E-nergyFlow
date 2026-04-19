import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedersScreen from "@/screens/FeedersScreen";
import TurbinesScreen from "@/screens/TurbinesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { withSecondaryGroupSwipe } from "@/navigation/SecondaryGroupSwipe";

export type FeedersStackParamList = {
  Feeders: undefined;
};

const Stack = createNativeStackNavigator<FeedersStackParamList>();
const SwipeableFeedersScreen = withSecondaryGroupSwipe(
  "FeedersTab",
  FeedersScreen,
  {
    leftPreviewComponent: TurbinesScreen,
  },
);

export default function FeedersStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Feeders"
        component={SwipeableFeedersScreen}
        options={{
          title: t("tab_feeders"),
          headerTitleAlign: "center",
        }}
      />
    </Stack.Navigator>
  );
}
