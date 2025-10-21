import { MenuItem } from '@/types';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export const MenuItemCard = ({ item, onAdd }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow">
      <div className="aspect-[4/3] md:aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
        <p className="text-sm text-gray-600 mb-3 h-10 overflow-hidden">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-purple-600">€{item.price.toFixed(2)}</span>
          <Button
            size="icon"
            onClick={() => onAdd(item)}
            disabled={!item.available}
            className="h-9 w-9 p-0 rounded-full shrink-0"
            aria-label={t('menu.add_to_cart')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
