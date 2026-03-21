import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface LoginScreenProps {
	navigation: {
		navigate: (screen: string) => void;
	};
}

export function LoginScreen({ navigation }: LoginScreenProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert('Error', 'Please fill in all fields');
			return;
		}

		try {
			await signInWithEmailAndPassword(auth, email, password);
			Alert.alert('Success', 'Login successful');
			navigation.navigate('Main');
		} catch (error: any) {
			Alert.alert('Error', error.message);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login</Text>
			<TextInput
				style={styles.input}
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Button title="Login" onPress={handleLogin} />
			<Text style={styles.link} onPress={() => navigation.navigate('Signup')}>
				{"Don't have an account? Sign Up"}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 24,
	},
	input: {
		width: '100%',
		height: 48,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 16,
	},
	link: {
		marginTop: 16,
		color: '#007bff',
	},
});
