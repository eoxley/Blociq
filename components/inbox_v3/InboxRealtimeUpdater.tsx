'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function InboxRealtimeUpdater({ onUpdate }: { onUpdate: () => void }) {
  const supabase = createClientComponentClient();

  useEffect(() => {
    const sub = supabase
      .channel('incoming-emails')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incoming_emails' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [supabase, onUpdate]);

  return null;
}
