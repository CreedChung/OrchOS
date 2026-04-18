import { ComponentFileViewerWrapper, type ApiComponent } from "@/components/ui/file-viewer-wrapper";
import { useLocale } from "@/lib/useI18n";

function getChangelogMarkdown(locale: string) {
  if (locale === "zh-CN") {
    return `# OrchOS v0.1.0

第一个公开版本，聚焦在多代理编排与工作流可视化。

## 新增

- 多代理协作与任务分配基础能力
- 目标驱动的工作流管理界面
- MCP Server 接入入口与配置能力
- 首页交互式步骤演示

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

第一個公開版本，聚焦於多代理編排與工作流程視覺化。

## 新增

- 多代理協作與任務分配基礎能力
- 目標驅動的工作流程管理介面
- MCP Server 接入入口與設定能力
- 首頁互動式步驟展示

## 變更

- \`/changelog\` 頁面從時間軸檢視切換為檔案檢視器
- 發布內容改為按檔案結構瀏覽，便於查看版本說明與關鍵原始碼

## 說明

- 程式碼高亮由 Shiki 提供
- 檔案樹支援摺疊、選取、複製與外連檢視
`;
  }

  return `# OrchOS v0.1.0

First public release focused on multi-agent orchestration and workflow visualization.

## Added

- Foundational multi-agent collaboration and task assignment
- Goal-driven workflow management interface
- MCP Server entry points and configuration support
- Interactive homepage walkthrough

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
