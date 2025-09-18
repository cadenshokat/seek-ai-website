// src/sections/Tags.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit3, Trash2, RefreshCcw, Search, Palette } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const PALETTE: { label: string; value: string }[] = [
  { label: "Green",  value: "#10b981" },
  { label: "Blue",   value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink",   value: "#ec4899" },
  { label: "Red",    value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal",   value: "#14b8a6" },
  { label: "Gray",   value: "#6b7280" },
];

const HEX_REGEX = /^#([0-9a-fA-F]{6})$/;

function isHexColor(v: string) {
  return HEX_REGEX.test(v);
}

/** Data hook: centralizes all CRUD + fetch logic */
function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Default sort by updated_at desc so recent edits bubble up
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("updated_at", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      setTags(data ?? []);
    } catch (e: any) {
      console.error("Failed to fetch tags:", e);
      setError(e?.message ?? "Failed to fetch tags");
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTag = useCallback(async (input: { name: string; color: string }) => {
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: input.name.trim(), color: input.color })
      .select()
      .single();
    if (error) throw error;
    setTags(prev => [data!, ...prev]);
    return data!;
  }, []);

  const updateTag = useCallback(async (id: string, input: { name: string; color: string }) => {
    const { data, error } = await supabase
      .from("tags")
      .update({ name: input.name.trim(), color: input.color })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setTags(prev => prev.map(t => (t.id === id ? data! : t)));
    return data!;
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const prev = tags;
    // optimistic
    setTags(prev.filter(t => t.id !== id));
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      // rollback
      setTags(prev);
      throw error;
    }
  }, [tags]);

  return { tags, loading, error, refresh, createTag, updateTag, deleteTag };
}

/** Small pill for previewing a tag */
function TagPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium border shadow-sm"
      style={{ backgroundColor: `${color}22`, borderColor: `${color}33`, color }}
      title={name}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

type SortKey = "updated_desc" | "name_asc" | "name_desc";

export function Tags() {
  const { toast } = useToast();
  const { tags, loading, error, refresh, createTag, updateTag, deleteTag } = useTags();

  // UI state
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");

  // Create form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("#10b981");
  const [customHex, setCustomHex] = useState<string>("#10b981");
  const [useCustom, setUseCustom] = useState<boolean>(false);

  // Edit dialog
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? tags.filter(t => t.name.toLowerCase().includes(q))
      : tags.slice();

    switch (sort) {
      case "name_asc":
        return base.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return base.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return base.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  }, [tags, query, sort]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const color = useCustom ? customHex : newColor;

    if (!name) {
      toast({ title: "Missing name", description: "Tag name is required.", variant: "destructive" });
      return;
    }
    if (!isHexColor(color)) {
      toast({ title: "Invalid color", description: "Please use a 6-digit hex like #10b981.", variant: "destructive" });
      return;
    }

    try {
      await createTag({ name, color });
      setNewName("");
      if (!useCustom) setNewColor("#10b981");
      toast({ title: "Created", description: `Tag “${name}” added.` });
    } catch (e: any) {
      if (e?.code === "23505") {
        toast({ title: "Duplicate tag", description: "A tag with this name already exists.", variant: "destructive" });
      } else {
        toast({ title: "Failed to create", description: e?.message ?? "Unknown error.", variant: "destructive" });
      }
    }
  };

  const handleUpdate = async (id: string, name: string, color: string) => {
    if (!name.trim()) {
      toast({ title: "Missing name", description: "Tag name is required.", variant: "destructive" });
      return;
    }
    if (!isHexColor(color)) {
      toast({ title: "Invalid color", description: "Please use a valid hex color.", variant: "destructive" });
      return;
    }
    try {
      await updateTag(id, { name, color });
      setEditing(null);
      toast({ title: "Saved", description: "Tag updated." });
    } catch (e: any) {
      if (e?.code === "23505") {
        toast({ title: "Duplicate tag", description: "A tag with this name already exists.", variant: "destructive" });
      } else {
        toast({ title: "Failed to update", description: e?.message ?? "Unknown error.", variant: "destructive" });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag(deleteTarget.id);
      toast({ title: "Deleted", description: `Tag “${deleteTarget.name}” removed.` });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e?.message ?? "Unknown error.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <section className="space-y-6">
      {/* Create */}
      <div className="p-6 rounded-2xl shadow-sm">
        <div className="md:col-span-3 flex justify-between">
            <h3 className="text-sm font-medium mb-4">Create Tag</h3>
            <Button type="submit" className="inline-flex items-center gap-2" onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              Add Tag
            </Button>
          </div>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              placeholder="e.g., Reviews, UGC, Competitor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <Select
                value={useCustom ? "custom" : newColor}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setUseCustom(true);
                  } else {
                    setUseCustom(false);
                    setNewColor(v);
                    setCustomHex(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a color" />
                </SelectTrigger>
                <SelectContent>
                  {PALETTE.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="text"
                value={customHex}
                disabled={!useCustom}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#10b981"
                className="w-28"
              />
              <span
                className="h-8 w-8 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: (useCustom ? customHex : newColor) }}
                aria-label="color preview"
              />
            </div>
            {useCustom && !isHexColor(customHex) && (
              <p className="text-[11px] text-rose-600">Use a valid 6-digit hex like #10b981</p>
            )}
          </div>

          
        </form>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tags…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Sort</Label>
          <Select value={sort} onValueChange={(v: SortKey) => setSort(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Recent updates</SelectItem>
              <SelectItem value="name_asc">Name (A→Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z→A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 rounded-2xl">
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/70 backdrop-blur border-b">
              <tr>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Tag</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Hex</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Created</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Updated</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-3">
                      <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-6 px-3 text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-muted-foreground">
                    No tags found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <TagPill name={t.name} color={t.color} />
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span
                          className="h-3 w-3 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.color}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-xs text-gray-700">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-xs text-gray-700">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Tag</DialogTitle>
                            </DialogHeader>
                            <EditTagForm
                              initial={t}
                              onCancel={() => {}}
                              onSave={(vals) => handleUpdate(t.id, vals.name, vals.color)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove “{deleteTarget?.name}”. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function EditTagForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Tag;
  onSave: (vals: { name: string; color: string }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [mode, setMode] = useState<"preset" | "custom">(PALETTE.some(p => p.value === initial.color) ? "preset" : "custom");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(c => {
              const active = mode === "preset" && color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`h-7 w-7 rounded-full ring-1 ring-black/10 transition ${active ? "outline outline-2 outline-offset-2" : ""}`}
                  style={{ backgroundColor: c.value, outlineColor: c.value }}
                  onClick={() => {
                    setMode("preset");
                    setColor(c.value);
                  }}
                  title={c.label}
                />
              );
            })}
          </div>

          {/* Custom hex */}
          <div className="flex items-center gap-2 ml-auto">
            <Input
              placeholder="#10b981"
              value={mode === "custom" ? color : "#"}
              onChange={(e) => {
                setMode("custom");
                setColor(e.target.value);
              }}
              className="w-28"
            />
            <span className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ backgroundColor: isHexColor(color) ? color : "#ffffff" }} />
          </div>
        </div>
        {mode === "custom" && !isHexColor(color) && (
          <p className="text-[11px] text-rose-600">Enter a valid 6-digit hex color.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          onClick={() => onSave({ name, color })}
          disabled={!name.trim() || !isHexColor(color)}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
