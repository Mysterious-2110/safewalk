import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface SignupScreenProps {
	navigation: {
		navigate: (screen: string) => void;
	};
}

export function SignupScreen({ navigation }: SignupScreenProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const handleSignup = async () => {
		if (!email || !password) {
			Alert.alert('Error', 'Please fill in all fields');
			return;
		}

		try {
			await createUserWithEmailAndPassword(auth, email, password);
			Alert.alert('Success', 'Signup successful');
			navigation.navigate('Main');
		} catch (error: any) {
			Alert.alert('Error', error.message);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Sign Up</Text>
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
			<Button title="Sign Up" onPress={handleSignup} />
			<Text style={styles.link} onPress={() => navigation.navigate('Login')}>
				{"Already have an account? Login"}
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
