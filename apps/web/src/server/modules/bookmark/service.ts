import { asc, inArray } from "drizzle-orm";

import { bookmarkCategories, bookmarks } from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";

type BookmarkItem = {
  id: string;
  title: string;
  url: string;
};

export type BookmarkCategoryRecord = {
  id: string;
  name: string;
  bookmarks: BookmarkItem[];
};

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export abstract class BookmarkService {
  static async list(db: AppDb): Promise<BookmarkCategoryRecord[]> {
    const categoryRows = await db.select().from(bookmarkCategories).orderBy(asc(bookmarkCategories.sortOrder)).all();
    const bookmarkRows = await db.select().from(bookmarks).orderBy(asc(bookmarks.sortOrder)).all();

    return categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      bookmarks: bookmarkRows
        .filter((bookmark) => bookmark.categoryId === category.id)
        .map((bookmark) => ({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
        })),
    }));
  }

  static async replaceAll(db: AppDb, categories: BookmarkCategoryRecord[]) {
    const now = new Date().toISOString();

    const existingCategories = await db.select().from(bookmarkCategories).all();
    if (existingCategories.length > 0) {
      await db.delete(bookmarkCategories).where(inArray(bookmarkCategories.id, existingCategories.map((category) => category.id))).run();
    }

    for (const [categoryIndex, category] of categories.entries()) {
      await db.insert(bookmarkCategories).values({
        id: category.id,
        name: category.name,
        sortOrder: String(categoryIndex),
        createdAt: now,
        updatedAt: now,
      }).run();

      for (const [bookmarkIndex, bookmark] of category.bookmarks.entries()) {
        await db.insert(bookmarks).values({
          id: bookmark.id,
          categoryId: category.id,
          title: bookmark.title,
          url: bookmark.url,
          sortOrder: String(bookmarkIndex),
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }

    return BookmarkService.list(db);
  }

  static async createCategory(db: AppDb, name: string) {
    const categories = await BookmarkService.list(db);
    const category: BookmarkCategoryRecord = {
      id: generateId("bookmark_category"),
      name,
      bookmarks: [],
    };

    return BookmarkService.replaceAll(db, [...categories, category]);
  }

  static async updateCategory(db: AppDb, id: string, name: string) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) => (category.id === id ? { ...category, name } : category)),
    );
  }

  static async deleteCategory(db: AppDb, id: string) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.filter((category) => category.id !== id),
    );
  }

  static async updateBookmark(db: AppDb, categoryId: string, bookmarkId: string, data: { title: string; url: string }) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: category.bookmarks.map((bookmark) =>
                bookmark.id === bookmarkId ? { ...bookmark, title: data.title, url: data.url } : bookmark,
              ),
            }
          : category,
      ),
    );
  }

  static async createBookmark(db: AppDb, categoryId: string, data: { title: string; url: string }) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: [
                ...category.bookmarks,
                {
                  id: generateId("bookmark"),
                  title: data.title,
                  url: data.url,
                },
              ],
            }
          : category,
      ),
    );
  }

  static async moveBookmark(db: AppDb, bookmarkId: string, sourceCategoryId: string, targetCategoryId: string) {
    if (sourceCategoryId === targetCategoryId) {
      return BookmarkService.list(db);
    }

    const categories = await BookmarkService.list(db);
    const sourceCategory = categories.find((category) => category.id === sourceCategoryId);
    const bookmark = sourceCategory?.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) {
      return categories;
    }

    return BookmarkService.replaceAll(
      db,
      categories.map((category) => {
        if (category.id === sourceCategoryId) {
          return {
            ...category,
            bookmarks: category.bookmarks.filter((item) => item.id !== bookmarkId),
          };
        }

        if (category.id === targetCategoryId) {
          return {
            ...category,
            bookmarks: [...category.bookmarks, bookmark],
          };
        }

        return category;
      }),
    );
  }

  static async deleteBookmark(db: AppDb, categoryId: string, bookmarkId: string) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: category.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
            }
          : category,
      ),
    );
  }
}
