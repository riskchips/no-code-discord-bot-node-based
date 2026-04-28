import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

interface Props {
  config: string;
  tokenPath: string;
  variables: { name: string; value: string }[];
  onSave: (next: { config: string; tokenPath: string; variables: { name: string; value: string }[] }) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ConfigEditor({ config, tokenPath, variables, onSave, onDirtyChange }: Props) {
  const [draft, setDraft] = useState(config);
  const [tp, setTp] = useState(tokenPath);
  const [vars, setVars] = useState(variables);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);
  useEffect(() => { setTp(tokenPath); }, [tokenPath]);
  useEffect(() => { setVars(variables); }, [variables]);

  useEffect(() => {
    try { JSON.parse(draft); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, [draft]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const canSave = !error;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2">
        <div>
          <h2 className="font-semibold">Config Editor</h2>
          <p className="text-xs text-muted-foreground">
            Reference values anywhere with <code className="bg-muted px-1 rounded">{"${config.path.to.value}"}</code>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {error ? (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" /> Invalid JSON
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
            </span>
          )}
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => { onSave({ config: draft, tokenPath: tp, variables: vars }); setDirty(false); }}
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {error && dirty && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cannot save or leave:</strong> fix the JSON syntax error first.
            <div className="mt-1 font-mono text-xs">{error}</div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 grid md:grid-cols-2 gap-4 p-4 overflow-auto">
        <div className="flex flex-col">
          <Label className="mb-2">config.json</Label>
          <Textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
            spellCheck={false}
            className="font-mono text-xs flex-1 min-h-[400px] resize-none"
          />
        </div>

        <div className="space-y-4">
          <div>
            <Label>Token path</Label>
            <Input
              value={tp}
              onChange={(e) => { setTp(e.target.value); setDirty(true); }}
              placeholder="config.bot.token"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The exported bot reads its token from this path. Falls back to <code>DISCORD_TOKEN</code> env.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Custom variables</Label>
              <Button size="sm" variant="outline" onClick={() => { setVars([...vars, { name: "", value: "" }]); setDirty(true); }}>
                + Add
              </Button>
            </div>
            <div className="space-y-2">
              {vars.length === 0 && <p className="text-xs text-muted-foreground">No custom variables yet.</p>}
              {vars.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={v.name}
                    placeholder="name"
                    onChange={(e) => {
                      const c = [...vars]; c[i] = { ...c[i], name: e.target.value }; setVars(c); setDirty(true);
                    }}
                  />
                  <Input
                    value={v.value}
                    placeholder="value"
                    onChange={(e) => {
                      const c = [...vars]; c[i] = { ...c[i], value: e.target.value }; setVars(c); setDirty(true);
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => { setVars(vars.filter((_, j) => j !== i)); setDirty(true); }}>×</Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Reference as <code className="bg-muted px-1 rounded">{"${name}"}</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}