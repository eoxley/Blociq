'use client';

import { Bold, Italic, Underline, List, Link, Type } from 'lucide-react';

interface RichTextToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onFontChange: (font: string) => void;
  onSizeChange: (size: string) => void;
  onList: () => void;
  onLink: () => void;
}

export default function RichTextToolbar({
  onBold,
  onItalic,
  onUnderline,
  onFontChange,
  onSizeChange,
  onList,
  onLink
}: RichTextToolbarProps) {
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

  return (
    <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <button
        onClick={onBold}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      
      <button
        onClick={onItalic}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>
      
      <button
        onClick={onUnderline}
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
          onChange={(e) => onFontChange(e.target.value)}
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
        onChange={(e) => onSizeChange(e.target.value)}
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
        onClick={onList}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      
      <button
        onClick={onLink}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
        title="Insert Link"
      >
        <Link className="h-4 w-4" />
      </button>
    </div>
  );
}
