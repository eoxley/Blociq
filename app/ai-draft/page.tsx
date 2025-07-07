'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Draft = {
  id: string;
  input: string;
  output: string;
  category: string;
  building: string;
  created_at: string;
};

export default function AIDraftAssistant() {
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('leaseholder');
  const [building, setBuilding] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    async function loadDrafts() {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) setDrafts(data as Draft[]);
    }

    loadDrafts();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setOutput('');

    // Step 1: Generate AI draft
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        category,
        building,
        userId: 'demo-user',
      }),
    });

    const data = await res.json();
    const generatedDraft = data.draft || 'No draft returned';
    setOutput(generatedDraft);

    // Step 2: Refresh saved drafts
    const { data: newDrafts } = await supabase
      .from('drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    setDrafts(newDrafts as Draft[]);

    // ✅ Step 3: Create draft in Outlook
    await fetch('/api/outlook-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Response to Leaseholder',
        body: generatedDraft,
        to: '', // Optional: add recipient email here
      }),
    });

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-semibold">AI Draft Assistant</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leaseholder">Leaseholder</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="board">Board/Director</SelectItem>
              <SelectItem value="insurer">Insurer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Building</Label>
          <Input
            placeholder="e.g. 50 Kensington Gardens Square"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
          />
        </div>
      </div>

      <Textarea
        placeholder="Paste your leaseholder email, task, or query here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="min-h-[150px]"
      />

      <Button onClick={handleGenerate} disabled={loading || !input}>
        {loading ? 'Generating...' : 'Generate Draft'}
      </Button>

      {output && (
        <Card>
          <CardContent className="p-4 whitespace-pre-wrap">{output}</CardContent>
        </Card>
      )}

      {drafts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mt-8">Recent Drafts</h2>
          <div className="space-y-4 mt-4">
            {drafts.map((draft) => (
              <Card key={draft.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {draft.category} – {draft.building} –{' '}
                    {new Date(draft.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{draft.output}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
