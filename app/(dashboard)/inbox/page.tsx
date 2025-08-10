import InboxClient from './InboxClient';
import InboxV2 from './v2/InboxV2';

export const dynamic = 'force-dynamic';

export default function Page() {
  const useV2 = process.env.NEXT_PUBLIC_INBOX_V2 === 'true';
  return useV2 ? <InboxV2 /> : <InboxClient />;
}
