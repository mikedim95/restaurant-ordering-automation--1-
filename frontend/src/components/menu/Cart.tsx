import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import { Button } from '../ui/button';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { ModifierDialog } from '@/components/menu/ModifierDialog';
import type { MenuItem } from '@/types';

export const Cart = ({ onCheckout }: { onCheckout: (note?: string) => Promise<void> }) => {
  const { t } = useTranslation();
  const { items, removeItem, getTotal } = useCartStore();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyIndex, setModifyIndex] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState<Record<number, number>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);

  return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed bottom-4 right-4 rounded-full h-14 w-14 shadow-lg">
          <ShoppingCart className="h-6 w-6" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('menu.cart')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <>
              {items.map((cartItem, idx) => (
                <div key={idx} className="relative overflow-hidden select-none rounded-lg">
                  {/* Actions revealed on swipe */}
                  <div className="absolute right-0 top-0 h-full flex gap-2 pr-3 items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="my-2"
                      onClick={() => { setModifyIndex(idx); setModifyOpen(true); }}
                    >
                      Modify
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="my-2"
                      onClick={() => removeItem(cartItem.item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Swipeable content */}
                  <div
                    className="flex items-center gap-3 py-3 border-b bg-card/50 backdrop-blur-sm px-3 rounded-lg transition-shadow hover:shadow-md"
                    style={{ transform: `translateX(${swipeX[idx] || 0}px)`, transition: touchStart ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                    onTouchStart={(e) => { setTouchStart(e.touches[0].clientX); }}
                    onTouchMove={(e) => {
                      if (touchStart == null) return;
                      const dx = e.touches[0].clientX - touchStart;
                      const nx = Math.min(0, Math.max(-120, dx));
                      setSwipeX((s) => ({ ...s, [idx]: nx }));
                    }}
                    onTouchEnd={() => {
                      const current = swipeX[idx] || 0;
                      const snap = current < -60 ? -120 : 0;
                      setSwipeX((s) => ({ ...s, [idx]: snap }));
                      setTouchStart(null);
                    }}
                  >
                    <img src={cartItem.item.image} alt={cartItem.item.name} className="w-16 h-16 rounded object-cover" />
                    <div className="flex-1">
                      <h4 className="font-medium">{cartItem.item.name}</h4>
                      <p className="text-xs text-gray-500">Qty: {cartItem.quantity}</p>
                      <div className="text-xs text-gray-500">
                        {Object.entries(cartItem.selectedModifiers || {}).map(([modId, optId]) => {
                          const mod = cartItem.item.modifiers?.find(m => m.id === modId);
                          const opt = mod?.options.find(o => o.id === optId);
                          return <div key={modId}>{mod?.name}: {opt?.label}</div>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 pb-2 space-y-3">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl px-5 py-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{t('menu.total')}</span>
                    <span className="text-2xl font-bold text-primary">€{getTotal().toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full py-6 text-base rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setReviewOpen(true)}
                >
                  {t('menu.checkout')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review your order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {items.map((cartItem, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b">
              <img src={cartItem.item.image} alt={cartItem.item.name} className="w-14 h-14 rounded object-cover" />
              <div className="flex-1">
                <div className="font-medium">{cartItem.item.name} × {cartItem.quantity}</div>
                <div className="text-xs text-gray-500">
                  {Object.entries(cartItem.selectedModifiers || {}).map(([modId, optId]) => {
                    const mod = cartItem.item.modifiers?.find(m => m.id === modId);
                    const opt = mod?.options.find(o => o.id === optId);
                    return <div key={modId}>{mod?.name}: {opt?.label}</div>;
                  })}
                </div>
              </div>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-2">Order note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., No onions on the salad" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={placing}>Back</Button>
          <Button
            onClick={async () => {
              try {
                setPlacing(true);
                await onCheckout(note || undefined);
                setReviewOpen(false);
              } finally {
                setPlacing(false);
              }
            }}
            disabled={placing}
            className="inline-flex items-center gap-2"
          >
            {placing && <span className="animate-spin h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full" />}
            {placing ? 'Placing…' : 'Place order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modifier edit dialog */}
    <ModifierDialog
      open={modifyOpen}
      item={modifyIndex != null ? (items[modifyIndex]?.item as unknown as MenuItem) : null}
      initialSelected={modifyIndex != null ? items[modifyIndex!]?.selectedModifiers : undefined}
      onClose={() => { setModifyOpen(false); setModifyIndex(null); }}
      onConfirm={(selected) => {
        if (modifyIndex != null) {
          useCartStore.getState().updateItemModifiers(modifyIndex, selected);
        }
        setModifyOpen(false);
        setModifyIndex(null);
      }}
    />
    </>
  );
};
