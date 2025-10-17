import { Order, OrderStatus } from '@/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statusColors = {
  PLACED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-amber-100 text-amber-800',
  READY: 'bg-green-100 text-green-800',
  SERVED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const OrderCard = ({ order, onUpdateStatus }: Props) => {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">Table {order.tableLabel}</h3>
          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
        </div>
        <Badge className={statusColors[order.status]}>{order.status}</Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-medium">{item.quantity}x</span> {item.item.name}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
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
      </div>
    </Card>
  );
};
