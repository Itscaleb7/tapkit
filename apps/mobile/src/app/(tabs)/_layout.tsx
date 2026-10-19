import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors, fonts } from "@/theme/tokens";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
function icon(name: IconName, active: IconName) {
  function TabIcon({ color, focused }: { color: import("react-native").ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : name} size={24} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }} />
      <Tabs.Screen name="brand" options={{ title: "My Brand", tabBarIcon: icon("person-circle-outline", "person-circle") }} />
      <Tabs.Screen name="create" options={{ title: "Create", tabBarIcon: icon("add-circle-outline", "add-circle") }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: icon("analytics-outline", "analytics") }} />
      <Tabs.Screen name="opportunities" options={{ title: "Opportunities", tabBarIcon: icon("briefcase-outline", "briefcase") }} />
    </Tabs>
  );
}
