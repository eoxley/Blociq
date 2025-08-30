export type SaveArgs = {
  buildingId?: string;
  filename?: string;
  docType?: string;
  contentText?: string;
  metadata?: Record<string, any>;
};
export async function saveComplianceDocument(args: SaveArgs) {
  // TODO: implement later. For now, just return args so routes compile.
  return { ok: true, ...args };
}