import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/components/LoginScreen';
import { SignupScreen } from '@/components/SignupScreen';
import { TabNavigator } from '@/navigation/TabNavigator';

export type RootStackParamList = {
	Login: undefined;
	Signup: undefined;
	Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
	return (
		<Stack.Navigator initialRouteName="Login">
			<Stack.Screen name="Login" component={LoginScreen} />
			<Stack.Screen name="Signup" component={SignupScreen} />
			<Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
		</Stack.Navigator>
	);
}
