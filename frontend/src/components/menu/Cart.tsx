import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import { Button } from '../ui/button';
import { Loader2, CheckCircle2, ShoppingCart, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { ModifierDialog } from '@/components/menu/ModifierDialog';
import type { MenuItem } from '@/types';
import { api } from '@/lib/api';

const computeOrderTotal = (order: any) => {
  if (!order) return 0;
  if (typeof order.total === 'number') return order.total;
  if (typeof order.totalCents === 'number') return order.totalCents / 100;
  return 0;
};

const formatOrderTime = (order: any) => {
  const ts = order?.createdAt ? new Date(order.createdAt) : new Date();
  return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const Cart = ({ onCheckout }: { onCheckout: (note?: string) => Promise<any> }) => {
  const { t } = useTranslation();
  const { items, removeItem, getTotal } = useCartStore();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const [queueAhead, setQueueAhead] = useState<number | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [submittedAhead, setSubmittedAhead] = useState<number | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyIndex, setModifyIndex] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState<Record<number, number>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (reviewOpen && items.length > 0) {
      setQueueLoading(true);
      setQueueError(null);
      api
        .getOrderQueueSummary()
        .then((res: any) => {
          if (!active) return;
          const ahead = Number(res?.ahead ?? 0);
          setQueueAhead(Number.isFinite(ahead) ? ahead : 0);
        })
        .catch((err: any) => {
          if (!active) return;
          setQueueError(err?.message || 'Unable to load queue');
          setQueueAhead(null);
        })
        .finally(() => {
          if (active) setQueueLoading(false);
        });
    } else {
      setQueueAhead(null);
      setQueueError(null);
    }
    return () => {
      active = false;
    };
  }, [reviewOpen, items.length]);

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
                    <div className="absolute right-0 top-0 h-full flex gap-2 pr-3 items-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="my-2"
                        onClick={() => {
                          setModifyIndex(idx);
                          setModifyOpen(true);
                        }}
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
                    <div
                      className="flex items-center gap-3 py-3 border-b bg-card/50 backdrop-blur-sm px-3 rounded-lg transition-shadow hover:shadow-md"
                      style={{
                        transform: `translateX(${swipeX[idx] || 0}px)`,
                        transition: touchStart ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onTouchStart={(e) => {
                        setTouchStart(e.touches[0].clientX);
                      }}
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
                            const mod = cartItem.item.modifiers?.find((m) => m.id === modId);
                            const opt = mod?.options.find((o) => o.id === optId);
                            return (
                              <div key={modId}>
                                {mod?.name}: {opt?.label}
                              </div>
                            );
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
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Priority number</p>
                <p className="text-xs text-muted-foreground">Orders ahead (PLACED / PREPARING)</p>
              </div>
              <div className="flex items-center gap-2">
                {queueLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : queueError ? (
                  <span className="text-xs text-destructive max-w-[140px] text-right">{queueError}</span>
                ) : (
                  <span className="text-2xl font-bold text-primary">{queueAhead ?? 0}</span>
                )}
              </div>
            </div>

            {items.map((cartItem, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b">
                <img src={cartItem.item.image} alt={cartItem.item.name} className="w-14 h-14 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-medium">
                    {cartItem.item.name} — {cartItem.quantity}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Object.entries(cartItem.selectedModifiers || {}).map(([modId, optId]) => {
                      const mod = cartItem.item.modifiers?.find((m) => m.id === modId);
                      const opt = mod?.options.find((o) => o.id === optId);
                      return (
                        <div key={modId}>
                          {mod?.name}: {opt?.label}
                        </div>
                      );
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
            <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={placing}>
              Back
            </Button>
            <Button
              onClick={async () => {
                try {
                  setPlacing(true);
                  const result = await onCheckout(note || undefined);
                  const aheadValue = queueAhead ?? 0;
                  setReviewOpen(false);
                  setQueueAhead(null);
                  setNote('');
                  if (result) {
                    setSubmittedAhead(aheadValue);
                    setSubmittedOrder(result);
                    setSuccessOpen(true);
                  }
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

      <Dialog open={successOpen} onOpenChange={(open) => {
        setSuccessOpen(open);
        if (!open) {
          setSubmittedOrder(null);
          setSubmittedAhead(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Order submitted</h2>
              <p className="text-sm text-muted-foreground">
                Your order is on its way to the kitchen. Priority number: {submittedAhead ?? queueAhead ?? 0}
              </p>
            </div>
          </div>

          {submittedOrder ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-semibold">{(submittedOrder.id || '').slice(-6)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Placed</span>
                  <span className="font-medium">{formatOrderTime(submittedOrder)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">€{computeOrderTotal(submittedOrder).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {(submittedOrder.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {item?.title ?? item?.item?.name ?? `Item ${idx + 1}`}
                    </span>
                    <span className="text-muted-foreground">×{item?.quantity ?? item?.qty ?? 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setSuccessOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModifierDialog
        open={modifyOpen}
        item={modifyIndex != null ? (items[modifyIndex]?.item as unknown as MenuItem) : null}
        initialSelected={modifyIndex != null ? items[modifyIndex]?.selectedModifiers : undefined}
        onClose={() => {
          setModifyOpen(false);
          setModifyIndex(null);
        }}
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


