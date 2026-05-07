import { oc } from "@orpc/contract";
import { z } from "zod";

const filesystemDirectorySchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const filesystemBrowseResultSchema = z.object({
  currentPath: z.string(),
  parentPath: z.string().optional(),
  directories: z.array(filesystemDirectorySchema),
});

export const filesystemFileResultSchema = z.object({
  path: z.string(),
  content: z.string().nullable(),
});

export const filesystemWriteResultSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const filesystemContract = {
  browse: oc
    .input(
      z.object({
        path: z.string().optional(),
      }),
    )
    .output(filesystemBrowseResultSchema),
  readFile: oc.input(z.object({ path: z.string() })).output(filesystemFileResultSchema),
  writeFile: oc
    .input(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    )
    .output(filesystemWriteResultSchema),
};
