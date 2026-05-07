import { ComponentFileViewerWrapper, type ApiComponent } from "@/components/ui/file-viewer-wrapper";
import { m } from "@/paraglide/messages";

function buildMarkdownSection(title: string, items: string[]) {
  return [`## ${title}`, "", ...items.map((item) => `- ${item}`)].join("\n");
}

function getChangelogMarkdown() {
  const sections = [
    buildMarkdownSection(m.changelog_section_added(), [
      m.changelog_v01_added_bookmarks(),
      m.changelog_v01_added_mail(),
      m.changelog_v01_added_calendar(),
      m.changelog_v01_added_board(),
      m.changelog_v01_added_inbox(),
    ]),
    buildMarkdownSection(m.changelog_section_changed(), [
      m.changelog_v01_changed_file_viewer(),
      m.changelog_v01_changed_browsable_release(),
    ]),
    buildMarkdownSection(m.changelog_section_notes(), [
      m.changelog_v01_note_shiki(),
      m.changelog_v01_note_file_tree(),
    ]),
  ];

  return [
    "# OrchOS v0.1.0",
    "",
    m.changelog_v01_intro(),
    "",
    `**${m.release_v01_title()}**`,
    "",
    m.release_v01_desc(),
    "",
    ...sections.flatMap((section, index) => (index === sections.length - 1 ? [section] : [section, ""])),
    "",
  ].join("\n");
}

export default function ComponentFileViewerDemo() {
  const sampleComponent: ApiComponent = {
    author: "OrchOS",
    name: m.changelog_bundle_name(),
    version: "v0.1.0",
    files: [
      {
        path: "CHANGELOG-v0.1.0.md",
        content: getChangelogMarkdown(),
      },
    ],
  };

  return (
    <div className="w-full">
      <ComponentFileViewerWrapper component={sampleComponent} />
    </div>
  );
}
