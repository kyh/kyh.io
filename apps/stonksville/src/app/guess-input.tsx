"use client";

import { useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";

import { cn } from "@/components/utils";

import type { CompanyPickerItem } from "@/lib/companies-query";

type GuessInputProps = {
  companies: CompanyPickerItem[];
  onSelect: (companyId: string) => void;
  disabled?: boolean;
};

export function GuessInput({ companies, onSelect, disabled }: GuessInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  function handleSelect(id: string) {
    onSelect(id);
    setSearch("");
    setOpen(false);
  }

  const lowerSearch = search.toLowerCase();

  return (
    <div className="relative">
      <CommandPrimitive
        shouldFilter
        className="bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-lg border"
        loop
      >
        <div className="flex h-9 items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 opacity-50" />
          <CommandPrimitive.Input
            placeholder="Search company..."
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              setOpen(v.length > 0);
            }}
            onFocus={() => {
              if (search.length > 0) setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setOpen(false), 150);
            }}
            disabled={disabled}
            className={cn(
              "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
        {open && (
          <CommandPrimitive.List className="max-h-48 scroll-py-1 overflow-x-hidden overflow-y-auto">
            <CommandPrimitive.Empty className="py-6 text-center text-sm">
              No company found.
            </CommandPrimitive.Empty>
            <CommandPrimitive.Group className="text-foreground overflow-hidden p-1">
              {companies
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(lowerSearch) ||
                    (c.ticker?.toLowerCase().includes(lowerSearch) ?? false),
                )
                .slice(0, 20)
                .map((c) => (
                  <CommandPrimitive.Item
                    key={c.id}
                    value={`${c.ticker ?? ""} ${c.name}`}
                    onSelect={() => handleSelect(c.id)}
                    className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                  >
                    {c.ticker && (
                      <span className="bg-secondary text-secondary-foreground inline-flex shrink-0 items-center rounded-md border border-transparent px-2 py-0.5 font-mono text-xs font-medium">
                        {c.ticker}
                      </span>
                    )}
                    <span className="truncate">{c.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {c.sector}
                    </span>
                  </CommandPrimitive.Item>
                ))}
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
        )}
      </CommandPrimitive>
    </div>
  );
}
