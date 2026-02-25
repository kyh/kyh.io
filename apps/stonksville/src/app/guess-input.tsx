"use client";

import { useCallback, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon } from "lucide-react";

import type { CompanyPickerItem } from "@/lib/companies-query";

type GuessInputProps = {
  companies: CompanyPickerItem[];
  onSelect: (companyId: string) => void;
  disabled?: boolean;
};

export const GuessInput = ({ companies, onSelect, disabled }: GuessInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<CompanyPickerItem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filter = useCallback(
    (item: CompanyPickerItem, query: string) => {
      const lower = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(lower) ||
        (item.ticker?.toLowerCase().includes(lower) ?? false)
      );
    },
    [],
  );

  return (
    <Combobox.Root
      items={companies}
      filter={filter}
      limit={20}
      value={value}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(newValue) => {
        if (newValue) {
          onSelect(newValue.id);
          setValue(null);
          setInputValue("");
        }
      }}
      itemToStringLabel={(c) => c.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      autoHighlight
    >
      <div
        ref={wrapperRef}
        className="bg-popover text-popover-foreground flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg border px-3"
      >
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <Combobox.Input
          placeholder="Search company..."
          className="placeholder:text-muted-foreground flex h-10 w-full bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          side="top"
          sideOffset={4}
          anchor={wrapperRef}
          className="z-50 w-[var(--anchor-width)]"
        >
          <Combobox.Popup className="bg-popover text-popover-foreground max-h-48 overflow-y-auto rounded-lg border p-1 shadow-md empty:hidden">
            <Combobox.List>
              {(company: CompanyPickerItem) => (
                <Combobox.Item
                  key={company.id}
                  value={company}
                  className="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground grid cursor-default grid-cols-[3.5rem_1fr_auto] items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  {company.ticker ? (
                    <span className="bg-secondary text-secondary-foreground inline-flex shrink-0 items-center justify-center rounded-md border border-transparent px-1 py-0.5 font-mono text-xs font-medium">
                      {company.ticker}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="truncate">{company.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {company.sector}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
