'use client';

import { Bold, Italic, Underline, List, Link, Type } from 'lucide-react';

interface RichTextToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export default function RichTextToolbar({ editorRef }: RichTextToolbarProps) {
  const fonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' }
  ];

  const sizes = [
    { value: '1', label: 'Very Small' },
    { value: '2', label: 'Small' },
    { value: '3', label: 'Normal' },
    { value: '4', label: 'Large' },
    { value: '5', label: 'Very Large' },
    { value: '6', label: 'Extra Large' },
    { value: '7', label: 'Huge' }
  ];

  const executeCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      // Ensure the editor has focus
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleBold = () => {
    executeCommand('bold');
  };

  const handleItalic = () => {
    executeCommand('italic');
  };

  const handleUnderline = () => {
    executeCommand('underline');
  };

  const handleFontChange = (font: string) => {
    executeCommand('fontName', font);
  };

  const handleSizeChange = (size: string) => {
    executeCommand('fontSize', size);
  };

  const handleList = () => {
    executeCommand('insertUnorderedList');
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <button
        onClick={handleBold}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      
      <button
        onClick={handleItalic}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>
      
      <button
        onClick={handleUnderline}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      {/* Font Selection */}
      <div className="flex items-center space-x-1">
        <Type className="h-4 w-4 text-gray-500" />
        <select
          onChange={(e) => handleFontChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Font"
        >
          {fonts.map(font => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <select
        onChange={(e) => handleSizeChange(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="Font Size"
      >
        {sizes.map(size => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      {/* Lists and Links */}
      <button
        onClick={handleList}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      
      <button
        onClick={handleLink}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Insert Link"
      >
        <Link className="h-4 w-4" />
      </button>
    </div>
  );
}
