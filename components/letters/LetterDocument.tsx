'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 20,
  },
  recipient: {
    marginBottom: 10,
  },
  body: {
    marginTop: 20,
  },
})

export function LetterDocument({
  recipientName,
  subject,
  content,
}: {
  recipientName: string
  subject: string
  content: string
}) {
  return (
    <Document>
      <Page style={styles.page}>
        <View style={styles.header}>
          <Text>BlocIQ</Text>
          <Text>123 Property Lane</Text>
          <Text>London</Text>
          <Text>{new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.recipient}>
          <Text>{recipientName}</Text>
          <Text>(Address block to be added)</Text>
        </View>

        <View>
          <Text>Subject: {subject}</Text>
        </View>

        <View style={styles.body}>
          <Text>{content}</Text>
        </View>
      </Page>
    </Document>
  )
} 