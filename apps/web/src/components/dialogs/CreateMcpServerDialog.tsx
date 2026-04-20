import { useState, useEffect } from "react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface CreateMcpServerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateMcpServerDialog({ open, onClose, onCreated }: CreateMcpServerDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    command: "",
    args: "",
    scope: "global" as "global" | "project",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", command: "", args: "", scope: "global" });
    }
  }, [open]);

  const handleCreate = async () => {
    if (!formData.name || !formData.command) return;
    setLoading(true);
    try {
      const args = formData.args ? formData.args.split(" ").filter(Boolean) : [];
      await api.createMcpServer({
        name: formData.name,
        command: formData.command,
        args,
        scope: formData.scope,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create MCP server:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={m.mcp_servers()}
      size="md"
      bodyClassName="space-y-3 pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button size="sm" type="button" onClick={handleCreate} disabled={loading || !formData.name || !formData.command}>
            {loading ? m.creating() : m.create()}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">{m.field_name()}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={m.mcp_name_placeholder()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{m.command()}</label>
          <input
            type="text"
            value={formData.command}
            onChange={(e) => setFormData({ ...formData, command: e.target.value })}
            placeholder={m.mcp_command_placeholder()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{m.mcp_args_label()}</label>
          <input
            type="text"
            value={formData.args}
            onChange={(e) => setFormData({ ...formData, args: e.target.value })}
            placeholder={m.mcp_args_placeholder()}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{m.scope()}</label>
          <Select
            value={formData.scope}
            onValueChange={(v) => setFormData({ ...formData, scope: v as "global" | "project" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="global">{m.scope_global()}</SelectItem>
                <SelectItem value="project">{m.scope_project()}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppDialog>
  );
}
