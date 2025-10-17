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
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <div className="aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-purple-600">€{item.price.toFixed(2)}</span>
          <Button
            size="sm"
            onClick={() => onAdd(item)}
            disabled={!item.available}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('menu.add_to_cart')}
          </Button>
        </div>
      </div>
    </div>
  );
};
