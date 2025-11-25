'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ColorPickerProps {
  value: string; // Hex color code
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EC4899', // pink
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [error, setError] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handlePresetColorClick = (color: string) => {
    const normalizedColor = color.toUpperCase();
    onChange(normalizedColor);
    setHexInput(normalizedColor);
    setError('');
    setIsPopoverOpen(false);
  };

  const handleHexInputBlur = () => {
    const normalizedHex = hexInput.toUpperCase();
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;

    if (hexRegex.test(normalizedHex)) {
      onChange(normalizedHex);
      setError('');
    } else {
      setError('Invalid hex format. Use #RRGGBB (e.g., #3B82F6)');
      // Auto-clear error after 2 seconds
      setTimeout(() => {
        setError('');
      }, 2000);
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          title="Click to select a color"
        >
          <div
            className="h-6 w-6 rounded border border-gray-300 mr-2"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs text-muted-foreground">
            {value.toUpperCase()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-4">
        <div className="space-y-4">
          {/* Preset Colors Grid */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetColorClick(color)}
                className="h-8 w-8 rounded border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: color,
                  borderColor: value.toUpperCase() === color ? '#000' : '#ccc',
                }}
                title={color}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>

          {/* Separator */}
          <Separator />

          {/* Manual Hex Input */}
          <div className="space-y-2">
            <label htmlFor="hex-input" className="text-xs font-medium">
              Hex:
            </label>
            <Input
              id="hex-input"
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              placeholder="#3B82F6"
              className="text-xs"
            />
            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
