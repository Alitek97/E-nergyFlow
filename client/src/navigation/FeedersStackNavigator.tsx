import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedersScreen from "@/screens/FeedersScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";

export type FeedersStackParamList = {
  Feeders: undefined;
};

const Stack = createNativeStackNavigator<FeedersStackParamList>();

export default function FeedersStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Feeders"
        component={FeedersScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("tab_feeders")} />,
        }}
      />
    </Stack.Navigator>
  );
}
