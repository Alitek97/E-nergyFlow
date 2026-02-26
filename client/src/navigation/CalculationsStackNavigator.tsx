import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalculationsScreen from "@/screens/CalculationsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";

export type CalculationsStackParamList = {
  Calculations: undefined;
};

const Stack = createNativeStackNavigator<CalculationsStackParamList>();

export default function CalculationsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Calculations"
        component={CalculationsScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("tab_calculations")} />,
        }}
      />
    </Stack.Navigator>
  );
}
