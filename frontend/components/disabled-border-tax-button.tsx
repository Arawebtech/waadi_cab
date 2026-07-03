'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ShoppingCart } from 'lucide-react';

interface DisabledBorderTaxButtonProps {
  title: string;
  description: string;
}

export const DisabledBorderTaxButton: React.FC<DisabledBorderTaxButtonProps> = ({
  title,
  description,
}) => {
  return (
    <Card className="mb-6 bg-gray-100 border-gray-200 opacity-75">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="bg-gray-300 p-3 rounded-full flex-shrink-0">
              <ShoppingCart className="h-6 w-6 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-500 mb-1">{title}</h3>
              <p className="text-gray-400 text-sm">{description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400 font-semibold text-sm">5:00 AM</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
