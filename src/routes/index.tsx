import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/builder/Workspace";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BotForge — No-Code Discord Bot Builder" },
      { name: "description", content: "Visually build Discord bots with a node-based workflow editor and export a ready-to-run Node.js bot as a ZIP." },
      { property: "og:title", content: "BotForge — No-Code Discord Bot Builder" },
      { property: "og:description", content: "Drag-and-drop workflow editor for Discord bots. Export production-ready code as ZIP." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Workspace />
      <Toaster richColors position="bottom-right" />
    </>
  );
}
