'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }
  
  const ToolbarButton = ({ onClick, children, isActive }: { onClick: () => void, children: React.ReactNode, isActive?: boolean }) => (
    <Button
        onClick={onClick}
        variant={isActive ? 'default' : 'ghost'}
        size="icon"
        className="w-8 h-8"
        type="button"
      >
        {children}
    </Button>
  );


  return (
    <div className="border border-input rounded-t-md p-1 flex flex-wrap items-center gap-1 bg-card">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
            <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
            <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
            <Heading2 className="h-4 w-4" />
        </ToolbarButton>
         <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })}>
            <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
            <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
            <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
       <div className="flex items-center gap-1">
         <input
            type="color"
            onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-8 h-8 p-1 border rounded bg-background cursor-pointer"
            aria-label="Set text color"
          />
        <Button onClick={() => editor.chain().focus().unsetColor().run()} variant="ghost" size="sm" type="button">
            Reset Color
        </Button>
       </div>
    </div>
  );
};

const TiptapEditor = ({ value, onChange, editable = true }: { value: string; onChange: (richText: string) => void, editable?: boolean }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions as needed
      }),
      TextStyle,
      Color
    ],
    content: value,
    editable: editable,
    onUpdate: ({ editor }) => {
      if (editable) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
        attributes: {
          class: cn(
            'prose dark:prose-invert prose-sm sm:prose-base max-w-none',
            'min-h-[200px] rounded-b-md border-x border-b border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'
            ),
        },
      },
  });
  
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const isSame = editor.getHTML() === value;
      if (!isSame) {
        // Use `setContent` to replace the entire document
        editor.commands.setContent(value, false); // `false` to prevent emitting update event
      }
    }
  }, [value, editor]);

  return (
    <div>
        {editable && <TiptapToolbar editor={editor} />}
        <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;
