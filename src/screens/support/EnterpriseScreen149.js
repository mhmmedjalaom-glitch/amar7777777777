
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function EnterpriseScreen149() {
  const [balance] = useState('91548 YER');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>عمار جلعوم - EnterpriseScreen149</Text>

      <View style={styles.card}>
        <Text style={styles.balance}>الرصيد: {balance}</Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>تنفيذ العملية</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:'#f1f5f9',
    padding:20
  },
  title:{
    fontSize:30,
    fontWeight:'bold',
    marginBottom:20
  },
  card:{
    backgroundColor:'#0284c7',
    borderRadius:20,
    padding:25,
    marginBottom:20
  },
  balance:{
    color:'#fff',
    fontSize:22
  },
  button:{
    backgroundColor:'#0f172a',
    padding:18,
    borderRadius:14
  },
  buttonText:{
    color:'#fff',
    textAlign:'center'
  }
});
