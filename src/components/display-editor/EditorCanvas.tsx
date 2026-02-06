import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Package, CheckCircle, Clock, GripVertical } from 'lucide-react';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { EditableElement } from './EditableElement';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface EditorCanvasProps {
  settings: DisplaySettings;
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  bakeryName?: string;
  categoryName?: string;
  onReorderCustomers?: (reorderedIds: string[]) => void;
}

// Mock data for preview
const MOCK_CUSTOMERS = [
  {
    id: '1',
    name: 'Coop Extra Majorstuen',
    customer_number: '10042',
    orders: [
      { product: 'Grovbrød', quantity: 12, packed: true },
      { product: 'Loff', quantity: 8, packed: true },
      { product: 'Kanelboller', quantity: 24, packed: false },
    ],
  },
  {
    id: '2',
    name: 'Rema 1000 Bislett',
    customer_number: '10043',
    orders: [
      { product: 'Rundstykker', quantity: 48, packed: true },
      { product: 'Focaccia', quantity: 6, packed: false },
    ],
  },
  {
    id: '3',
    name: 'Joker Frogner',
    customer_number: '10044',
    orders: [
      { product: 'Croissant', quantity: 18, packed: false },
      { product: 'Pain au chocolat', quantity: 12, packed: false },
      { product: 'Baguette', quantity: 10, packed: false },
    ],
  },
  {
    id: '4',
    name: 'Kiwi Grünerløkka',
    customer_number: '10045',
    orders: [
      { product: 'Hvitbrød', quantity: 20, packed: true },
      { product: 'Formkake', quantity: 4, packed: true },
    ],
  },
];

export function EditorCanvas({
  settings,
  selectedElement,
  onSelectElement,
  bakeryName = 'Ditt Bakeri',
  categoryName = 'Kategorinavn',
  onReorderCustomers,
}: EditorCanvasProps) {
  const [customerOrder, setCustomerOrder] = useState(MOCK_CUSTOMERS.map(c => c.id));

  const handleReorder = (newOrder: string[]) => {
    setCustomerOrder(newOrder);
    onReorderCustomers?.(newOrder);
  };

  const now = new Date();
  const formattedTime = settings.header_clock_format === '24h' 
    ? format(now, 'HH:mm')
    : format(now, 'h:mm a');
  const formattedDate = format(now, 'd. MMMM yyyy', { locale: nb });

  const totalOrders = MOCK_CUSTOMERS.reduce((sum, c) => sum + c.orders.length, 0);
  const packedOrders = MOCK_CUSTOMERS.reduce(
    (sum, c) => sum + c.orders.filter(o => o.packed).length, 
    0
  );
  const progress = Math.round((packedOrders / totalOrders) * 100);

  const getGridCols = () => {
    const cols: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    return cols[settings.columns] || 'grid-cols-3';
  };

  return (
    <div 
      className="min-h-screen w-full transition-colors duration-300"
      style={{ 
        backgroundColor: settings.background_color,
        padding: settings.padding,
      }}
      onClick={() => onSelectElement(null)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <EditableElement
            id="header-bakery-name"
            label="Bakerinavn"
            isSelected={selectedElement === 'header-bakery-name'}
            isHidden={!settings.header_show_bakery_name}
            onSelect={() => onSelectElement('header-bakery-name')}
          >
            <h1 
              style={{ 
                fontSize: settings.header_bakery_font_size,
                color: settings.text_color,
              }}
              className="font-bold"
            >
              {bakeryName}
            </h1>
          </EditableElement>
          
          <EditableElement
            id="header-category"
            label="Kategorinavn"
            isSelected={selectedElement === 'header-category'}
            isHidden={!settings.header_show_category_name}
            onSelect={() => onSelectElement('header-category')}
          >
            <span 
              style={{ 
                fontSize: settings.header_category_font_size,
                color: settings.text_color,
              }}
              className="opacity-70"
            >
              {categoryName}
            </span>
          </EditableElement>
        </div>
        
        <div className="flex items-center gap-4">
          <EditableElement
            id="header-clock"
            label="Klokke"
            isSelected={selectedElement === 'header-clock'}
            isHidden={!settings.header_show_clock}
            onSelect={() => onSelectElement('header-clock')}
          >
            <span 
              style={{ 
                fontSize: settings.header_clock_font_size,
                color: settings.text_color,
              }}
              className="font-mono"
            >
              {formattedTime}
            </span>
          </EditableElement>
          
          <EditableElement
            id="header-date"
            label="Dato"
            isSelected={selectedElement === 'header-date'}
            isHidden={!settings.header_show_date}
            onSelect={() => onSelectElement('header-date')}
          >
            <span 
              style={{ 
                fontSize: settings.header_date_font_size,
                color: settings.text_color,
              }}
              className="opacity-70"
            >
              {formattedDate}
            </span>
          </EditableElement>
        </div>
      </div>

      {/* Stats bar */}
      <EditableElement
        id="stats-progress"
        label="Statistikk"
        isSelected={selectedElement === 'stats-progress'}
        isHidden={!settings.stats_show_total_progress && !settings.stats_show_packed_count}
        onSelect={() => onSelectElement('stats-progress')}
        className="mb-6"
      >
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: settings.card_background_color }}
        >
          <div className="flex items-center justify-between">
            {settings.stats_show_total_progress && (
              <div className="flex-1">
                <div 
                  className="text-sm opacity-70 mb-1"
                  style={{ 
                    color: settings.text_color,
                    fontSize: settings.stats_label_font_size,
                  }}
                >
                  Total fremdrift
                </div>
                <div 
                  className="font-bold"
                  style={{ 
                    color: settings.text_color,
                    fontSize: settings.stats_value_font_size,
                  }}
                >
                  {progress}%
                </div>
                {settings.stats_progress_bar_style === 'bar' && (
                  <div 
                    className="mt-2 rounded-full overflow-hidden"
                    style={{ 
                      backgroundColor: `${settings.text_color}20`,
                      height: settings.stats_progress_bar_height,
                    }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: settings.completed_color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {settings.stats_show_packed_count && (
              <div className="text-center px-6">
                <div 
                  className="text-sm opacity-70"
                  style={{ 
                    color: settings.text_color,
                    fontSize: settings.stats_label_font_size,
                  }}
                >
                  Pakket
                </div>
                <div 
                  className="font-bold"
                  style={{ 
                    color: settings.completed_color,
                    fontSize: settings.stats_value_font_size,
                  }}
                >
                  {packedOrders}/{totalOrders}
                </div>
              </div>
            )}
            
            {settings.stats_show_remaining_count && (
              <div className="text-center px-6">
                <div 
                  className="text-sm opacity-70"
                  style={{ 
                    color: settings.text_color,
                    fontSize: settings.stats_label_font_size,
                  }}
                >
                  Gjenstår
                </div>
                <div 
                  className="font-bold"
                  style={{ 
                    color: settings.pending_color,
                    fontSize: settings.stats_value_font_size,
                  }}
                >
                  {totalOrders - packedOrders}
                </div>
              </div>
            )}
          </div>
        </div>
      </EditableElement>

      {/* Customer grid */}
      <EditableElement
        id="layout-grid"
        label="Rutenett"
        isSelected={selectedElement === 'layout-grid'}
        onSelect={() => onSelectElement('layout-grid')}
      >
        <Reorder.Group 
          axis="y"
          values={customerOrder}
          onReorder={handleReorder}
          className={`grid ${getGridCols()}`}
          style={{ gap: settings.gap_size }}
        >
          {customerOrder.map((customerId) => {
            const customer = MOCK_CUSTOMERS.find(c => c.id === customerId);
            if (!customer) return null;

            const customerPacked = customer.orders.filter(o => o.packed).length;
            const customerTotal = customer.orders.length;
            const customerProgress = Math.round((customerPacked / customerTotal) * 100);
            const isComplete = customerProgress === 100;

            return (
              <Reorder.Item 
                key={customer.id}
                value={customer.id}
                className="relative group cursor-grab active:cursor-grabbing"
              >
                <EditableElement
                  id={`card-${customer.id}`}
                  label="Kundekort"
                  isSelected={selectedElement === `card-${customer.id}` || selectedElement === 'layout-card'}
                  onSelect={() => onSelectElement('layout-card')}
                >
                  <div className="relative">
                    {/* Drag handle */}
                    <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical 
                        className="h-5 w-5" 
                        style={{ color: settings.text_color }}
                      />
                    </div>

                    <motion.div
                      className="p-4 transition-all"
                      style={{
                        backgroundColor: settings.card_background_color,
                        borderRadius: settings.border_radius,
                        borderLeft: `${settings.card_border_width} solid ${isComplete ? settings.completed_color : settings.pending_color}`,
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {/* Customer header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 
                            style={{ 
                              color: settings.text_color,
                              fontSize: settings.card_customer_name_font_size,
                            }}
                            className="font-semibold"
                          >
                            {customer.name}
                          </h3>
                          {settings.card_show_customer_number && (
                            <span 
                              className="text-sm opacity-50"
                              style={{ color: settings.text_color }}
                            >
                              #{customer.customer_number}
                            </span>
                          )}
                        </div>
                        
                        {isComplete ? (
                          <CheckCircle 
                            className="h-5 w-5"
                            style={{ color: settings.completed_color }}
                          />
                        ) : (
                          <Clock 
                            className="h-5 w-5 opacity-50"
                            style={{ color: settings.pending_color }}
                          />
                        )}
                      </div>
                      
                      {/* Products */}
                      {settings.card_show_product_list && (
                        <div className="space-y-1 mb-3">
                          {customer.orders.map((order, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between"
                              style={{
                                opacity: order.packed ? 0.5 : 1,
                                textDecoration: order.packed ? 'line-through' : 'none',
                              }}
                            >
                              <span 
                                style={{ 
                                  color: settings.text_color,
                                  fontSize: settings.card_product_font_size,
                                }}
                              >
                                {order.product}
                              </span>
                              <span 
                                style={{ 
                                  color: settings.text_color,
                                  fontSize: settings.card_quantity_font_size,
                                }}
                                className="font-mono"
                              >
                                {order.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Progress */}
                      {settings.card_show_individual_progress && (
                        <div 
                          className="flex items-center gap-2"
                          style={{ fontSize: settings.card_progress_font_size }}
                        >
                          <div 
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: `${settings.text_color}20` }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${customerProgress}%`,
                                backgroundColor: isComplete ? settings.completed_color : settings.packing_color,
                              }}
                            />
                          </div>
                          <span style={{ color: settings.text_color }}>
                            {customerPacked}/{customerTotal}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </EditableElement>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </EditableElement>
    </div>
  );
}
