import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "@/components/HomeScreen";
import { ContactsScreen } from "@/components/ContactsScreen";
import { WalkScreen } from "@/components/WalkScreen";
import { MapScreen } from "@/components/MapScreen";
import { ProfileScreen } from "@/components/ProfileScreen";
import { colors, borderRadius } from "@/theme";

export type TabParamList = {
	Home: undefined;
	Contacts: undefined;
	Walk: undefined;
	Map: undefined;
	Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({
	name,
	focused,
}: {
	name: keyof typeof Ionicons.glyphMap;
	focused: boolean;
}) {
	return (
		<View style={styles.iconContainer}>
			<Ionicons
				name={name}
				size={24}
				color={focused ? colors.primary : colors.textSecondary}
			/>
			{focused && <View style={styles.activeDot} />}
		</View>
	);
}

export function TabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarStyle: styles.tabBar,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textSecondary,
				tabBarLabelStyle: styles.tabLabel,
				tabBarHideOnKeyboard: true,
			}}
		>
			<Tab.Screen
				name="Home"
				component={HomeScreen}
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon name={focused ? "home" : "home-outline"} focused={focused} />
					),
				}}
			/>
			<Tab.Screen
				name="Contacts"
				component={ContactsScreen}
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon name={focused ? "people" : "people-outline"} focused={focused} />
					),
				}}
			/>
			<Tab.Screen
				name="Walk"
				component={WalkScreen}
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon name={focused ? "walk" : "walk-outline"} focused={focused} />
					),
				}}
			/>
			<Tab.Screen
				name="Map"
				component={MapScreen}
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
					),
				}}
			/>
			<Tab.Screen
				name="Profile"
				component={ProfileScreen}
				options={{
					tabBarIcon: ({ focused }) => (
						<TabIcon name={focused ? "person" : "person-outline"} focused={focused} />
					),
				}}
			/>
		</Tab.Navigator>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: colors.card,
		borderTopWidth: 0,
		height: 70,
		paddingBottom: 16,
		paddingTop: 8,
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 0,
		elevation: 0,
		shadowOpacity: 0,
	},
	iconContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	activeDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.primary,
		marginTop: 4,
	},
	tabLabel: {
		fontSize: 11,
		fontWeight: "500",
	},
});
