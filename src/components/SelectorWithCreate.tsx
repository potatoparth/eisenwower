import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect, SearchableSelectOption } from "@/components/SearchableSelect";
import { cn } from "@/lib/utils";

interface SelectorWithCreateProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Return the value to select (e.g. category name or project id). */
  onCreate?: (name: string) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  createPlaceholder?: string;
  compact?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function SelectorWithCreate({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  createPlaceholder = "New name…",
  compact = false,
  className,
  icon,
}: SelectorWithCreateProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const submitCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || !onCreate) return;
    const selected = onCreate(trimmed);
    if (selected) onChange(selected);
    setNewName("");
    setAdding(false);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <SearchableSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          compact={compact}
          className="flex-1 min-w-0"
        />
        {onCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Add new"
            onClick={() => setAdding((v) => !v)}
            className={cn(
              "shrink-0 border-0 bg-secondary/50 hover:bg-secondary/70",
              compact ? "h-8 w-8 p-0 rounded-lg" : "h-9 w-9 p-0 rounded-lg"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {adding && onCreate && (
        <div className={cn("flex items-center gap-1.5", icon && "pl-5")}>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCreate();
              } else if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
              }
            }}
            placeholder={createPlaceholder}
            autoFocus
            className={cn(
              "flex-1 border-0 bg-secondary/50 rounded-lg",
              compact ? "h-8 text-xs" : "h-8 text-sm"
            )}
          />
          <Button
            type="button"
            size="sm"
            onClick={submitCreate}
            disabled={!newName.trim()}
            className="rounded-lg h-8 text-xs shrink-0"
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdding(false);
              setNewName("");
            }}
            className="rounded-lg h-8 text-xs shrink-0"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
