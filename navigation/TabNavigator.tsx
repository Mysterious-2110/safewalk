import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/components/HomeScreen';
import { ContactsScreen } from '@/components/ContactsScreen';
import { ProfileScreen } from '@/components/ProfileScreen';

export type TabParamList = {
	Home: undefined;
	Contacts: undefined;
	Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
	return (
		<Tab.Navigator>
			<Tab.Screen name="Home" component={HomeScreen} />
			<Tab.Screen name="Contacts" component={ContactsScreen} />
			<Tab.Screen name="Profile" component={ProfileScreen} />
		</Tab.Navigator>
	);
}
