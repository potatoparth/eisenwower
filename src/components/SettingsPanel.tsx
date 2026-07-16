import { useRef, useState } from "react";
import { ChevronDown, RotateCcw, Palette, Eye, Clock, Tag, Users, LogOut, Trash2, User, Sliders, LayoutGrid, Upload, X, Sparkles } from "lucide-react";
import { AppSettings, DEFAULT_QUADRANT_ACCENTS, UserAccount } from "@/types/settings";
import { UserBadge } from "@/components/UserBadge";
import { toast } from "@/hooks/use-toast";
import { QUADRANTS, Quadrant } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  onUpdateBadgeAppearance?: (patch: {
    badgeColor?: string | null;
    badgeGradient?: { from: string; to: string; angle?: number } | null;
  }) => Promise<{ success: boolean; error?: string }>;
  onUploadAvatar?: (file: File) => Promise<{ success: boolean; error?: string }>;
  onRemoveAvatar?: () => Promise<{ success: boolean; error?: string }>;
}

const GLOBAL_COLOR_PRESETS = [
  "#6D28D9", "#7C3AED", "#2563EB", "#0891B2", "#059669",
  "#16A34A", "#CA8A04", "#EA580C", "#DC2626", "#DB2777",
  "#9333EA", "#0F172A",
];

const BADGE_COLOR_PRESETS = [
  "#6D28D9", "#2563EB", "#059669", "#CA8A04", "#DC2626",
  "#DB2777", "#0891B2", "#EA580C", "#16A34A", "#0F172A",
];

const BADGE_GRADIENT_PRESETS: { from: string; to: string; angle?: number }[] = [
  { from: "#6D28D9", to: "#EC4899" },
  { from: "#2563EB", to: "#22D3EE" },
  { from: "#F97316", to: "#EF4444" },
  { from: "#10B981", to: "#3B82F6" },
  { from: "#F59E0B", to: "#DB2777" },
  { from: "#0F172A", to: "#6366F1" },
  { from: "#14B8A6", to: "#8B5CF6" },
  { from: "#F43F5E", to: "#8B5CF6" },
];

const VIEW_LIST: { id: keyof NonNullable<AppSettings["enabledViews"]>; label: string }[] = [
  { id: "matrix", label: "Matrix" },
  { id: "list", label: "List" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendar" },
  { id: "projects", label: "Projects" },
  { id: "notes", label: "Notes" },
];

function Section({
  icon: Icon, title, defaultOpen = false, children,
}: { icon: React.ElementType; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-xl bg-secondary/30">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4" /> {title}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
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
  onUpdateBadgeAppearance,
  onUploadAvatar,
  onRemoveAvatar,
}: SettingsPanelProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#7a8599");
  const [usernameDraft, setUsernameDraft] = useState(currentUser?.username || "");
  const [savingName, setSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [badgeMode, setBadgeMode] = useState<"color" | "gradient">(
    currentUser?.badgeGradient ? "gradient" : "color"
  );
  const [gradFrom, setGradFrom] = useState(currentUser?.badgeGradient?.from || "#6D28D9");
  const [gradTo, setGradTo] = useState(currentUser?.badgeGradient?.to || "#EC4899");
  const initialMode: "light" | "dark" =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  const [colorMode, setColorMode] = useState<"light" | "dark">(initialMode);

  const accents =
    settings.quadrantAccents?.[colorMode] ?? DEFAULT_QUADRANT_ACCENTS[colorMode];

  const mergedCategories = (() => {
    const map = new Map<string, string>();
    settings.categoryColors.forEach((c) => map.set(c.name, c.color));
    allCategories.forEach((name) => { if (!map.has(name)) map.set(name, "#7a8599"); });
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  })();

  const enabledViews = settings.enabledViews ?? { matrix: true, list: true, kanban: true, projects: true, calendar: true, notes: true };
  const primaryColor = settings.primaryColor ?? "#6D28D9";

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col gap-0"
      >
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Profile badge */}
          <Section icon={Sparkles} title="Profile badge">
            <div className="flex items-center gap-3">
              {currentUser && (
                <UserBadge
                  userId={currentUser.id}
                  name={currentUser.username}
                  size="md"
                  className="!w-14 !h-14 !text-xl"
                />
              )}
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!f || !onUploadAvatar) return;
                    const res = await onUploadAvatar(f);
                    if (!res.success) toast({ title: "Upload failed", description: res.error, variant: "destructive" });
                    else toast({ title: "Photo updated" });
                  }}
                />
                <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Upload photo
                </Button>
                {currentUser?.avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg gap-1.5 text-muted-foreground"
                    onClick={async () => { if (onRemoveAvatar) await onRemoveAvatar(); }}
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Max 200KB. Square images look best.</p>

            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-foreground">Badge style (when no photo)</p>
              <div className="inline-flex p-0.5 rounded-lg bg-secondary text-[11px] font-medium">
                {(["color", "gradient"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBadgeMode(m)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all capitalize",
                      badgeMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {badgeMode === "color" ? (
                <>
                  <div className="grid grid-cols-10 gap-1.5">
                    {BADGE_COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateBadgeAppearance?.({ badgeColor: c, badgeGradient: null })}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-all",
                          currentUser?.badgeColor?.toLowerCase() === c.toLowerCase() && !currentUser?.badgeGradient
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-110"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentUser?.badgeColor || "#6D28D9"}
                      onChange={(e) => onUpdateBadgeAppearance?.({ badgeColor: e.target.value, badgeGradient: null })}
                      className="w-9 h-9 rounded-lg border cursor-pointer"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => onUpdateBadgeAppearance?.({ badgeColor: null, badgeGradient: null })}
                    >
                      Reset
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-2">
                    {BADGE_GRADIENT_PRESETS.map((g, i) => {
                      const active = currentUser?.badgeGradient?.from === g.from && currentUser?.badgeGradient?.to === g.to;
                      return (
                        <button
                          key={i}
                          onClick={() => onUpdateBadgeAppearance?.({ badgeGradient: g, badgeColor: null })}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all",
                            active ? "border-foreground scale-105" : "border-transparent hover:scale-105"
                          )}
                          style={{ background: `linear-gradient(${g.angle ?? 135}deg, ${g.from}, ${g.to})` }}
                          aria-label={`Gradient ${i + 1}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={gradFrom} onChange={(e) => setGradFrom(e.target.value)} className="w-8 h-8 rounded-lg border cursor-pointer" />
                      <span className="text-[9px] text-muted-foreground">From</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <input type="color" value={gradTo} onChange={(e) => setGradTo(e.target.value)} className="w-8 h-8 rounded-lg border cursor-pointer" />
                      <span className="text-[9px] text-muted-foreground">To</span>
                    </div>
                    <div
                      className="h-10 flex-1 rounded-lg border border-border"
                      style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                    />
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => onUpdateBadgeAppearance?.({ badgeGradient: { from: gradFrom, to: gradTo }, badgeColor: null })}
                    >
                      Apply
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Display name */}
          <Section icon={User} title="Display name">
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
          </Section>

          {/* Global color */}
          <Section icon={Palette} title="Global color">
            <p className="text-[11px] text-muted-foreground">
              Used across buttons, links, and highlights.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                className="h-9 rounded-lg font-mono text-xs w-32"
              />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {GLOBAL_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateSettings({ primaryColor: c })}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all",
                    primaryColor.toLowerCase() === c.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Section>

          {/* Views */}
          <Section icon={Eye} title="Views">
            <p className="text-[11px] text-muted-foreground">
              Turning a view off just hides it — your data stays intact.
            </p>
            <div className="space-y-1.5">
              {VIEW_LIST.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-sm text-foreground">{v.label}</span>
                  <Switch
                    checked={enabledViews[v.id] !== false}
                    onCheckedChange={(on) =>
                      onUpdateSettings({
                        enabledViews: { ...enabledViews, [v.id]: on },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-foreground">Default view</p>
              <div className="flex flex-wrap gap-2">
                {VIEW_LIST.filter((v) => enabledViews[v.id] !== false).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onUpdateSettings({ defaultView: v.id })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      settings.defaultView === v.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-foreground">Task detail view</p>
              <div className="flex gap-2">
                {(["popup", "sidebar"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onUpdateSettings({ taskDetailView: v })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      settings.taskDetailView === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {v === "popup" ? "Popup" : "Sidebar"}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-foreground">Filter bar (desktop)</p>
              <div className="flex gap-2">
                {(["pills", "button"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onUpdateSettings({ filterBarDisplay: v })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      (settings.filterBarDisplay ?? "pills") === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {v === "pills" ? "Pills expanded" : "Filters button"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Mobile always uses the Filters button.</p>
            </div>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-foreground">Task visibility</p>
              <div className="flex gap-2">
                {(["mine", "all"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onUpdateSettings({ viewScope: v })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      (settings.viewScope ?? "mine") === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {v === "mine" ? "My tasks only" : "All tasks I can see"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Applies to Matrix, List, Kanban, Calendar, and Notes. The Projects view always shows every task and note you have access to.
              </p>
            </div>
          </Section>

          {/* Matrix view */}
          <Section icon={LayoutGrid} title="Matrix view">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" /> Quadrant tint intensity
              </p>
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
            </div>

            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Deadline warning threshold
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={settings.deadlineThresholdDays}
                  onChange={e => onUpdateSettings({ deadlineThresholdDays: parseInt(e.target.value) || 0 })}
                  className="w-20 h-8 rounded-lg"
                />
                <span className="text-xs text-muted-foreground">days before due date</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-foreground">Quadrant labels & colors</p>
              <div className="inline-flex p-0.5 rounded-lg bg-secondary text-[11px] font-medium">
                {(["light", "dark"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setColorMode(m)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
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
                  <div key={q.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/40">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        value={label.title}
                        onChange={e => onUpdateQuadrantLabel(q.id, { title: e.target.value })}
                        placeholder="Title"
                        className="h-8 text-xs font-semibold rounded-lg border-0 bg-background/40 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
                      />
                      <Input
                        value={label.subtitle}
                        onChange={e => onUpdateQuadrantLabel(q.id, { subtitle: e.target.value })}
                        placeholder="Description"
                        className="h-8 text-[11px] rounded-lg border-0 bg-background/40 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
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
            </div>
          </Section>

          {/* Categories */}
          <Section icon={Tag} title="Categories">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Color-code tasks by category.</p>
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
                <span className="text-sm text-foreground flex-1 truncate">{cat.name}</span>
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
            <div className="flex items-center gap-2 pt-2 border-t">
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
          </Section>

          {/* Users (admin) */}
          {isAdmin && (
            <Section icon={Users} title="Users">
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
            </Section>
          )}

          {/* Account */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium text-foreground">{currentUser?.username}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="rounded-xl gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={onResetToDefaults}
            className="w-full rounded-xl gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
