import ReplyEditor from './ReplyEditor';

...

{selectedEmail && (
  <div className="mt-4">
    <ReplyEditor emailId={selectedEmail.id} initialDraft={selectedEmail.draft_text ?? ''} />
  </div>
)}
