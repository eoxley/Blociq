import ReplyEditor from './ReplyEditor';

interface InboxEmailProps {
  selectedEmail?: {
    id: string;
    draft_text?: string;
  };
}

export default function InboxEmail({ selectedEmail }: InboxEmailProps) {
  return (
    <>
      {selectedEmail && (
        <div className="mt-4">
          <ReplyEditor emailId={selectedEmail.id} initialDraft={selectedEmail.draft_text ?? ''} />
        </div>
      )}
    </>
  );
}
