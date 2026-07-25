'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  table: string;
  placeholder?: string;
  className?: string;
}

export function CreatableSelect({
  value,
  onChange,
  table,
  placeholder = 'Select or type to create...',
  className,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase()
      .from(table)
      .select('name')
      .order('name');
    if (error) {
      toast.error('Failed to load departments: ' + error.message);
    }
    if (data) setOptions(data.map((r: { name: string }) => r.name));
    setLoading(false);
  }, [table]);

  useEffect(() => {
    if (open) {
      fetchOptions();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open, fetchOptions]);

  const trimmed = search.trim();
  const filtered = trimmed
    ? options.filter((o) => o.toLowerCase().includes(trimmed.toLowerCase()))
    : options;
  const showCreate =
    trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  async function handleCreate() {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const { data, error } = await getSupabase()
        .from(table)
        .insert({ name: trimmed })
        .select('name')
        .single();
      if (error) {
        toast.error('Could not create department: ' + error.message);
        return;
      }
      const name = data?.name ?? trimmed;
      setOptions((prev) => [...prev, name].sort());
      onChange(name);
      setSearch('');
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(val: string) {
    onChange(val === value ? '' : val);
    setSearch('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-10 w-full justify-between rounded-lg border-[#0000004c] font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {!loading && filtered.length === 0 && !showCreate && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No departments found.
              </div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                className={cn(
                  'flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer',
                  value === opt && 'bg-accent text-accent-foreground',
                )}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === opt ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {opt}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                disabled={creating}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer text-[#032364] font-medium disabled:opacity-50"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreate();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 'Creating...' : <>Create &ldquo;{trimmed}&rdquo;</>}
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
