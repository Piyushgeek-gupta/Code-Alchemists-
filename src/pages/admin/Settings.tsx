import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Settings = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState("");
  const [settings, setSettings] = useState({
    auto_save_enabled: true,
    anti_cheat_enabled: true,
    track_tab_switches: true,
    max_attempts_per_question: 999,
  });

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      fetchSettings();
    }
  }, [selectedContest]);

  const fetchContests = async () => {
    const { data } = await supabase.from("contests").select("id, name");
    setContests(data || []);
    if (data && data.length > 0) {
      setSelectedContest(data[0].id);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("contest_settings")
      .select("*")
      .eq("contest_id", selectedContest)
      .single();

    if (data) {
      setSettings({
        auto_save_enabled: data.auto_save_enabled,
        anti_cheat_enabled: data.anti_cheat_enabled,
        track_tab_switches: data.track_tab_switches,
        max_attempts_per_question: data.max_attempts_per_question,
      });
    }
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("contest_settings")
      .upsert(
        {
          contest_id: selectedContest,
          ...settings,
        },
        { onConflict: "contest_id" }
      );

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Configure contest behavior and controls</p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Select Contest</h2>
          <Select value={selectedContest} onValueChange={setSelectedContest}>
            <SelectTrigger>
              <SelectValue placeholder="Select contest" />
            </SelectTrigger>
            <SelectContent>
              {contests.map((contest) => (
                <SelectItem key={contest.id} value={contest.id}>
                  {contest.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold">Contest Settings</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-save Progress</p>
              <p className="text-sm text-muted-foreground">Automatically save participant progress</p>
            </div>
            <Switch
              checked={settings.auto_save_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_save_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Anti-cheat Controls</p>
              <p className="text-sm text-muted-foreground">Enable anti-cheating measures</p>
            </div>
            <Switch
              checked={settings.anti_cheat_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, anti_cheat_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Track Tab Switches</p>
              <p className="text-sm text-muted-foreground">Monitor when participants switch tabs</p>
            </div>
            <Switch
              checked={settings.track_tab_switches}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, track_tab_switches: checked })
              }
            />
          </div>

          <div>
            <p className="font-medium mb-2">Max Attempts Per Question</p>
            <Input
              type="number"
              value={settings.max_attempts_per_question}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_attempts_per_question: parseInt(e.target.value),
                })
              }
              min={1}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </Card>
    </div>
  );
};
