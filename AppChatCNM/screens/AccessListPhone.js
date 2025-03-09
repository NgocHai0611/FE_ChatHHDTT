import { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, SafeAreaView } from "react-native";
import * as Contacts from "expo-contacts";

export default function AccessListPhone() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          setContacts(data); // Lưu danh bạ vào state
        }
      }
    })();
  }, []);

  const renderItem = ({ item }) => (
    <SafeAreaView>
      <View style={styles.contactItem}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.phoneNumbers && item.phoneNumbers.length > 0 && (
          <Text>{item.phoneNumbers[0].number}</Text>
        )}
        {item.emails && item.emails.length > 0 && (
          <Text>{item.emails[0].email}</Text>
        )}
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <Text>Contacts List</Text>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  contactItem: {
    marginBottom: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  contactName: {
    fontWeight: "bold",
    fontSize: 18,
  },
});
