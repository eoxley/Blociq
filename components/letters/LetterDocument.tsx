import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 20,
  },
  recipient: {
    fontSize: 14,
    marginBottom: 30,
  },
  content: {
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  footer: {
    marginTop: 40,
    fontSize: 10,
    color: '#666666',
  },
})

interface LetterDocumentProps {
  recipientName: string
  subject: string
  content: string
}

export const LetterDocument: React.FC<LetterDocumentProps> = ({ 
  recipientName, 
  subject, 
  content 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{subject}</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.recipient}>
        <Text>Dear {recipientName},</Text>
      </View>
      
      <View style={styles.content}>
        <Text>{content}</Text>
      </View>
      
      <View style={styles.footer}>
        <Text>Yours sincerely,</Text>
        <Text>Property Management Team</Text>
      </View>
    </Page>
  </Document>
) 