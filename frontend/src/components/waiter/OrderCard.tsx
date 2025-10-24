import { Order, OrderStatus } from '@/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  mode?: 'full' | 'waiter'; // waiter: only READY -> SERVED
}

const statusColors = {
  PLACED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-amber-100 text-amber-800',
  READY: 'bg-green-100 text-green-800',
  SERVED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
} as const;

const borderColors = {
  PLACED: 'border-l-4 border-blue-500',
  PREPARING: 'border-l-4 border-amber-500',
  READY: 'border-l-4 border-green-500',
  SERVED: 'border-l-4 border-gray-400',
  CANCELLED: 'border-l-4 border-red-500',
} as const;

export const OrderCard = ({ order, onUpdateStatus, mode = 'full' }: Props) => {
  const border = borderColors[order.status] || '';
  return (
    <Card className={`p-4 ${border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">Table {order.tableLabel}</h3>
          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
        </div>
        <Badge className={statusColors[order.status]}>{order.status}</Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        {(order.items || []).filter(Boolean).map((ci: any, idx: number) => {
          const qty = ci?.quantity ?? ci?.qty ?? 1;
          const name = ci?.item?.name ?? ci?.name ?? 'Item';
          return (
            <div key={idx} className="text-sm">
              <span className="font-medium">{qty}x</span> {name}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {mode === 'full' ? (
          <>
            {order.status === 'PLACED' && (
              <Button size="sm" onClick={() => onUpdateStatus(order.id, 'PREPARING')} className="flex-1">
                Start Preparing
              </Button>
            )}
            {order.status === 'PREPARING' && (
              <Button size="sm" onClick={() => onUpdateStatus(order.id, 'READY')} className="flex-1">
                Mark Ready
              </Button>
            )}
            {order.status === 'READY' && (
              <Button size="sm" onClick={() => onUpdateStatus(order.id, 'SERVED')} className="flex-1">
                Mark Served
              </Button>
            )}
          </>
        ) : (
          <>
            {order.status === 'READY' && (
              <Button size="sm" onClick={() => onUpdateStatus(order.id, 'SERVED')} className="flex-1">
                Mark Served
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
