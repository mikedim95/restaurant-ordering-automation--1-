﻿import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type CustomOption = { title: string; price: string };
type CustomModifier = { title: string; required: boolean; options: CustomOption[] };

export const ManagerMenuPanel = () => {
  const { toast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '0.00', categoryId: '', newCategoryTitle: '', isAvailable: true });
  const [savingItem, setSavingItem] = useState(false);

  // Read-only modifiers for the currently editing item
  const [itemMods, setItemMods] = useState<any[]>([]);

  // Per-item custom modifiers builder
  const [customMods, setCustomMods] = useState<CustomModifier[]>([]);

  // Edit existing modifier modal
  const [modEditOpen, setModEditOpen] = useState(false);
  const [modEditSaving, setModEditSaving] = useState(false);
  const [modEdit, setModEdit] = useState<{ id: string; title: string; required: boolean; options: Array<{ id?: string; title: string; price: string }> }>({ id: '', title: '', required: false, options: [] });
  const [modEditOriginalIds, setModEditOriginalIds] = useState<string[]>([]);

  // UI helpers
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [showDisabled, setShowDisabled] = useState(false);

  const load = async () => {
    const its = (await api.listItems()) as any; setItems(its.items || []);
    const cats = (await api.listCategories()) as any; setCategories(cats.categories || []);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', price: '0.00', categoryId: categories[0]?.id || '', newCategoryTitle: '', isAvailable: true });
    setItemMods([]);
    setCustomMods([]);
    setModalOpen(true);
  };

  const openEdit = async (it: any) => {
    setEditing(it);
    setForm({ title: it.title, description: it.description || '', price: (it.priceCents/100).toFixed(2), categoryId: it.categoryId, newCategoryTitle: '', isAvailable: !!it.isAvailable });
    try {
      const m = (await api.getMenu()) as any;
      const found = (m.items || []).find((x:any)=>x.id===it.id);
      setItemMods(found?.modifiers || []);
    } catch {}
    setCustomMods([]);
    setModalOpen(true);
  };

  const grouped = categories.map((c:any)=>({
    cat: c,
    items: items
      .filter((it:any)=> it.categoryId === c.id || it.category === c.title)
      .filter((it:any)=> showDisabled ? true : it.isAvailable !== false),
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Manage Menu Items</h2>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4"/> Add</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showDisabled} onChange={(e)=>setShowDisabled(e.target.checked)} />
          Show disabled items
        </label>
      </div>

      <div className="space-y-8">
        {grouped.map(({cat, items}) => (
          <section key={cat.id}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-800">{cat.title}</h3>
              <div className="h-px bg-gray-200 flex-1"/>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-xs text-gray-500">No items in this category.</div>
              ) : items.map((it:any)=> (
                <div key={it.id} className={`flex items-center justify-between border rounded-lg p-3 ${it.isAvailable===false ? 'opacity-60' : ''}`}>
                  <div>
                    <div className="font-medium">{it.title} <span className="text-xs text-gray-500">â‚¬{(it.priceCents/100).toFixed(2)}</span></div>
                    <div className="text-xs text-gray-500">{it.description || 'â€”'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={async ()=>{ 
                      setLoadingIds(prev=> new Set(prev).add(`toggle:${it.id}`));
                      try { 
                        await api.updateItem(it.id, { isAvailable: !it.isAvailable }); 
                        await load(); 
                        toast({ title: it.isAvailable? 'Disabled' : 'Enabled', description: it.title }); 
                      } catch(e:any){ 
                        toast({ title: 'Update failed', description: e?.message || 'Could not update item' }); 
                      } finally {
                        setLoadingIds(prev=>{ const n = new Set(prev); n.delete(`toggle:${it.id}`); return n; });
                      }
                    }} disabled={loadingIds.has(`toggle:${it.id}`)}>
                      {loadingIds.has(`toggle:${it.id}`) && <span className="h-4 w-4 mr-1 border-2 border-current/60 border-t-transparent rounded-full animate-spin"/>}
                      {it.isAvailable ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={()=>openEdit(it)}><Pencil className="h-4 w-4"/> Edit</Button>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={async ()=>{
                      setLoadingIds(prev=> new Set(prev).add(`del:${it.id}`));
                      try {
                        await api.deleteItem(it.id);
                        await load();
                        toast({ title: 'Item deleted', description: it.title });
                      } catch(e:any) {
                        const msg = e?.message || 'Cannot delete item (it may be referenced by orders)';
                        const referential = msg.toLowerCase().includes('referenced') || e?.status === 400;
                        if (referential) {
                          const confirmArchive = window.confirm('This item has been ordered before and cannot be deleted. Do you want to disable (archive) it instead?');
                          if (confirmArchive) {
                            try { await api.updateItem(it.id, { isAvailable: false }); await load(); toast({ title: 'Item archived', description: it.title }); }
                            catch (err:any) { toast({ title: 'Archive failed', description: err?.message || 'Could not disable item' }); }
                          } else {
                            toast({ title: 'Delete failed', description: msg });
                          }
                        } else {
                          toast({ title: 'Delete failed', description: msg });
                        }
                      } finally {
                        setLoadingIds(prev=>{ const n = new Set(prev); n.delete(`del:${it.id}`); return n; });
                      }
                    }} disabled={loadingIds.has(`del:${it.id}`)}>
                      {loadingIds.has(`del:${it.id}`) && <span className="h-4 w-4 mr-1 border-2 border-white/60 border-t-transparent rounded-full animate-spin"/>}
                      <Trash2 className="h-4 w-4"/> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Add/Edit Item */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})}/>
            <Textarea placeholder="Description" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}/>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Price (â‚¬)" type="number" min={0} step={0.01} value={form.price} onChange={(e)=>setForm({...form, price: e.target.value})}/>
              <select className="border rounded p-2" value={form.categoryId || 'NEW'} onChange={(e)=>setForm({...form, categoryId: e.target.value==='NEW'?'':e.target.value})}>
                <option value="NEW">+ New categoryâ€¦</option>
                {categories.map((c:any)=>(<option key={c.id} value={c.id}>{c.title}</option>))}
              </select>
            </div>
            {!form.categoryId && (
              <Input placeholder="New category title" value={form.newCategoryTitle} onChange={(e)=>setForm({...form, newCategoryTitle: e.target.value})}/>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isAvailable} onChange={(e)=>setForm({...form, isAvailable: e.target.checked})}/>
              Available
            </label>

            {/* Read-only display of current item modifiers */}
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Modifiers</div>
              <div className="max-h-56 overflow-auto space-y-3 border rounded p-3">
                {itemMods.length === 0 && (
                  <div className="text-xs text-muted-foreground">No modifiers yet.</div>
                )}
                {itemMods.map((m:any)=> (
                  <div key={m.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{m.name}{m.required ? ' (required)' : ''}</div>
                      <ul className="ml-4 text-sm text-gray-600 list-disc">
                        {(m.options||[]).map((o:any)=> (
                          <li key={o.id}>{o.label}{(o.priceDelta ?? 0) > 0 ? ` +â‚¬${(o.priceDelta).toFixed(2)}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                    {editing && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setModEdit({
                            id: m.id,
                            title: m.name,
                            required: !!m.required,
                            options: (m.options||[]).map((o:any)=>({ id: o.id, title: o.label, price: ((o.priceDelta ?? 0)).toFixed(2) }))
                          });
                          setModEditOriginalIds((m.options||[]).map((o:any)=>o.id));
                          setModEditOpen(true);
                        }}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={async ()=>{
                          const yes = window.confirm('Unlink this modifier from the item? You can optionally delete it if unused.');
                          if (!yes) return;
                          try {
                            await api.unlinkItemModifier(editing.id, m.id);
                            // Try to delete modifier if not used elsewhere
                            try { await api.deleteModifier(m.id); } catch {}
                            // refresh
                            try {
                              const menu = (await api.getMenu()) as any;
                              const found = (menu.items||[]).find((x:any)=>x.id===editing.id);
                              setItemMods(found?.modifiers || []);
                            } catch {}
                            toast({ title:'Modifier unlinked', description: m.name });
                          } catch(e:any) {
                            toast({ title:'Failed', description: e?.message || 'Could not unlink modifier' });
                          }
                        }}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Custom modifiers builder */}
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Custom modifiers for this item</div>
              <div className="space-y-4">
                {customMods.map((cm, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Input placeholder="Modifier title (e.g., Milk, Size)" value={cm.title} onChange={(e)=>{
                        const v=e.target.value; setCustomMods(mods=>mods.map((m,i)=> i===idx? { ...m, title: v}: m));
                      }}/>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={cm.required} onChange={(e)=>{
                          const v=e.target.checked; setCustomMods(mods=>mods.map((m,i)=> i===idx? { ...m, required: v}: m));
                        }}/>
                        required
                      </label>
                    </div>
                    <div className="space-y-2">
                      {cm.options.map((opt, oi) => (
                        <div key={oi} className="grid grid-cols-2 gap-2">
                          <Input placeholder="Option label (e.g., Oat)" value={opt.title} onChange={(e)=>{
                            const v=e.target.value; setCustomMods(mods=>mods.map((m,i)=> i===idx? { ...m, options: m.options.map((o,j)=> j===oi? { ...o, title: v}: o)}: m));
                          }}/>
                          <Input placeholder="Price +€ (e.g., 0.50)" type="number" min={0} step={0.01} value={opt.price} onChange={(e)=>{
                            const v=e.target.value; setCustomMods(mods=>mods.map((m,i)=> i===idx? { ...m, options: m.options.map((o,j)=> j===oi? { ...o, price: v}: o)}: m));
                          }}/>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={()=> setCustomMods(mods=>mods.map((m,i)=> i===idx? { ...m, options: [...m.options, { title:'', price:''}] }: m))}>+ Option</Button>
                      <Button size="sm" variant="outline" onClick={()=> setCustomMods(mods=>mods.filter((_,i)=> i!==idx))}>Remove modifier</Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" className="mt-2" variant="outline" onClick={()=> setCustomMods(mods=>[...mods, { title:'', required:false, options:[{ title:'', price:''}] }])}>+ Add custom modifier</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setModalOpen(false)}>Cancel</Button>
            <Button onClick={async ()=>{
              setSavingItem(true);
              if (!form.title) return;
              let categoryId = form.categoryId;
              if (!categoryId) {
                if (!form.newCategoryTitle) return;
                const created = (await api.createCategory(form.newCategoryTitle)) as any;
                categoryId = created.category.id;
                const cats = (await api.listCategories()) as any; setCategories(cats.categories||[]);
              }
              const payload = { title: form.title, description: form.description, priceCents: Math.round(parseFloat(form.price||'0')*100), categoryId, isAvailable: form.isAvailable };
              let itemId = editing?.id as string | undefined;
              if (editing) { await api.updateItem(editing.id, payload); itemId = editing.id; }
              else { const created = (await api.createItem(payload)) as any; itemId = created.item?.id; }
              if (itemId) {
                // Create custom modifiers and options then link
                for (const cm of customMods) {
                  if (!cm.title.trim()) continue;
                  const created = (await api.createModifier({ title: cm.title, minSelect: cm.required ? 1 : 0, maxSelect: null })) as any;
                  const mid = created.modifier.id;
                  let idx = 0;
                  for (const opt of cm.options) {
                    if (!opt.title.trim()) continue;
                    const priceCents = Math.round(parseFloat(opt.price || '0')*100) || 0;
                    await api.createModifierOption({ modifierId: mid, title: opt.title, priceDeltaCents: priceCents, sortOrder: idx++ });
                  }
                  await api.linkItemModifier(itemId, mid, cm.required);
                }
              }
              await load();
              setModalOpen(false);
              setSavingItem(false);
            }} disabled={savingItem} className="inline-flex items-center gap-2">
              {savingItem && <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"/>}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit existing modifier for this item */}
      <Dialog open={modEditOpen} onOpenChange={setModEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Modifier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Modifier title" value={modEdit.title} onChange={(e)=>setModEdit({...modEdit, title: e.target.value})} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={modEdit.required} onChange={(e)=>setModEdit({...modEdit, required: e.target.checked})}/>
                required
              </label>
            </div>
            <div className="space-y-2">
              {modEdit.options.map((opt, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <Input className="col-span-2" placeholder="Option label" value={opt.title} onChange={(e)=>{
                    const v=e.target.value; setModEdit(me=>({ ...me, options: me.options.map((o,i)=> i===idx? { ...o, title: v }: o) }));
                  }}/>
                  <Input placeholder="Price +â‚¬" type="number" min={0} step={0.01} value={opt.price} onChange={(e)=>{
                    const v=e.target.value; setModEdit(me=>({ ...me, options: me.options.map((o,i)=> i===idx? { ...o, price: v }: o) }));
                  }}/>
                  <div className="flex gap-1 justify-end">
                    <Button variant="outline" size="sm" onClick={()=> setModEdit(me=>{
                      if (idx<=0) return me; const arr=[...me.options]; const t=arr[idx-1]; arr[idx-1]=arr[idx]; arr[idx]=t; return {...me, options: arr};
                    })}><ArrowUp className="h-4 w-4"/></Button>
                    <Button variant="outline" size="sm" onClick={()=> setModEdit(me=>{
                      if (idx>=me.options.length-1) return me; const arr=[...me.options]; const t=arr[idx+1]; arr[idx+1]=arr[idx]; arr[idx]=t; return {...me, options: arr};
                    })}><ArrowDown className="h-4 w-4"/></Button>
                    <Button variant="outline" size="sm" onClick={()=> setModEdit(me=>({ ...me, options: me.options.filter((_,i)=> i!==idx) }))}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={()=> setModEdit(me=>({ ...me, options: [...me.options, { title:'', price:'' }] }))}>+ Option</Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setModEditOpen(false)}>Cancel</Button>
            <Button disabled={modEditSaving} className="inline-flex items-center gap-2" onClick={async ()=>{
              if (!editing) return;
              setModEditSaving(true);
              try {
                await api.updateModifier(modEdit.id, { title: modEdit.title, minSelect: modEdit.required ? 1 : 0, maxSelect: null });
                await api.linkItemModifier(editing.id, modEdit.id, modEdit.required);
                // Options: update/create
                const keep = new Set<string>();
                for (let i=0;i<modEdit.options.length;i++) {
                  const o = modEdit.options[i];
                  const priceCents = Math.round(parseFloat(o.price||'0')*100) || 0;
                  if (o.id) {
                    keep.add(o.id);
                    await api.updateModifierOption(o.id, { title: o.title, priceDeltaCents: priceCents, sortOrder: i });
                  } else {
                    const created = await api.createModifierOption({ modifierId: modEdit.id, title: o.title, priceDeltaCents: priceCents, sortOrder: i });
                    keep.add((created as any).option.id);
                  }
                }
                // Delete removed options
                for (const oid of modEditOriginalIds) {
                  if (!keep.has(oid)) await api.deleteModifierOption(oid);
                }
                // Refresh item modifiers view
                try {
                  const m = (await api.getMenu()) as any;
                  const found = (m.items || []).find((x:any)=>x.id===editing.id);
                  setItemMods(found?.modifiers || []);
                } catch {}
                setModEditOpen(false);
              } finally {
                setModEditSaving(false);
              }
            }}>
              {modEditSaving && <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"/>}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
