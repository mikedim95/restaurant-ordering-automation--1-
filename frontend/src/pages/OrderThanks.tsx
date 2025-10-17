import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function OrderThanks() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Order Placed!</h1>
        <p className="text-gray-600 mb-2">Your order has been sent to the kitchen.</p>
        <p className="text-sm text-gray-500 mb-8">Order ID: {orderId}</p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-purple-800">
            🔔 You'll receive a notification when your order is ready!
          </p>
        </div>
        <Button onClick={() => navigate(-1)} className="w-full">
          Back to Menu
        </Button>
      </div>
    </div>
  );
}
