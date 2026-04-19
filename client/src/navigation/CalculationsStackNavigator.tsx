import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalculationsScreen from "@/screens/CalculationsScreen";
import ReportsScreen from "@/screens/ReportsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { withSecondaryGroupSwipe } from "@/navigation/SecondaryGroupSwipe";

export type CalculationsStackParamList = {
  Calculations: undefined;
};

const Stack = createNativeStackNavigator<CalculationsStackParamList>();
const SwipeableCalculationsScreen = withSecondaryGroupSwipe(
  "CalculationsTab",
  CalculationsScreen,
  {
    leftPreviewComponent: ReportsScreen,
  },
);

export default function CalculationsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Calculations"
        component={SwipeableCalculationsScreen}
        options={{
          title: t("tab_calculations"),
          headerTitleAlign: "center",
        }}
      />
    </Stack.Navigator>
  );
}
