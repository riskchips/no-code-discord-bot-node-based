import type { DiscordEvent } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Hash, CornerDownRight, EyeOff, Shield } from "lucide-react";
import { useEffect, useRef } from "react";

const STYLE_BG: Record<string, string> = {
  Primary: "bg-[#5865F2] hover:bg-[#4752C4]",
  Secondary: "bg-[#4E5058] hover:bg-[#6D6F78]",
  Success: "bg-[#248046] hover:bg-[#1A6334]",
  Danger: "bg-[#DA373C] hover:bg-[#A12828]",
  Link: "bg-[#4E5058] hover:bg-[#6D6F78]",
};

function timeStr(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, bot, color }: { name: string; bot?: boolean; color?: string }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
        style={{ background: color || "#5865F2" }}
      >
        {initial}
      </div>
      {bot && (
        <span className="absolute -bottom-1 -right-1 bg-[#5865F2] text-white text-[8px] font-bold px-1 rounded">
          BOT
        </span>
      )}
    </div>
  );
}

function MessageBlock({ ev }: { ev: DiscordEvent }) {
  const m = ev.message;
  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-[#2e3035]/40 transition-colors animate-fade-in">
      <Avatar name={ev.author?.name || "?"} bot={ev.author?.bot} color={ev.author?.color} />
      <div className="flex-1 min-w-0">
        {ev.replyTo && (
          <div className="flex items-center gap-1 text-xs text-[#b5bac1] mb-0.5">
            <CornerDownRight className="w-3 h-3" />
            <span className="font-medium text-[#b5bac1]">@{ev.replyTo.author}</span>
            <span className="truncate opacity-80">{ev.replyTo.content}</span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-white text-sm">{ev.author?.name}</span>
          {ev.author?.bot && (
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1 rounded">BOT</span>
          )}
          <span className="text-[11px] text-[#949ba4]">{timeStr(ev.ts)}</span>
          {ev.ephemeral && (
            <span className="flex items-center gap-1 text-[10px] text-[#949ba4]">
              <EyeOff className="w-3 h-3" /> only you can see this
            </span>
          )}
        </div>

        {m?.type === "text" && m.content && (
          <div className="text-[#dbdee1] text-sm whitespace-pre-wrap break-words">{m.content}</div>
        )}

        {m?.type === "embed" && (
          <div
            className="mt-1 max-w-md rounded bg-[#2b2d31] border-l-4 px-3 py-2"
            style={{ borderColor: m.embedColor || "#5865F2" }}
          >
            {m.embedTitle && (
              <div className="font-semibold text-white text-sm mb-1">{m.embedTitle}</div>
            )}
            {m.content && (
              <div className="text-[#dbdee1] text-sm whitespace-pre-wrap">{m.content}</div>
            )}
          </div>
        )}

        {m?.buttonRows && m.buttonRows.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {m.buttonRows.map((row, ri) => (
              <div key={ri} className="flex flex-wrap gap-2">
                {row.map((b, i) => (
                  <button
                    key={i}
                    disabled={b.disabled}
                    className={`text-white text-sm font-medium px-3 py-1.5 rounded transition-colors ${
                      STYLE_BG[b.style] || STYLE_BG.Primary
                    } ${b.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title={b.url || b.customId}
                  >
                    {b.emoji ? `${b.emoji} ` : ""}{b.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {m?.selectMenu && (
          <div className="mt-2 max-w-sm">
            <div className="bg-[#1e1f22] hover:bg-[#2b2d31] cursor-pointer text-[#dbdee1] text-sm rounded px-3 py-2 flex items-center justify-between border border-[#1e1f22]">
              <span className="opacity-80">{m.selectMenu.placeholder || "Choose…"}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalBlock({ ev }: { ev: DiscordEvent }) {
  if (!ev.modal) return null;
  return (
    <div className="px-4 py-3 animate-scale-in">
      <div className="mx-auto max-w-md bg-[#313338] rounded-lg shadow-2xl border border-black/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/30">
          <div className="text-white font-semibold">{ev.modal.title}</div>
          <div className="text-[10px] text-[#949ba4] mt-0.5">Modal popup</div>
        </div>
        <div className="p-4 space-y-3">
          {ev.modal.fields.map((f, i) => (
            <div key={i}>
              <div className="text-[11px] uppercase font-bold text-[#b5bac1] mb-1">{f.label}</div>
              {f.style === "Paragraph" ? (
                <textarea
                  disabled
                  placeholder={f.placeholder || ""}
                  className="w-full bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-2 py-1.5 border border-black/30"
                  rows={3}
                />
              ) : (
                <input
                  disabled
                  placeholder={f.placeholder || ""}
                  className="w-full bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-2 py-1.5 border border-black/30"
                />
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-[#2b2d31] flex justify-end gap-2">
          <button className="text-white text-sm px-3 py-1.5 hover:underline">Cancel</button>
          <button className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium px-3 py-1.5 rounded">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function SystemBlock({ ev, icon }: { ev: DiscordEvent; icon: React.ReactNode }) {
  return (
    <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-[#949ba4] animate-fade-in">
      {icon}
      <span>{ev.text}</span>
      <span className="ml-auto text-[10px]">{timeStr(ev.ts)}</span>
    </div>
  );
}

export function DiscordPreview({ events }: { events: DiscordEvent[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (el) (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
  }, [events]);

  return (
    <div className="h-full flex flex-col bg-[#313338]">
      <div className="h-12 border-b border-black/30 px-4 flex items-center gap-2 shrink-0">
        <Hash className="w-5 h-5 text-[#949ba4]" />
        <span className="font-semibold text-white">bot-test</span>
        <span className="text-[#949ba4] text-xs ml-2">live preview of your bot</span>
      </div>
      <div ref={scroller} className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="py-3">
            {events.length === 0 && (
              <div className="text-center text-[#949ba4] text-sm py-12">
                Click <strong className="text-white">Run flow</strong> to see your bot's messages
                appear here, just like in Discord.
              </div>
            )}
            {events.map((ev, i) => {
              if (ev.kind === "modal") return <ModalBlock key={i} ev={ev} />;
              if (ev.kind === "moderation")
                return <SystemBlock key={i} ev={ev} icon={<Shield className="w-3.5 h-3.5" />} />;
              if (ev.kind === "system")
                return <SystemBlock key={i} ev={ev} icon={<span>•</span>} />;
              return <MessageBlock key={i} ev={ev} />;
            })}
          </div>
        </ScrollArea>
      </div>
      <div className="border-t border-black/30 p-3 shrink-0">
        <div className="bg-[#383a40] rounded-lg px-4 py-2.5 text-[#949ba4] text-sm cursor-not-allowed">
          Message #bot-test (preview only)
        </div>
      </div>
    </div>
  );
}