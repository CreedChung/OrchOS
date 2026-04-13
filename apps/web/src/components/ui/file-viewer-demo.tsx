import { ComponentFileViewerWrapper, type ApiComponent } from "#/components/ui/file-viewer-wrapper"

const changelogMarkdown = `# OrchOS v0.1.0

第一个公开版本,聚焦在多代理编排与工作流可视化。

## Added

- 多代理协作与任务分配基础能力
- 目标驱动的工作流管理界面
- MCP Server 接入入口与配置能力
- 首页交互式步骤演示

## Changed

- \`/changelog\` 页面从时间线视图切换为文件查看器
- 发布内容改为按文件结构浏览，便于查看版本说明和关键源码

## Notes

- 代码高亮由 Shiki 提供
- 文件树支持折叠、选择、复制与外链查看
`

const sampleComponent: ApiComponent = {
  author: "OrchOS",
  name: "release-bundle",
  version: "v0.1.0",
  files: [
    {
      path: "CHANGELOG-v0.1.0.md",
      content: changelogMarkdown,
    },
  ],
}

export default function ComponentFileViewerDemo() {
  return (
    <div className="w-full">
      <ComponentFileViewerWrapper component={sampleComponent} />
    </div>
  )
}
