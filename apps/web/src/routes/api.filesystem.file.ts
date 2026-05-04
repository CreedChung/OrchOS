import { createFileRoute } from "@tanstack/react-router";
import { FilesystemService } from "@/server/modules/filesystem/service";

export const Route = createFileRoute("/api/filesystem/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path");
        if (!path) {
          return Response.json({ error: "Missing path" }, { status: 400 });
        }
        return Response.json(FilesystemService.readFile(path));
      },
      PUT: async ({ request }) => {
        const body = (await request.json()) as { path?: string; content?: string };
        if (!body.path || typeof body.content !== "string") {
          return Response.json({ error: "Missing path or content" }, { status: 400 });
        }
        return Response.json(FilesystemService.writeFile(body.path, body.content));
      },
    },
  },
});
