import { OpenAI } from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function handleAssistantQuery({
  userQuestion,
  buildingId = null,
  supabase,
}: {
  userQuestion: string
  buildingId?: string | null
  supabase: SupabaseClient
}) {
  // 🔍 Search documents by relevance to user question
  const { data: documents } = await supabase
    .from('building_documents')
    .select('file_name, text_content, type, building_id')
    .limit(5)
    .order('created_at', { ascending: false }) // Optional: add full-text search

  const matchedDocs = documents
    ?.filter((doc) => {
      const match = userQuestion.toLowerCase()
      return (
        doc.text_content?.toLowerCase().includes(match) ||
        doc.type?.toLowerCase().includes(match)
      )
    })
    .slice(0, 3)

  const context = matchedDocs
    ?.map((d) => `Document: ${d.file_name}\nType: ${d.type}\n\n${d.text_content?.slice(0, 1000)}`)
    .join('\n\n') || ''

  const prompt = `
You are BlocIQ — a property management assistant for UK leasehold blocks. Use real building documents to answer questions where possible.

If relevant, documents you can reference include:
${context || '[No matching documents found]'}

Question:
${userQuestion}

Answer:
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  })

  return response.choices[0].message?.content
} 