import EmailDraftAssistant from "@/components/ui/EmailDraftAssistant"

export default function EmailPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📬 AI Email Assistant</h1>
      <p className="mb-4 text-muted-foreground">
        Generate leaseholder and contractor emails using your property data, lease terms, and uploaded documents. Powered by GPT-4.
      </p>
      <EmailDraftAssistant />
    </div>
  )
}
