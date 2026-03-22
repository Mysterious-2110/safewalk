import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { colors, spacing, borderRadius } from '@/theme';

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
				placeholderTextColor={colors.textSecondary}
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				placeholderTextColor={colors.textSecondary}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Button title="Login" onPress={handleLogin} color={colors.primary} />
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
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginBottom: spacing.lg,
	},
	input: {
		width: '100%',
		height: 52,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: borderRadius.md,
		paddingHorizontal: spacing.md,
		marginBottom: spacing.md,
		color: colors.textPrimary,
		fontSize: 16,
	},
	link: {
		marginTop: spacing.lg,
		color: colors.primary,
		fontSize: 14,
	},
});
