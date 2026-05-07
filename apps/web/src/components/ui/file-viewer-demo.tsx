import { ComponentFileViewerWrapper, type ApiComponent } from "@/components/ui/file-viewer-wrapper";
import { useLocale } from "@/lib/i18n-provider";

function getChangelogMarkdown(locale: string) {
  if (locale === "zh-CN") {
    return `# OrchOS v0.1.0

第一个公开版本 —— 你的个人数字工作空间，现在开始。

## 新增

- 书签管理 — 收藏、分类、搜索和导入书签
- 邮件集成 — 连接 Gmail 或 IMAP/SMTP 账号
- 日历视图 — 日、周、月模式，事件管理和 Google Calendar 接入
- 看板面板 — 拖拽式任务追踪
- 智能收件箱 — 统一管理 GitHub PR、Issue、提及和代理请求

## 变更

- \`/changelog\` 页面从时间线视图切换为文件查看器
- 发布内容改为按文件结构浏览，便于查看版本说明和关键源码

## 说明

- 代码高亮由 Shiki 提供
- 文件树支持折叠、选择、复制与外链查看
`;
  }

  if (locale === "zh-TW") {
    return `# OrchOS v0.1.0

第一個公開版本 —— 你的個人數位工作空間，現在開始。

## 新增

- 書籤管理 — 收藏、分類、搜尋和匯入書籤
- 郵件整合 — 連接 Gmail 或 IMAP/SMTP 帳號
- 日曆檢視 — 日、週、月模式，事件管理和 Google Calendar 接入
- 看板面板 — 拖拽式任務追蹤
- 智慧收件匣 — 統一管理 GitHub PR、Issue、提及和代理請求

## 變更

- \`/changelog\` 頁面從時間軸檢視切換為檔案檢視器
- 發布內容改為按檔案結構瀏覽，便於查看版本說明與關鍵原始碼

## 說明

- 程式碼高亮由 Shiki 提供
- 檔案樹支援摺疊、選取、複製與外連檢視
`;
  }

  return `# OrchOS v0.1.0

Your personal digital workspace — now in your hands.

## Added

- **Bookmarks** — Save, organize, search, and import bookmarks with categories
- **Mail** — Connect Gmail or IMAP/SMTP accounts, manage threads in one place
- **Calendar** — Day, week, and month views with events and Google Calendar integration
- **Board** — Drag-and-drop task tracking for projects and todos
- **Inbox** — Unified feed for GitHub PRs, issues, mentions, and agent requests

## Changed

- Switched the \`/changelog\` page from a timeline view to a file viewer
- Reorganized release content as browsable files for easier access to release notes and key source files

## Notes

- Code highlighting is powered by Shiki
- The file tree supports collapsing, selection, copying, and external links
`;
}

export default function ComponentFileViewerDemo() {
  const { locale } = useLocale();

  const sampleComponent: ApiComponent = {
    author: "OrchOS",
    name: "release-bundle",
    version: "v0.1.0",
    files: [
      {
        path: "CHANGELOG-v0.1.0.md",
        content: getChangelogMarkdown(locale),
      },
    ],
  };

  return (
    <div className="w-full">
      <ComponentFileViewerWrapper component={sampleComponent} />
    </div>
  );
}
