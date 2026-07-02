import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { useReportEditor } from "./ReportEditorContext";

interface Props {
  editableId: string;
  initialMarkdown: string;
}

export function EditableProse({ editableId, initialMarkdown }: Props) {
  const ctx = useReportEditor();
  const initialHtml = useRef(
    markdownToHtml(ctx?.getDraft(editableId) ?? initialMarkdown),
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
    ],
    content: initialHtml.current,
    onUpdate: ({ editor: ed }) => {
      const md = htmlToMarkdown(ed.getHTML());
      ctx?.setDraft(editableId, md);
    },
    editorProps: {
      attributes: {
        class: "rl-editable-prose rl-prose",
      },
    },
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `px-2 py-1 text-xs rounded ${
      active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
    }`;

  return (
    <div className="rl-editable-wrap">
      <BubbleMenu editor={editor}>
        <div className="flex gap-1 rounded-md border bg-background p-1 shadow-md">
          <button
            type="button"
            className={btnCls(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className={btnCls(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className={btnCls(editor.isActive("heading", { level: 2 }))}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            type="button"
            className={btnCls(editor.isActive("heading", { level: 3 }))}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </button>
          <button
            type="button"
            className={btnCls(editor.isActive("bulletList"))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </button>
          <button
            type="button"
            className={btnCls(editor.isActive("orderedList"))}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </button>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  );
}
