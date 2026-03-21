import { useState, useEffect } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Contact {
	id: string;
	name: string;
	phone: string;
}

const STORAGE_KEY = '@sos_contacts';

export function ContactsScreen() {
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [contacts, setContacts] = useState<Contact[]>([]);

	useEffect(() => {
		loadContacts();
	}, []);

	const loadContacts = async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				setContacts(JSON.parse(stored));
			}
		} catch (error) {
			console.error('Failed to load contacts:', error);
		}
	};

	const saveContacts = async (newContacts: Contact[]) => {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
			setContacts(newContacts);
		} catch (error) {
			console.error('Failed to save contacts:', error);
		}
	};

	const addContact = () => {
		if (!name.trim() || !phone.trim()) {
			Alert.alert('Error', 'Please enter name and phone number');
			return;
		}

		const newContact: Contact = {
			id: Date.now().toString(),
			name: name.trim(),
			phone: phone.trim(),
		};

		saveContacts([...contacts, newContact]);
		setName('');
		setPhone('');
	};

	const deleteContact = (id: string) => {
		saveContacts(contacts.filter((c) => c.id !== id));
	};

	const renderItem = ({ item }: { item: Contact }) => (
		<View style={styles.contactItem}>
			<View>
				<Text style={styles.contactName}>{item.name}</Text>
				<Text style={styles.contactPhone}>{item.phone}</Text>
			</View>
			<Button title="Delete" onPress={() => deleteContact(item.id)} color="#ef4444" />
		</View>
	);

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				<TextInput
					style={styles.input}
					placeholder="Name"
					value={name}
					onChangeText={setName}
				/>
				<TextInput
					style={styles.input}
					placeholder="Phone Number"
					value={phone}
					onChangeText={setPhone}
					keyboardType="phone-pad"
				/>
				<Button title="Add Contact" onPress={addContact} />
			</View>
			<FlatList
				data={contacts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListEmptyComponent={<Text style={styles.empty}>No contacts yet</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 16,
	},
	inputContainer: {
		marginBottom: 16,
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 12,
	},
	contactItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	contactName: {
		fontSize: 16,
		fontWeight: '600',
	},
	contactPhone: {
		fontSize: 14,
		color: '#666',
	},
	empty: {
		textAlign: 'center',
		color: '#999',
		marginTop: 20,
	},
});
