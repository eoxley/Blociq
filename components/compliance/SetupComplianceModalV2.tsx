"use client";
import { useEffect, useMemo, useState } from "react";
import { 
  Shield, 
  Building2, 
  FileText, 
  Search, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Zap, 
  Flame, 
  Droplets, 
  Wrench, 
  HardHat, 
  Car, 
  TreePine, 
  Lock, 
  Eye,
  Upload,
  Save,
  Settings,
  BarChart3,
  Info
} from "lucide-react";
import { canonicaliseCategory, canonicaliseTitle, deriveFrequencyLabel } from "@/lib/compliance/normalise";

type Asset = { 
  id: string; 
  name: string; 
  category: string; 
  description?: string | null; 
  frequency_months?: number | null; 
  frequency?: string | null 
};

// Category icons mapping
const categoryIcons: Record<string, any> = {
  "Fire Safety": Flame,
  "Water Safety": Droplets,
  "Electrical": Zap,
  "Building Structure": Building2,
  "Lifts": Car,
  "Landscaping": TreePine,
  "Security": Lock,
  "Accessibility": Eye,
  "Maintenance": Wrench,
  "Construction": HardHat,
  "HRB": Shield,
  "Other": FileText
};

export default function SetupComplianceModalV2({
  open, buildingId, onClose, onSaved
}: { open: boolean; buildingId: string; onClose: () => void; onSaved: () => void }) {
  const [master, setMaster] = useState<Asset[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [locked, setLocked] = useState<Set<string>>(new Set()); // HRB-locked
  const [hrb, setHrb] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({}); // per asset file
  const [loading, setLoading] = useState(true);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Record<string, string>>({}); // asset id -> warning message

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    
    (async () => {
      try {
        const [m, s] = await Promise.all([
          fetch("/api/compliance/assets/list").then(r => r.json()),
          fetch(`/api/buildings/${buildingId}/compliance/selected`, { cache: "no-store" }).then(r => r.json())
        ]);
        
        if (!alive) return;
        
        if (m.error) throw new Error(m.error);
        if (s.error) throw new Error(s.error);
        
        setMaster(m.data || []);
        const ex = new Set<string>((s.asset_ids || []) as string[]);
        setExisting(ex);
        const pre: Record<string, boolean> = {};
        ex.forEach(id => pre[id] = true);
        setSelected(pre);
      } catch (e: any) { 
        setErr(e.message || "Failed to load compliance assets"); 
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, buildingId]);

  // HRB preset
  useEffect(() => {
    if (!open || loading) return;
    const hrbIds = new Set(master.filter(a => /^HRB/i.test(a.category)).map(a => a.id));
    if (hrb) {
      const next = { ...selected };
      hrbIds.forEach(id => next[id] = true);
      setSelected(next);
      setLocked(hrbIds);
    } else {
      // unlock but keep user's choices
      setLocked(new Set());
    }
  }, [hrb, master, open, loading, selected]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return master.filter(a => !t || a.name.toLowerCase().includes(t) || a.category.toLowerCase().includes(t));
  }, [master, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Asset[]> = {};
    for (const a of filtered) (g[a.category || "Other"] ||= []).push(a);
    return g;
  }, [filtered]);

  const isChecked = (id: string) => !!selected[id];
  const isLocked = (id: string) => locked.has(id);
  const toggle = (id: string) => { if (isLocked(id)) return; setSelected(s => ({ ...s, [id]: !s[id] })); };

  function selectAll(cat: string, on: boolean) {
    const next = { ...selected };
    for (const a of grouped[cat] || []) {
      if (isLocked(a.id)) { next[a.id] = true; continue; }
      next[a.id] = on || existing.has(a.id);
    }
    setSelected(next);
  }

  const newlyChosen = Object.keys(selected).filter(id => selected[id] && !existing.has(id));
  const canSave = newlyChosen.length > 0 && !busy;

  // Check for potential duplicates when selecting assets
  useEffect(() => {
    if (!master.length) return;
    
    const warnings: Record<string, string> = {};
    const selectedAssets = master.filter(a => selected[a.id]);
    
    // Group by normalised category and title
    const normalisedGroups: Record<string, Asset[]> = {};
    
    selectedAssets.forEach(asset => {
      const normCategory = canonicaliseCategory(asset.category).toLowerCase();
      const normTitle = canonicaliseTitle(asset.name).toLowerCase();
      const key = `${normCategory}|${normTitle}`;
      
      if (!normalisedGroups[key]) {
        normalisedGroups[key] = [];
      }
      normalisedGroups[key].push(asset);
    });
    
    // Check for duplicates
    Object.entries(normalisedGroups).forEach(([key, assets]) => {
      if (assets.length > 1) {
        const [category, title] = key.split('|');
        const canonicalCategory = canonicaliseCategory(assets[0].category);
        const canonicalTitle = canonicaliseTitle(assets[0].name);
        
        assets.forEach(asset => {
          warnings[asset.id] = `This asset will be merged with similar items in "${canonicalCategory}" (e.g., "${canonicalTitle}")`;
        });
      }
    });
    
    setDuplicateWarnings(warnings);
  }, [selected, master]);

  // Save: add rows, fetch ids, then upload files mapped to each bca row
  async function save() {
    if (!canSave) return;
    setBusy(true);
    setErr(null);
    
    try {
      console.log("Saving compliance assets:", { buildingId, newlyChosen });
      
      // 1) Add building assets
      const addResponse = await fetch(`/api/buildings/${buildingId}/compliance/bulk-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_ids: newlyChosen })
      });
      
      const add = await addResponse.json();
      console.log("Bulk add response:", add);
      if (add.error) throw new Error(add.error);

      // 2) Map compliance_asset_id -> bca_id
      const j = await fetch(`/api/buildings/${buildingId}/compliance`, { cache: "no-store" }).then(r => r.json());
      if (j.error) throw new Error(j.error);
      
      const bcaByAsset: Record<string, string> = {};
      for (const row of (j.data || [])) bcaByAsset[row.asset_id] = row.bca_id;

      // 3) Upload files (only for those with a file)
      for (const assetId of newlyChosen) {
        const f = files[assetId];
        if (!f) continue;
        const bca_id = bcaByAsset[assetId];
        if (!bca_id) continue;
        
        const form = new FormData();
        form.append("file", f);
        form.append("bca_id", bca_id);
        form.append("building_id", buildingId);
        
        const uploadResponse = await fetch("/api/compliance/upload", { method: "POST", body: form });
        if (!uploadResponse.ok) {
          console.warn(`Failed to upload file for asset ${assetId}`);
        }
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally { 
      setBusy(false); 
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto communications-modal" style={{ position: 'fixed', zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 communications-modal-content" style={{ position: 'relative', zIndex: 10000 }}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-[9999] communications-modal" onClick={onClose}></div>
        
        <div 
          className="absolute right-0 top-0 h-full w-full max-w-5xl bg-white shadow-2xl border-l border-gray-200 flex flex-col communications-modal-content"
          style={{ 
            position: 'absolute', 
            zIndex: 10000,
            isolation: 'isolate',
            willChange: 'transform'
          }}
        >
        
        {/* Hero Banner Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Compliance Setup</h2>
                  <p className="text-blue-100">Configure compliance tracking for your building</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Search and HRB Toggle */}
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <input 
                  type="checkbox" 
                  checked={hrb} 
                  onChange={e => setHrb(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium">Mark as <strong>HRB</strong> (apply BSA items)</span>
              </label>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search assets or categories…"
                  className="w-80 pl-10 pr-4 py-2 rounded-lg border-0 bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading compliance assets...</p>
            </div>
          ) : (
            <div className="p-6 grid gap-6 md:grid-cols-2">
              {Object.entries(grouped).map(([cat, items]) => {
                const IconComponent = categoryIcons[cat] || FileText;
                return (
                  <section key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Category Mini Hero Banner */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{cat}</h3>
                            <p className="text-sm text-gray-600">{items.length} asset{items.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => selectAll(cat, true)} 
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                          >
                            Select All
                          </button>
                          <button 
                            onClick={() => selectAll(cat, false)} 
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {items.map(a => (
                        <div key={a.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              className="h-5 w-5 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={isChecked(a.id)}
                              disabled={existing.has(a.id) || isLocked(a.id)}
                              onChange={() => toggle(a.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-sm font-medium text-gray-900">{a.name}</h4>
                                {a.frequency_months && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                    <Clock className="h-3 w-3" />
                                    Every {a.frequency_months} months
                                  </span>
                                )}
                                {deriveFrequencyLabel(a.frequency_months, a.frequency) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                    <Calendar className="h-3 w-3" />
                                    {deriveFrequencyLabel(a.frequency_months, a.frequency)}
                                  </span>
                                )}
                                {isLocked(a.id) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                    <Shield className="h-3 w-3" />
                                    HRB Mandated
                                  </span>
                                )}
                                {existing.has(a.id) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                    <CheckCircle className="h-3 w-3" />
                                    Already Tracking
                                  </span>
                                )}
                              </div>
                              
                              {a.description && (
                                <p className="text-sm text-gray-600 mb-3">{a.description}</p>
                              )}

                              {/* Duplicate Warning */}
                              {duplicateWarnings[a.id] && (
                                <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm text-amber-800 font-medium">Duplicate Warning</span>
                                  </div>
                                  <p className="text-xs text-amber-700 mt-1">{duplicateWarnings[a.id]}</p>
                                </div>
                              )}

                              {/* File Upload Section */}
                              {isChecked(a.id) && !existing.has(a.id) && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Upload className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">Attach Current Document</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="file"
                                      onChange={e => {
                                        const f = e.target.files?.[0] || null;
                                        setFiles(prev => ({ ...prev, [a.id]: f }));
                                      }}
                                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                    />
                                    {files[a.id] && (
                                      <span className="text-sm text-blue-600 font-medium">{files[a.id]?.name}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-blue-600 mt-1">Optional: Upload current compliance document</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {err && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{err}</span>
                </div>
              )}
              <div className="text-sm text-gray-600">
                {newlyChosen.length > 0 && (
                  <span className="font-medium text-blue-600">{newlyChosen.length}</span>
                )} asset{newlyChosen.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Setup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
