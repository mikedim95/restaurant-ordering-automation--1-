import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { MenuItem, Modifier } from '@/types';

type SelectionMap = { [modifierId: string]: string };

interface Props {
  open: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onConfirm: (selected: SelectionMap) => void;
}

export const ModifierDialog = ({ open, item, onClose, onConfirm }: Props) => {
  const [selected, setSelected] = useState<SelectionMap>({});

  const effectiveModifiers: Modifier[] = useMemo(() => item?.modifiers || [], [item]);

  const canConfirm = useMemo(() => {
    if (!effectiveModifiers?.length) return true;
    return effectiveModifiers.every((m) => {
      const required = !!m.required || (m.minSelect ?? 0) > 0;
      if (!required) return true;
      return !!selected[m.id];
    });
  }, [effectiveModifiers, selected]);

  const handlePick = (modifierId: string, optionId: string) => {
    setSelected((prev) => ({ ...prev, [modifierId]: optionId }));
  };

  const handleConfirm = () => {
    onConfirm(selected);
    setSelected({});
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? `Customize: ${item.name}` : 'Customize'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {effectiveModifiers?.length ? (
            effectiveModifiers.map((mod) => (
              <div key={mod.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {mod.name}
                    {mod.required || (mod.minSelect ?? 0) > 0 ? (
                      <span className="ml-2 text-xs text-red-500">(required)</span>
                    ) : null}
                  </h4>
                </div>
                <RadioGroup
                  value={selected[mod.id]}
                  onValueChange={(val) => handlePick(mod.id, val)}
                  className="grid grid-cols-1 gap-2"
                >
                  {mod.options.map((opt) => (
                    <Label
                      key={opt.id}
                      htmlFor={`${mod.id}-${opt.id}`}
                      className="flex items-center gap-3 p-3 border rounded cursor-pointer"
                    >
                      <RadioGroupItem id={`${mod.id}-${opt.id}`} value={opt.id} />
                      <span className="flex-1">{opt.label}</span>
                      {opt.priceDelta !== 0 && (
                        <span className="text-sm text-gray-600">{opt.priceDelta > 0 ? '+' : ''}€{opt.priceDelta.toFixed(2)}</span>
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No modifiers available for this item.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>Add to cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

