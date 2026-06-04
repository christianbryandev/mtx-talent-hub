import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react';

export function RichTextEditor({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert min-h-[150px] max-w-none focus:outline-none p-3',
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border border-border/60 rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-primary">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 p-1 bg-muted/20">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}>
          <Bold className={`h-4 w-4 ${editor.isActive('bold') ? 'text-primary' : ''}`} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className={`h-4 w-4 ${editor.isActive('italic') ? 'text-primary' : ''}`} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className={`h-4 w-4 ${editor.isActive('strike') ? 'text-primary' : ''}`} />
        </Button>
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className={`h-4 w-4 ${editor.isActive('bulletList') ? 'text-primary' : ''}`} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className={`h-4 w-4 ${editor.isActive('orderedList') ? 'text-primary' : ''}`} />
        </Button>
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={setLink}>
          <LinkIcon className={`h-4 w-4 ${editor.isActive('link') ? 'text-primary' : ''}`} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')}>
          <Unlink className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <EditorContent editor={editor} className="bg-card" />
    </div>
  );
}
