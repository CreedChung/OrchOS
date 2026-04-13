import { readdirSync, statSync, existsSync } from "fs"
import { resolve, join, sep } from "path"
import { homedir } from "os"

export abstract class FilesystemService {
  static browse(dirPath: string): {
    currentPath: string
    parentPath?: string
    directories: { name: string; path: string }[]
  } {
    // Resolve ~ to home directory
    const resolvedPath = dirPath.startsWith("~")
      ? join(homedir(), dirPath.slice(1))
      : resolve(dirPath)

    if (!existsSync(resolvedPath)) {
      return { currentPath: resolvedPath, directories: [] }
    }

    try {
      const stats = statSync(resolvedPath)
      if (!stats.isDirectory()) {
        return { currentPath: resolvedPath, directories: [] }
      }
    } catch {
      return { currentPath: resolvedPath, directories: [] }
    }

    const parentPath = resolvedPath !== "/" ? join(resolvedPath, "..") : undefined

    let entries: { name: string; path: string }[] = []
    try {
      const items = readdirSync(resolvedPath, { withFileTypes: true })
      entries = items
        .filter((item) => item.isDirectory() && !item.name.startsWith("."))
        .map((item) => ({
          name: item.name,
          path: join(resolvedPath, item.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      // Permission denied or other error
    }

    return {
      currentPath: resolvedPath,
      parentPath,
      directories: entries,
    }
  }
}
