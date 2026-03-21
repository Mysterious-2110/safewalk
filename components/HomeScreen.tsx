import { SafeAreaView, StyleSheet } from 'react-native';
import { SOSButton } from '@/components/SOSButton';

export function HomeScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<SOSButton />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
});
