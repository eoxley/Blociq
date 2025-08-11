export const dynamic = 'force-dynamic'; // ensure not stuck on a stale static render
import InboxV2 from './v2/InboxV2';

export default function Page() {
  return <InboxV2 />;
}
