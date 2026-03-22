import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "@/components/LoginScreen";
import { SignupScreen } from "@/components/SignupScreen";
import { TabNavigator } from "@/navigation/TabNavigator";

export type RootStackParamList = {
	Login: undefined;
	Signup: undefined;
	Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
	return (
		<Stack.Navigator
			initialRouteName="Login"
			screenOptions={{
				animation: "slide_from_right",
				animationDuration: 200,
				contentStyle: { backgroundColor: "#0F172A" },
			}}
		>
			<Stack.Screen
				name="Login"
				component={LoginScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="Signup"
				component={SignupScreen}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="Main"
				component={TabNavigator}
				options={{ headerShown: false, animation: "fade" }}
			/>
		</Stack.Navigator>
	);
}
