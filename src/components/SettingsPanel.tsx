import { useState } from "react";
import { X, RotateCcw, Palette, Type, Eye, Clock, Tag, Users, LogOut, Trash2, User, Sliders } from "lucide-react";
import { AppSettings, DEFAULT_SETTINGS, DEFAULT_QUADRANT_ACCENTS, UserAccount } from "@/types/settings";
import { QUADRANTS, Quadrant } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { QuadrantColorPicker } from "@/components/QuadrantColorPicker";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onUpdateQuadrantAccent: (quadrant: 1 | 2 | 3 | 4, accent: string, mode?: "light" | "dark") => void;
  onUpdateQuadrantLabel: (quadrant: Quadrant, label: Partial<{ title: string; subtitle: string }>) => void;
  onAddCategoryColor: (name: string, color: string) => void;
  onRemoveCategoryColor: (name: string) => void;
  onResetToDefaults: () => void;
  onClose: () => void;
  // Auth props
  currentUser: UserAccount | null;
  users: UserAccount[];
  isAdmin: boolean;
  onLogout: () => void;
  onDeleteUser: (id: string) => void;
  allCategories?: string[];
  onUpdateDisplayName?: (name: string) => Promise<{ success: boolean; error?: string }>;
}

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onUpdateQuadrantAccent,
  onUpdateQuadrantLabel,
  onAddCategoryColor,
  onRemoveCategoryColor,
  onResetToDefaults,
  onClose,
  currentUser,
  users,
  isAdmin,
  onLogout,
  onDeleteUser,
  allCategories = [],
  onUpdateDisplayName,
}: SettingsPanelProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#7a8599");
  const [usernameDraft, setUsernameDraft] = useState(currentUser?.username || "");
  const [savingName, setSavingName] = useState(false);
  const initialMode: "light" | "dark" =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  const [colorMode, setColorMode] = useState<"light" | "dark">(initialMode);

  const accents =
    settings.quadrantAccents?.[colorMode] ?? DEFAULT_QUADRANT_ACCENTS[colorMode];

  // Merge categories derived from tasks with stored color entries so user-created
  // categories appear in settings even when they have no explicit color yet.
  const mergedCategories = (() => {
    const map = new Map<string, string>();
    settings.categoryColors.forEach((c) => map.set(c.name, c.color));
    allCategories.forEach((name) => { if (!map.has(name)) map.set(name, "#7a8599"); });
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  })();

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l shadow-medium z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-foreground">Settings</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Username (local) */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4" /> Display name
          </h3>
          <div className="flex gap-2">
            <Input
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              className="rounded-lg"
            />
            <Button
              size="sm"
              disabled={savingName || !usernameDraft.trim() || usernameDraft.trim() === currentUser?.username}
              onClick={async () => {
                if (!onUpdateDisplayName) return;
                setSavingName(true);
                await onUpdateDisplayName(usernameDraft);
                setSavingName(false);
              }}
              className="rounded-lg"
            >
              Save
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Synced across your devices.</p>
        </section>

        {/* Quadrant tint intensity */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4" /> Quadrant tint intensity
          </h3>
          <Slider
            value={[settings.quadrantTintIntensity]}
            min={0}
            max={30}
            step={1}
            onValueChange={([v]) => onUpdateSettings({ quadrantTintIntensity: v })}
          />
          <p className="text-[11px] text-muted-foreground">
            {settings.quadrantTintIntensity}% — 0% pure card, 30% strongest tint.
          </p>
        </section>

        {/* Task detail view */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4" /> Task detail view
          </h3>
          <div className="flex gap-2">
            {(["popup", "sidebar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onUpdateSettings({ taskDetailView: v })}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                  settings.taskDetailView === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {v === "popup" ? "Popup" : "Sidebar"}
              </button>
            ))}
          </div>
        </section>

        {/* Quadrant labels & colors */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4" /> Quadrant labels & colors
          </h3>
          <div className="inline-flex p-0.5 rounded-lg bg-secondary text-xs font-medium">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setColorMode(m)}
                className={cn(
                  "px-3 py-1 rounded-md transition-all",
                  colorMode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "light" ? "Light mode" : "Dark mode"}
              </button>
            ))}
          </div>
          {QUADRANTS.map(q => {
            const accent = accents[q.color];
            const label = settings.quadrantLabels[q.id];
            return (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Input
                    value={label.title}
                    onChange={e => onUpdateQuadrantLabel(q.id, { title: e.target.value })}
                    placeholder="Title"
                    className="h-8 text-xs font-semibold rounded-lg"
                  />
                  <Input
                    value={label.subtitle}
                    onChange={e => onUpdateQuadrantLabel(q.id, { subtitle: e.target.value })}
                    placeholder="Description"
                    className="h-8 text-[11px] rounded-lg"
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                  <span className="text-[9px] text-muted-foreground">Color</span>
                  <QuadrantColorPicker
                    value={accent}
                    mode={colorMode}
                    onChange={(hex) => onUpdateQuadrantAccent(q.color, hex, colorMode)}
                  />
                </div>
              </div>
            );
          })}
        </section>

        {/* Font Size */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Type className="w-4 h-4" /> Font Size
          </h3>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as const).map(size => (
              <button
                key={size}
                onClick={() => onUpdateSettings({ fontSize: size })}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  settings.fontSize === size
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Default View */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4" /> Default View
          </h3>
          <div className="flex gap-2">
            {(["matrix", "list"] as const).map(view => (
              <button
                key={view}
                onClick={() => onUpdateSettings({ defaultView: view })}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  settings.defaultView === view
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Deadline Threshold */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Deadline Warning Threshold
          </h3>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={30}
              value={settings.deadlineThresholdDays}
              onChange={e => onUpdateSettings({ deadlineThresholdDays: parseInt(e.target.value) || 0 })}
              className="w-24 rounded-xl"
            />
            <span className="text-sm text-muted-foreground">days before due date</span>
          </div>
        </section>

        {/* Category Colors */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" /> Category Colors
            </h3>
            <button
              onClick={() => onUpdateSettings({ colorCodingEnabled: !settings.colorCodingEnabled })}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-all",
                settings.colorCodingEnabled
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {settings.colorCodingEnabled ? "On" : "Off"}
            </button>
          </div>
          {mergedCategories.map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <input
                type="color"
                value={cat.color}
                onChange={e => onAddCategoryColor(cat.name, e.target.value)}
                className="w-8 h-8 rounded-lg border cursor-pointer"
              />
              <span className="text-sm text-foreground flex-1">{cat.name}</span>
              {cat.name !== "General" && (
                <button
                  onClick={() => onRemoveCategoryColor(cat.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {/* Add new category */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded-lg border cursor-pointer"
            />
            <Input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="New category name"
              className="flex-1 h-8 text-sm rounded-lg"
            />
            <Button
              size="sm"
              onClick={() => {
                if (newCatName.trim()) {
                  onAddCategoryColor(newCatName.trim(), newCatColor);
                  setNewCatName("");
                }
              }}
              className="h-8 rounded-lg text-xs"
              disabled={!newCatName.trim()}
            >
              Add
            </Button>
          </div>
        </section>

        {/* User Management (Admin) */}
        {isAdmin && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Users
            </h3>
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/50">
                <span className="text-sm text-foreground flex-1">{user.username}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {user.role}
                </span>
                {user.id !== currentUser?.id && (
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Account */}
        <section className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{settings.localUsername || currentUser?.username}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="rounded-xl gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* Reset */}
        <Button
          variant="outline"
          onClick={onResetToDefaults}
          className="w-full rounded-xl gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
