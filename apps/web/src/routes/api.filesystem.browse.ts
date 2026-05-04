import { createFileRoute } from "@tanstack/react-router";
import { FilesystemService } from "@/server/modules/filesystem/service";

export const Route = createFileRoute("/api/filesystem/browse")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") || "~";
        return Response.json(FilesystemService.browse(path));
      },
    },
  },
});
