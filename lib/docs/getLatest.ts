// lib/docs/getLatest.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type LatestDocResult = {
  id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
  signed_url: string | null;
};

export async function getLatestDoc(
  building_id: string,
  doc_type: string,
  opts: { urlTTLSeconds?: number } = {}
): Promise<LatestDocResult | null> {
  const { data, error } = await supabaseAdmin
    .from("building_documents")
    .select("id,doc_type,file_name,storage_path,created_at")
    .eq("building_id", building_id)
    .eq("doc_type", doc_type)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;

  const doc = data[0];

  // Get a signed URL (storage bucket name assumed "documents"; change if needed)
  const path = doc.storage_path || doc.file_name;
  const TTL = opts.urlTTLSeconds ?? 60 * 60 * 24; // 24h
  const { data: urlData } = await (supabaseAdmin as any).storage
    .from("documents")
    .createSignedUrl(path, TTL);

  return {
    id: doc.id,
    doc_type: doc.doc_type,
    file_name: doc.file_name,
    storage_path: path,
    created_at: doc.created_at,
    signed_url: urlData?.signedUrl || null
  };
}
