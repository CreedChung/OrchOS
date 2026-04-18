import { Elysia, t } from "elysia";
import { authPlugin } from "../auth";
import { FilesystemService } from "./service";

export const filesystemController = new Elysia({ prefix: "/api/filesystem" })
  .use(authPlugin)
  .requireAuth(true)
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
