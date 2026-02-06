import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  style?: React.CSSProperties;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function InlineTextEditor({
  value,
  onChange,
  isEditing,
  onStartEdit,
  onEndEdit,
  style,
  className,
  inputClassName,
  placeholder = 'Skriv her...',
}: InlineTextEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(editValue);
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onEndEdit();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        style={{
          ...style,
          background: 'transparent',
          border: '2px solid hsl(var(--primary))',
          padding: '2px 6px',
        }}
        className={cn(
          "h-auto rounded focus:ring-0 focus:ring-offset-0",
          inputClassName
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      style={style}
      className={cn("cursor-text select-none", className)}
      title="Dobbeltklikk for å redigere"
    >
      {value || placeholder}
    </span>
  );
}
