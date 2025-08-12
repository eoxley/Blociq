import { trace } from '@/lib/trace';

export const dynamic = 'force-dynamic'; // ensure not stuck on a stale static render
import InboxV2 from './v2/InboxV2';

export default function Page() {
  trace("Inbox page mounted", { file: "app/(dashboard)/inbox/page.tsx" });
  return <InboxV2 />;
}
