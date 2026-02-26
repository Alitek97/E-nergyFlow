import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TurbinesScreen from "@/screens/TurbinesScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";

export type TurbinesStackParamList = {
  Turbines: undefined;
};

const Stack = createNativeStackNavigator<TurbinesStackParamList>();

export default function TurbinesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Turbines"
        component={TurbinesScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("tab_turbines")} />,
        }}
      />
    </Stack.Navigator>
  );
}
