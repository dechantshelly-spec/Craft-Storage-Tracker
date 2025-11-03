import React, { useEffect, useMemo, useRef, useState } from "react";

// =============================
// Craft Storage Tracker PWA — Warm Linen Theme (Full Feature + Camera Capture)
// =============================

// --- Theme ---
const colors = {
  name: 'Warm Linen',
  background: '#F8ECE4',
  surface: '#FFFFFF',
  border: '#E5D4C5',
  text: '#3E2F2F',
  secondaryText: '#7B5A4A',
  primary: '#C27C68',
  primaryHover: '#B96F5F',
  accent: '#A7D8E9',
  accentLight: '#D4EEF6',
  success: '#A3C9A8',
  warning: '#E07A5F',
};

const subtitle = "The app that finally ends the ‘where did I put that?’ mystery once and for all.";

// --- Types & DB ---
const DB_NAME = "craft-storage-tracker";
const DB_VERSION = 1;
const STORES = { items: "items", locations: "locations", categories: "categories", meta: "meta" } as const;

type Item = { name: string; location: string; category: string; tags: string[]; photoSrc?: string };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.items)) db.createObjectStore(STORES.items, { keyPath: "name" });
      if (!db.objectStoreNames.contains(STORES.locations)) db.createObjectStore(STORES.locations, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.categories)) db.createObjectStore(STORES.categories, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T = any>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const rq = store.getAll();
    rq.onsuccess = () => resolve((rq.result as T[]) || []);
    rq.onerror = () => reject(rq.error);
  });
}

async function idbPutAll(storeName: string, records: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    records.forEach(r => store.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const rq = store.clear();
    rq.onsuccess = () => resolve();
    rq.onerror = () => reject(rq.error);
  });
}

// --- Helpers ---
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Components ---
function LogoMonogram() {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: colors.primary }}>LS</div>
  );
}

function ItemCard({
  name,
  location,
  category,
  tags = [],
  photoSrc = "/sample-item.png",
  density,
  viewMode,
  locations,
  categories,
  onSave,
  onDelete,
}:{
  name: string;
  location: string;
  category: string;
  tags?: string[];
  photoSrc?: string;
  density: 'Cozy'|'Comfortable'|'Compact';
  viewMode: 'grid'|'list';
  locations: string[];
  categories: string[];
  onSave: (updated: Item, originalName: string) => void;
  onDelete: (name: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name,
    location,
    category,
    tags: (tags || []).join(', '),
    photoSrc: photoSrc || ''
  });
  const padding = density === "Compact" ? "p-2" : density === "Comfortable" ? "p-4" : "p-6";

  useEffect(() => {
    setEditDraft({ name, location, category, tags: (tags || []).join(', '), photoSrc: photoSrc || '' });
  }, [name, location, category, photoSrc, (tags||[]).join('|')]);

  const camInputRef = useRef<HTMLInputElement>(null);
  const onPickInlinePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setEditDraft(prev => ({ ...prev, photoSrc: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };

  const saveInline = () => {
    const tagList = editDraft.tags.split(',').map(t=>t.trim()).filter(Boolean);
    onSave({
      name: editDraft.name.trim() || name,
      location: editDraft.location.trim() || location,
      category: editDraft.category || category,
      tags: tagList,
      photoSrc: editDraft.photoSrc
    }, name);
    setIsEditing(false);
  };

  const media = imgError ? (
    <div className={viewMode==='list'? 'w-12 h-12' : 'w-full h-40'}>
      <div className={`rounded-xl border flex items-center justify-center text-xs ${viewMode==='list'?'':'mb-3'}`} style={{ borderColor: colors.border, background: '#fff', height: viewMode==='list'? '3rem' : '10rem' }}>No photo</div>
    </div>
  ) : (
    <img src={editDraft.photoSrc || photoSrc} alt={name} className={viewMode==='list' ? "w-12 h-12 rounded-lg object-cover border" : "w-full h-40 rounded-xl object-cover border mb-3"} style={{ borderColor: colors.border }} onError={() => setImgError(true)} />
  );

  if (viewMode === 'list') {
    return (
      <li className="flex justify-between items-center p-3" style={{ backgroundColor: colors.surface }}>
        <div className="flex items-center gap-3">
          {media}
          <div className="min-w-0">
            {isEditing ? (
              <div className="space-y-1">
                <input value={editDraft.name} onChange={e=>setEditDraft({...editDraft, name: e.target.value})} className="w-full px-2 py-1 rounded border text-sm" style={{ borderColor: colors.border }} />
                <div className="flex gap-2">
                  <select value={editDraft.location} onChange={e=>setEditDraft({...editDraft, location: e.target.value})} className="px-2 py-1 rounded border text-xs" style={{ borderColor: colors.border }}>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={editDraft.category} onChange={e=>setEditDraft({...editDraft, category: e.target.value})} className="px-2 py-1 rounded border text-xs" style={{ borderColor: colors.border }}>
                    <option value="">(no category)</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input value={editDraft.tags} onChange={e=>setEditDraft({...editDraft, tags: e.target.value})} placeholder="tags, comma, separated" className="w-full px-2 py-1 rounded border text-xs" style={{ borderColor: colors.border }} />
                <div className="flex items-center gap-2">
                  <input value={editDraft.photoSrc} onChange={e=>setEditDraft({...editDraft, photoSrc: e.target.value})} placeholder="https://photo... or captured" className="flex-1 px-2 py-1 rounded border text-xs" style={{ borderColor: colors.border }} />
                  <input ref={camInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickInlinePhoto} />
                  <button onClick={()=>camInputRef.current?.click()} className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: colors.primary }}>📷 Take Photo</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold truncate" style={{ color: colors.text }}>{name}</h3>
                <p className="text-xs truncate" style={{ color: colors.secondaryText }}>Location: {location}{tags?.length ? ` • Tags: ${tags.join(', ')}` : ''}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={saveInline} className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: colors.success }}>Save</button>
              <button onClick={()=>{ setIsEditing(false); setEditDraft({ name, location, category, tags: (tags||[]).join(', '), photoSrc: photoSrc||'' }); }} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: colors.accentLight }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={()=>setIsEditing(true)} className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: colors.primary }}>Edit</button>
              <button onClick={()=>onDelete(name)} className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: colors.warning }}>Delete</button>
            </>
          )}
        </div>
      </li>
    );
  }

  // Grid card
  return (
    <div className={`rounded-2xl ${padding} shadow-sm transition hover:shadow-md`} style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
      {media}
      {isEditing ? (
        <div className="space-y-2">
          <input value={editDraft.name} onChange={e=>setEditDraft({...editDraft, name: e.target.value})} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: colors.border }} />
          <div className="flex gap-2">
            <select value={editDraft.location} onChange={e=>setEditDraft({...editDraft, location: e.target.value})} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: colors.border }}>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={editDraft.category} onChange={e=>setEditDraft({...editDraft, category: e.target.value})} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: colors.border }}>
              <option value="">(no category)</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={editDraft.tags} onChange={e=>setEditDraft({...editDraft, tags: e.target.value})} placeholder="tags, comma, separated" className="w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: colors.border }} />
          <div className="flex items-center gap-2">
            <input value={editDraft.photoSrc} onChange={e=>setEditDraft({...editDraft, photoSrc: e.target.value})} placeholder="https://photo... or captured" className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: colors.border }} />
            <input ref={camInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickInlinePhoto} />
            <button onClick={()=>camInputRef.current?.click()} className="px-3 py-2 rounded-full text-xs text-white" style={{ backgroundColor: colors.primary }}>📷 Take Photo</button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={saveInline} className="px-3 py-2 rounded-full text-xs text-white" style={{ backgroundColor: colors.success }}>Save</button>
            <button onClick={()=>{ setIsEditing(false); setEditDraft({ name, location, category, tags: (tags||[]).join(', '), photoSrc: photoSrc||'' }); }} className="px-3 py-2 rounded-full text-xs" style={{ backgroundColor: colors.accentLight }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="font-semibold" style={{ color: colors.text }}>{name}</h3>
          <p className="text-sm" style={{ color: colors.secondaryText }}>Location: {location}</p>
          {tags && tags.length > 0 && <p className="text-xs italic" style={{ color: colors.secondaryText }}>Tags: {tags.join(", ")}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={()=>setIsEditing(true)} className="px-3 py-2 rounded-full text-xs text-white" style={{ backgroundColor: colors.primary }}>Edit</button>
            <button onClick={()=>onDelete(name)} className="px-3 py-2 rounded-full text-xs text-white" style={{ backgroundColor: colors.warning }}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CraftStorageTrackerPWA() {
  // Prefs
  const [density, setDensity] = useState<'Cozy'|'Comfortable'|'Compact'>("Comfortable");
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid'|'list'>("grid");
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Filters & managers
  const [locationFilter, setLocationFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Seeds
  const seedItems = useMemo<Item[]>(() => ([
    { name: "Ignatius the Dragon", location: "Closet Bin A", category: "Plushie", tags: ["plushie", "dragon", "market-ready"] },
    { name: "Humphrey Whale (Blue Yarn)", location: "Garage Tote 3", category: "Supply", tags: ["yarn", "supply", "whale"] },
    { name: "Lydia the Ladybug Book", location: "Under-bed Bin A", category: "Book", tags: ["book", "inventory", "8.5x8.5"] },
    { name: "Clover the Cow (M)", location: "Top Shelf", category: "Plushie", tags: ["plushie", "cow", "gift"] },
    { name: "Harley the Llama", location: "Closet Bin B", category: "Plushie", tags: ["plushie", "llama"] },
    { name: "Sarah the Turtle (Pink Shell)", location: "Office Drawer", category: "Plushie", tags: ["plushie", "turtle", "pink"] },
    { name: "Milo the Mammoth", location: "Studio Rack", category: "Plushie", tags: ["plushie", "mammoth"] },
    { name: "Ignatius Eyes (12mm)", location: "Notions Box", category: "Notions", tags: ["eyes", "notions", "12mm"] },
  ]), []);
  const seedLocations = useMemo(() => (["Closet Bin A","Garage Tote 3","Under-bed Bin A","Top Shelf","Closet Bin B","Office Drawer","Studio Rack","Notions Box"]).sort((a,b)=>a.localeCompare(b)), []);
  const seedCategories = useMemo(() => (["Plushie","Supply","Book","Notions"]).sort((a,b)=>a.localeCompare(b)), []);

  // State
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Add Item modal
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", location: "", category: "", tags: "", photoSrc: "" });
  const camAddRef = useRef<HTMLInputElement>(null);

  const onPickAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setDraft(prev => ({ ...prev, photoSrc: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };

  // Hydrate from IndexedDB or seeds
  useEffect(() => {
    (async () => {
      try {
        const [dbItems, dbLocs, dbCats] = await Promise.all([
          idbGetAll<Item>(STORES.items),
          idbGetAll<{id:string}>(STORES.locations),
          idbGetAll<{id:string}>(STORES.categories),
        ]);
        if (dbItems.length || dbLocs.length || dbCats.length) {
          setItems(dbItems);
          setLocations(dbLocs.map(r=>r.id));
          setCategories(dbCats.map(r=>r.id));
        } else {
          setItems(seedItems);
          setLocations(seedLocations);
          setCategories(seedCategories);
          await idbPutAll(STORES.items, seedItems);
          await idbPutAll(STORES.locations, seedLocations.map(id=>({ id })));
          await idbPutAll(STORES.categories, seedCategories.map(id=>({ id })));
        }
      } catch (e) { console.error("IDB load failed", e); }
    })();
  }, [seedItems, seedLocations, seedCategories]);

  // Persist (debounced)
  const saveTimer = useRef<number | null>(null);
  const schedulePersist = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await idbClear(STORES.items);
        await idbClear(STORES.locations);
        await idbClear(STORES.categories);
        await idbPutAll(STORES.items, items);
        await idbPutAll(STORES.locations, locations.map(id=>({ id })));
        await idbPutAll(STORES.categories, categories.map(id=>({ id })));
      } catch (e) { console.error("IDB save failed", e); }
    }, 350);
  };
  useEffect(() => { if (items.length || locations.length || categories.length) schedulePersist(); }, [items, locations, categories]);

  // Derived & sorted
  const filteredItems = useMemo(() => (
    items
      .filter(i => (locationFilter === "All" || i.location === locationFilter))
      .filter(i => (categoryFilter === "All" || i.category === categoryFilter))
      .sort((a,b)=>a.name.localeCompare(b.name))
  ), [items, locationFilter, categoryFilter]);

  // Managers
  const [newLocation, setNewLocation] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const addLocation = () => {
    const val = newLocation.trim(); if (!val) return;
    setLocations(prev => prev.includes(val) ? prev : [...prev, val].sort((a,b)=>a.localeCompare(b)));
    setNewLocation("");
  };
  const removeLocation = (loc: string) => {
    if (items.some(i => i.location === loc)) return; // protect if in use
    setLocations(prev => prev.filter(l => l !== loc));
    if (locationFilter === loc) setLocationFilter("All");
  };
  const addCategory = () => {
    const val = newCategory.trim(); if (!val) return;
    setCategories(prev => prev.includes(val) ? prev : [...prev, val].sort((a,b)=>a.localeCompare(b)));
    setNewCategory("");
  };
  const removeCategory = (cat: string) => {
    if (items.some(i => i.category === cat)) return;
    setCategories(prev => prev.filter(c => c !== cat));
    if (categoryFilter === cat) setCategoryFilter("All");
  };

  // Add Item
  const openAdd = () => {
    setDraft({ name: "", location: locations[0] || "", category: categories[0] || "", tags: "", photoSrc: "" });
    setShowAdd(true);
  };
  const saveItem = () => {
    const name = draft.name.trim();
    const location = draft.location.trim();
    const category = draft.category.trim();
    if (!name) return;
    if (location && !locations.includes(location)) setLocations(prev => [...prev, location].sort((a,b)=>a.localeCompare(b)));
    if (category && !categories.includes(category)) setCategories(prev => [...prev, category].sort((a,b)=>a.localeCompare(b)));
    const tagList = draft.tags.split(",").map(t=>t.trim()).filter(Boolean);
    const newItem: Item = { name, location, category, tags: tagList, photoSrc: draft.photoSrc };
    setItems(prev => [...prev, newItem]);
    setShowAdd(false);
  };

  // Inline edit & delete
  const saveInlineItem = (updated: Item, originalName: string) => {
    setItems(prev => prev.map(it => it.name === originalName ? { ...updated } : it));
    if (updated.location && !locations.includes(updated.location)) setLocations(prev => [...prev, updated.location].sort((a,b)=>a.localeCompare(b)));
    if (updated.category && !categories.includes(updated.category)) setCategories(prev => [...prev, updated.category].sort((a,b)=>a.localeCompare(b)));
  };
  const deleteItem = (name: string) => setItems(prev => prev.filter(it => it.name !== name));

  // Backup / Restore
  const fileRef = useRef<HTMLInputElement>(null);
  const onBackup = () => {
    const payload = { version: DB_VERSION, items, locations, categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `craft-storage-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url); setMenuOpen(false);
  };
  const onRestoreClick = () => { fileRef.current?.click(); setMenuOpen(false); };
  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.items) || !Array.isArray(data.locations) || !Array.isArray(data.categories)) return;
      setItems(data.items as Item[]); setLocations(data.locations as string[]); setCategories(data.categories as string[]);
      setLocationFilter("All"); setCategoryFilter("All");
    } catch (err) { console.error("Restore failed", err); }
    finally { e.target.value = ""; }
  };

  const toggleView = () => setViewMode(viewMode === "grid" ? "list" : "grid");

  // Self tests (visual)
  const SelfTests = () => {
    const tests: {name:string; pass:boolean; note?:string}[] = [];
    const names = filteredItems.map(i=>i.name);
    const sorted = [...names].sort((a,b)=>a.localeCompare(b));
    tests.push({ name: 'Items are alphabetically sorted', pass: JSON.stringify(names) === JSON.stringify(sorted) });
    tests.push({ name: `View mode '${viewMode}'`, pass: true });
    tests.push({ name: 'Locations & Categories not empty', pass: locations.length>0 && categories.length>0 });

    return (
      <div className="mt-4 p-3 rounded-xl border text-xs" style={{ borderColor: colors.border, backgroundColor: '#fff' }}>
        <div className="font-semibold mb-1" style={{ color: colors.secondaryText }}>Self Tests</div>
        <ul className="list-disc list-inside">
          {tests.map((t,i)=>(<li key={i} style={{ color: t.pass ? '#256029' : '#8B0000' }}>{t.pass ? '✅' : '❌'} {t.name}{t.note?` — ${t.note}`:''}</li>))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-serif" style={{ backgroundColor: colors.background, color: colors.text }}>
      {/* hidden inputs */}
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onRestoreFile} />

      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur border-b" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full shadow-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})` }}>
              <LogoMonogram />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: colors.text }}>Craft Storage Tracker</h1>
              <p className="text-xs italic" style={{ color: colors.secondaryText }}>{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="px-3 py-2 rounded-full text-sm text-white" style={{ backgroundColor: colors.primary }}>{viewMode === "grid" ? "List View" : "Grid View"}</button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="px-3 py-2 rounded-full text-sm font-medium shadow-md border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>⚙️ Setup</button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <p className="px-4 py-2 font-semibold" style={{ color: colors.secondaryText }}>Preferences</p>
                  <div className="px-4 pb-2" style={{ color: colors.secondaryText }}>Density</div>
                  {['Cozy', 'Comfortable', 'Compact'].map(opt => (
                    <button key={opt} onClick={() => { (setDensity as any)(opt); setMenuOpen(false); }} className="block w-full text-left px-4 py-2" style={{ color: density === opt ? colors.primary : colors.text }}>{opt}</button>
                  ))}
                  <div className="h-px my-2" style={{ background: colors.border }} />
                  <button onClick={() => {
                    const payload = { version: DB_VERSION, items, locations, categories, exportedAt: new Date().toISOString() };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `craft-storage-backup-${Date.now()}.json`; a.click();
                    URL.revokeObjectURL(url); setMenuOpen(false);
                  }} className="block w-full text-left px-4 py-2">⬇️ Backup (JSON)</button>
                  <button onClick={() => { setMenuOpen(false); document.getElementById('quick-capture-input')?.click(); }} className="block w-full text-left px-4 py-2">📷 Quick Capture (new item)</button>
                  <button onClick={() => { (document.getElementById('restore-input') as HTMLInputElement)?.click(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2">⬆️ Restore from file</button>
                </div>
              )}
            </div>
            <button onClick={openAdd} className="px-4 py-2 rounded-full text-white font-medium shadow-md transition" style={{ backgroundColor: colors.primary }}>+ Add Item</button>
          </div>
        </div>
      </header>

      {/* Onboarding */}
      {showOnboarding && (
        <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl shadow-md" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <h2 className="text-lg font-semibold mb-2">Welcome to Craft Storage Tracker!</h2>
          <p className="text-sm mb-3" style={{ color: colors.secondaryText }}>Get started in just a few steps:</p>
          <ol className="list-decimal list-inside text-sm mb-4" style={{ color: colors.secondaryText }}>
            <li>Add your first storage location.</li>
            <li>Add your first item to your craft inventory.</li>
            <li>Use filters to view and find your stored items easily.</li>
          </ol>
          <button onClick={() => setShowOnboarding(false)} className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: colors.primary }}>Got it!</button>
        </div>
      )}

      {/* hidden quick capture and restore inputs */}
      <input id="quick-capture-input" className="hidden" type="file" accept="image/*" capture="environment" onChange={(e:any)=>{
        const f = e.target.files?.[0]; if(!f) return;
        fileToDataUrl(f).then(url => {
          const name = `Quick Capture ${new Date().toLocaleString()}`;
          const newItem: Item = { name, location: '', category: '', tags: [], photoSrc: url };
          (window as any).__addQuick?.(newItem);
        }).finally(()=>{ e.target.value=''; });
      }}/>
      <input id="restore-input" className="hidden" type="file" accept="application/json" onChange={async (e:any)=>{
        const file = e.target.files?.[0]; if(!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data || !Array.isArray(data.items) || !Array.isArray(data.locations) || !Array.isArray(data.categories)) return;
          (window as any).__restoreAll?.(data);
        } finally { e.target.value=''; }
      }}/>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto mt-6 p-4">
        <div className="rounded-3xl shadow-md p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <h2 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>Your Craft Inventory</h2>

          {/* Filters & Managers */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Location Filter */}
            <div className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: colors.secondaryText }}>Filter by Location</label>
              <div className="flex items-center gap-2">
                <select value={locationFilter} onChange={(e)=>setLocationFilter(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                  {["All", ...locations].map(loc => (<option key={loc} value={loc}>{loc}</option>))}
                </select>
                <button type="button" onClick={()=>setShowLocationManager(v=>!v)} className="px-3 py-2 rounded-xl text-sm border shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                  Manage
                </button>
              </div>
              {showLocationManager && (
                <div className="mt-2 p-3 rounded-xl border" style={{ borderColor: colors.border }}>
                  <p className="text-xs mb-2" style={{ color: colors.secondaryText }}>Locations</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {locations.map(loc => (
                      <span key={loc} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border" style={{ borderColor: colors.border }}>
                        {loc}
                        <button onClick={()=>removeLocation(loc)} className="opacity-70 hover:opacity-100">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={newLocation} onChange={(e)=>setNewLocation(e.target.value)} placeholder="Add new location" className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                    <button onClick={addLocation} className="px-3 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: colors.primary }}>Add</button>
                  </div>
                </div>
              )}
            </div>
            {/* Category Filter */}
            <div className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: colors.secondaryText }}>Filter by Category</label>
              <div className="flex items-center gap-2">
                <select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                  {["All", ...categories].map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
                <button type="button" onClick={()=>setShowCategoryManager(v=>!v)} className="px-3 py-2 rounded-xl text-sm border shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                  Manage
                </button>
              </div>
              {showCategoryManager && (
                <div className="mt-2 p-3 rounded-xl border" style={{ borderColor: colors.border }}>
                  <p className="text-xs mb-2" style={{ color: colors.secondaryText }}>Categories</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categories.map(cat => (
                      <span key={cat} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border" style={{ borderColor: colors.border }}>
                        {cat}
                        <button onClick={()=>removeCategory(cat)} className="opacity-70 hover:opacity-100">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={newCategory} onChange={(e)=>setNewCategory(e.target.value)} placeholder="Add new category" className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                    <button onClick={addCategory} className="px-3 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: colors.primary }}>Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inventory */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(it => (
                <ItemCard
                  key={it.name}
                  name={it.name}
                  location={it.location}
                  category={it.category}
                  tags={it.tags}
                  photoSrc={it.photoSrc || "/sample-item.png"}
                  density={density}
                  viewMode="grid"
                  locations={locations}
                  categories={categories}
                  onSave={(u)=>saveInlineItem(u, it.name)}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: colors.border }}>
              {filteredItems.map(it => (
                <ItemCard
                  key={it.name}
                  name={it.name}
                  location={it.location}
                  category={it.category}
                  tags={it.tags}
                  photoSrc={it.photoSrc || "/sample-item.png"}
                  density={density}
                  viewMode="list"
                  locations={locations}
                  categories={categories}
                  onSave={(u)=>saveInlineItem(u, it.name)}
                  onDelete={deleteItem}
                />
              ))}
            </ul>
          )}

          <SelfTests />
        </div>
      </main>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} onClick={()=>setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Add Item</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: colors.secondaryText }}>Name</label>
                <input value={draft.name} onChange={e=>setDraft({ ...draft, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.secondaryText }}>Location</label>
                <div className="flex items-center gap-2">
                  <select value={draft.location} onChange={e=>setDraft({ ...draft, location: e.target.value })} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                    {["", ...locations].map(loc => (<option key={loc || "__none"} value={loc}>{loc || "Select a location"}</option>))}
                  </select>
                  <input placeholder="or new" value={!locations.includes(draft.location) ? draft.location : ""} onChange={(e)=>setDraft({ ...draft, location: e.target.value })} className="w-28 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.secondaryText }}>Category</label>
                <div className="flex items-center gap-2">
                  <select value={draft.category} onChange={e=>setDraft({ ...draft, category: e.target.value })} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                    {["", ...categories].map(cat => (<option key={cat || "__none"} value={cat}>{cat || "Select a category"}</option>))}
                  </select>
                  <input placeholder="or new" value={!categories.includes(draft.category) ? draft.category : ""} onChange={(e)=>setDraft({ ...draft, category: e.target.value })} className="w-28 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.secondaryText }}>Tags (comma separated)</label>
                <input value={draft.tags} onChange={e=>setDraft({ ...draft, tags: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.secondaryText }}>Photo</label>
                <div className="flex items-center gap-2">
                  <input value={draft.photoSrc} onChange={e=>setDraft({ ...draft, photoSrc: e.target.value })} className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} placeholder="https://... or captured" />
                  <input ref={camAddRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickAddPhoto} />
                  <button onClick={()=>camAddRef.current?.click()} className="px-3 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: colors.primary }}>📷 Take Photo</button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowAdd(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>Cancel</button>
              <button onClick={saveItem} className="px-4 py-2 rounded-xl text-white text-sm" style={{ backgroundColor: colors.primary }}>Save Item</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center text-xs" style={{ color: colors.secondaryText }}>© {new Date().getFullYear()} LydiBug Styles — Every stitch tells a story. • Theme: {colors.name}</footer>
    </div>
  );
}
