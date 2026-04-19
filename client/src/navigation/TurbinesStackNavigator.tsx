import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TurbinesScreen from "@/screens/TurbinesScreen";
import FeedersScreen from "@/screens/FeedersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { withSecondaryGroupSwipe } from "@/navigation/SecondaryGroupSwipe";

export type TurbinesStackParamList = {
  Turbines: undefined;
};

const Stack = createNativeStackNavigator<TurbinesStackParamList>();
const SwipeableTurbinesScreen = withSecondaryGroupSwipe(
  "TurbinesTab",
  TurbinesScreen,
  {
    rightPreviewComponent: FeedersScreen,
  },
);

export default function TurbinesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Turbines"
        component={SwipeableTurbinesScreen}
        options={{
          title: t("tab_turbines"),
          headerTitleAlign: "center",
        }}
      />
    </Stack.Navigator>
  );
}
