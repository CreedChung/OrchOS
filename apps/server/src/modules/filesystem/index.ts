import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { FilesystemService } from "@/modules/filesystem/service";

export const filesystemController = new Elysia({ prefix: "/api/filesystem" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
  "/browse",
  ({ query }) => {
    return FilesystemService.browse(query.path || "~");
  },
  {
    query: t.Object({
      path: t.Optional(t.String()),
    }),
    response: t.Object({
      currentPath: t.String(),
      parentPath: t.Optional(t.String()),
      directories: t.Array(
        t.Object({
          name: t.String(),
          path: t.String(),
        }),
      ),
    }),
  },
);
