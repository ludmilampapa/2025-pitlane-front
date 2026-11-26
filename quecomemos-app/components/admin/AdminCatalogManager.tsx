'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/config/api';

interface CatalogRow {
  id: number;
  name: string;
}

interface AdminCatalogManagerProps {
  title: string;
  description: string;
  endpoint: string;
  idField: 'PreferenceID' | 'DietaryRestrictionID';
  placeholder: string;
  protectedIds?: number[];
}

/**
 * Reusable admin CRUD card for global catalogs (Preferences & Dietary Restrictions).
 * Protected on the backend by authenticateJWT + requireAdmin.
 */
export function AdminCatalogManager({
  title,
  description,
  endpoint,
  idField,
  placeholder,
  protectedIds = [],
}: AdminCatalogManagerProps) {
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Could not load ${title.toLowerCase()}`);
      const raw = (await res.json()) as Array<Record<string, unknown>>;
      const mapped = (Array.isArray(raw) ? raw : [])
        .map((row) => ({ id: Number(row[idField]), name: String(row.name || '') }))
        .filter((row) => Number.isFinite(row.id) && row.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setItems(mapped);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [endpoint, idField, title]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not create item');
      }
      setNewName('');
      toast.success(`Added "${trimmed}"`);
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create item');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (item: CatalogRow) => {
    if (deletingId !== null || protectedIds.includes(item.id)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not delete item');
      }
      toast.success(`Removed "${item.name}"`);
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          maxLength={60}
          disabled={adding}
          className="h-9 rounded-xl bg-background text-sm text-foreground"
        />
        <Button
          type="submit"
          size="sm"
          disabled={adding || !newName.trim()}
          className="h-9 shrink-0 rounded-xl bg-primary px-3.5 text-primary-foreground hover:bg-primary/90"
        >
          {adding ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
          {adding ? 'Adding...' : 'Add'}
        </Button>
      </form>

      <div className="mt-3.5">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Loading {title.toLowerCase()}...
          </div>
        ) : items.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">No items configured yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const isProtected = protectedIds.includes(item.id);
              const isDeleting = deletingId === item.id;
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                >
                  {item.name}
                  {!isProtected && (
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => void handleDelete(item)}
                      aria-label={`Delete ${item.name}`}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
