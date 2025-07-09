'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  const demoEmail = 'testblociq1@blociq.co.uk';

  useEffect(() => {
    const autoLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInWithOtp({ email: demoEmail });
        if (error) {
          setMessage(`Login failed: ${error.message}`);
        } else {
          setMessage(`Magic link sent to ${demoEmail}`);
        }
      } else {
        setMessage(`Logged in as ${session.user.email}`);
        setLoading(false);
      }
    };

    autoLogin();
  }, []);

  const resetInbox = async () => {
    setResetting(true);
    setMessage('');

    const { error: deleteError } = await supabase.from('incoming_emails').delete().neq('id', '');

    const { error: insertError } = await supabase.from('incoming_emails').insert([
      {
        subject: 'Broken entry phone at flat 2B',
        from_email: demoEmail,
        body_preview: 'The entry phone is buzzing randomly at night.',
        received_at: new Date(),
        handled: false,
      },
      {
        subject: 'Service charge query',
        from_email: demoEmail,
        body_preview: 'Could you explain the increase in the cleaning budget?',
        received_at: new Date(),
        handled: false,
      },
      {
        subject: 'Leaking tap in kitchen',
        from_email: demoEmail,
        body_preview: 'There is a slow leak under the sink again.',
        received_at: new Date(),
        handled: false,
      },
    ]);

    if (deleteError || insertError) {
      setMessage('Error resetting inbox.');
    } else {
      setMessage('Inbox reset with demo emails!');
    }

    setResetting(false);
  };

  return (
    <main className="p-10 space-y-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold">🧪 Demo Mode</h1>

      {message && <p className="text-sm text-gray-700">{message}</p>}

      <button
        onClick={resetInbox}
        disabled={resetting}
        className="bg-[#0F5D5D] text-white px-6 py-3 rounded hover:opacity-90 disabled:opacity-50"
      >
        {resetting ? 'Resetting...' : 'Reset Demo Inbox'}
      </button>
    </main>
  );
}
