'use client';

import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface InstructionsSectionProps {
  value: string;
  onChange: (value: string) => void;
  saveToLocalStorage: boolean;
  onSaveToggle: (save: boolean) => void;
}

export function InstructionsSection({
  value,
  onChange,
  saveToLocalStorage,
  onSaveToggle,
}: InstructionsSectionProps) {
  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional specific instructions for generating your performance review. For example: 'Focus on leadership contributions' or 'Highlight cross-team collaboration'"
        className="min-h-[150px] resize-y"
        aria-label="Review generation instructions"
      />

      <div className="flex items-center gap-2">
        <Checkbox
          id="save-instructions"
          checked={saveToLocalStorage}
          onCheckedChange={(checked) => onSaveToggle(checked === true)}
        />
        <Label htmlFor="save-instructions" className="cursor-pointer">
          Save these instructions for future reviews
        </Label>
      </div>
    </div>
  );
}
