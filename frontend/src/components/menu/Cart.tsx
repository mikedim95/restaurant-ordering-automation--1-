import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import { Button } from '../ui/button';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';

export const Cart = ({ onCheckout }: { onCheckout: () => void }) => {
  const { t } = useTranslation();
  const { items, removeItem, getTotal } = useCartStore();

  return (
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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('menu.cart')}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <>
              {items.map((cartItem, idx) => (
                <div key={idx} className="flex items-center gap-3 pb-3 border-b">
                  <img src={cartItem.item.image} alt={cartItem.item.name} className="w-16 h-16 rounded object-cover" />
                  <div className="flex-1">
                    <h4 className="font-medium">{cartItem.item.name}</h4>
                    <p className="text-sm text-gray-500">Qty: {cartItem.quantity}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(cartItem.item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="pt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('menu.total')}</span>
                  <span>€{getTotal().toFixed(2)}</span>
                </div>
                <Button className="w-full" onClick={onCheckout}>
                  {t('menu.checkout')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
