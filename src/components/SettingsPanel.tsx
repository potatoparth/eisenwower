import { useState } from "react";
import { X, RotateCcw, Palette, Type, Eye, Clock, Tag, Users, LogOut, Trash2 } from "lucide-react";
import { AppSettings, DEFAULT_SETTINGS, UserAccount } from "@/types/settings";
import { QUADRANTS } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onUpdateQuadrantColor: (quadrant: 1 | 2 | 3 | 4, colors: Partial<AppSettings["quadrantColors"][1]>) => void;
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
}

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onUpdateQuadrantColor,
  onAddCategoryColor,
  onRemoveCategoryColor,
  onResetToDefaults,
  onClose,
  currentUser,
  users,
  isAdmin,
  onLogout,
  onDeleteUser,
}: SettingsPanelProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#7a8599");

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l shadow-medium z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-foreground">Settings</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quadrant Colors */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4" /> Quadrant Colors
          </h3>
          {QUADRANTS.map(q => (
            <div key={q.id} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{q.title} — {q.subtitle}</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Main</label>
                  <input
                    type="color"
                    value={settings.quadrantColors[q.color].main}
                    onChange={e => onUpdateQuadrantColor(q.color, { main: e.target.value })}
                    className="w-8 h-8 rounded-lg border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Light</label>
                  <input
                    type="color"
                    value={settings.quadrantColors[q.color].light}
                    onChange={e => onUpdateQuadrantColor(q.color, { light: e.target.value })}
                    className="w-8 h-8 rounded-lg border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Border</label>
                  <input
                    type="color"
                    value={settings.quadrantColors[q.color].border}
                    onChange={e => onUpdateQuadrantColor(q.color, { border: e.target.value })}
                    className="w-8 h-8 rounded-lg border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-muted-foreground">Text</label>
                  <input
                    type="color"
                    value={settings.quadrantColors[q.color].foreground}
                    onChange={e => onUpdateQuadrantColor(q.color, { foreground: e.target.value })}
                    className="w-8 h-8 rounded-lg border cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ))}
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
          {settings.categoryColors.map(cat => (
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
              <p className="text-sm font-medium text-foreground">{currentUser?.username}</p>
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
