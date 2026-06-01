import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { QUADRANT_COLOR_PRESETS } from "@/types/settings";
import { cn } from "@/lib/utils";

interface QuadrantColorPickerProps {
  value: string;
  mode: "light" | "dark";
  onChange: (hex: string) => void;
}

const isValidHex = (v: string) => /^#?[0-9a-fA-F]{6}$/.test(v.trim());

export function QuadrantColorPicker({ value, mode, onChange }: QuadrantColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const presets = QUADRANT_COLOR_PRESETS[mode];

  const commit = (raw: string) => {
    const v = raw.trim();
    if (!isValidHex(v)) return;
    const final = v.startsWith("#") ? v : `#${v}`;
    onChange(final.toUpperCase());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setHex(value); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-8 h-8 rounded-md border border-border cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: value }}
          aria-label="Pick quadrant color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className={cn(
                "w-7 h-7 rounded-full border transition-transform hover:scale-110",
                value.toLowerCase() === c.toLowerCase()
                  ? "ring-2 ring-offset-2 ring-offset-popover ring-foreground"
                  : "border-border"
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <Input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(hex); }
          }}
          onBlur={() => isValidHex(hex) && commit(hex)}
          placeholder="#RRGGBB"
          className="h-8 text-xs font-mono"
          spellCheck={false}
        />
      </PopoverContent>
    </Popover>
  );
}