import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { 
  ParsedProduct, 
  ParsedCustomer, 
  ParsedOrder,
  parsePrdFile,
  parseCusFile,
  parseOd0File,
  readFileAsText,
  extractDateFromFilename 
} from '@/lib/fileParser';

interface ImportData {
  products: ParsedProduct[];
  customers: ParsedCustomer[];
  orders: ParsedOrder[];
  deliveryDate: Date;
  categoryId: string;
}

interface ImportResult {
  productsCreated: number;
  productsUpdated: number;
  customersCreated: number;
  customersUpdated: number;
  ordersCreated: number;
  orderProductsCreated: number;
  skippedOrders: number;
  batchId: string;
}

export function useImport() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  const parseFiles = async (files: File[]): Promise<{
    data: Omit<ImportData, 'deliveryDate' | 'categoryId'> & { deliveryDate: Date | null };
    errors: string[];
  }> => {
    const products: ParsedProduct[] = [];
    const customers: ParsedCustomer[] = [];
    const orders: ParsedOrder[] = [];
    const errors: string[] = [];
    let deliveryDate: Date | null = null;
    
    for (const file of files) {
      const content = await readFileAsText(file);
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      // Try to extract date from any file
      const fileDate = extractDateFromFilename(file.name);
      if (fileDate && !deliveryDate) {
        deliveryDate = fileDate;
      }
      
      switch (ext) {
        case 'prd': {
          const result = parsePrdFile(content);
          products.push(...result.products);
          errors.push(...result.errors.map(e => `${file.name}: ${e}`));
          break;
        }
        case 'cus': {
          const result = parseCusFile(content);
          customers.push(...result.customers);
          errors.push(...result.errors.map(e => `${file.name}: ${e}`));
          break;
        }
        case 'od0': {
          const result = parseOd0File(content);
          orders.push(...result.orders);
          errors.push(...result.errors.map(e => `${file.name}: ${e}`));
          
          // Extract delivery date from first order if not found in filename
          if (!deliveryDate && result.orders.length > 0) {
            const firstOrderDate = result.orders[0].deliveryDate;
            deliveryDate = new Date(firstOrderDate);
          }
          break;
        }
      }
    }
    
    return {
      data: { products, customers, orders, deliveryDate },
      errors
    };
  };
  
  const importMutation = useMutation({
    mutationFn: async (data: ImportData): Promise<ImportResult> => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) {
        throw new Error('Ingen bakeri valgt. Kontakt administrator.');
      }
      
      const deliveryDateStr = data.deliveryDate.toISOString().split('T')[0];
      
      // Check for duplicate import (same bakery + date + category)
      const { data: existingBatch } = await supabase
        .from('import_batches')
        .select('id')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDateStr)
        .eq('category_id', data.categoryId)
        .maybeSingle();
      
      if (existingBatch) {
        throw new Error(`Data for ${deliveryDateStr} er allerede importert til denne kategorien. Slett eksisterende import først.`);
      }
      
      let productsCreated = 0;
      let productsUpdated = 0;
      let customersCreated = 0;
      let customersUpdated = 0;
      let ordersCreated = 0;
      let orderProductsCreated = 0;
      let skippedOrders = 0;
      
      // Map to store product_number -> product_id
      const productMap = new Map<string, string>();
      const customerMap = new Map<string, string>();
      
      // Fetch default category for the bakery (first active category)
      const { data: defaultCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('bakery_id', bakeryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      const defaultCategoryId = defaultCategory?.id || null;
      
      // Upsert products
      for (const product of data.products) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('bakery_id', bakeryId)
          .eq('product_number', product.productNumber)
          .maybeSingle();
        
        if (existing) {
          await supabase
            .from('products')
            .update({ name: product.name, is_active: true })
            .eq('id', existing.id);
          productMap.set(product.productNumber, existing.id);
          productsUpdated++;
        } else {
          const { data: newProduct } = await supabase
            .from('products')
            .insert({
              bakery_id: bakeryId,
              product_number: product.productNumber,
              name: product.name,
              category_id: defaultCategoryId,
            })
            .select('id')
            .single();
          
          if (newProduct) {
            productMap.set(product.productNumber, newProduct.id);
            productsCreated++;
          }
        }
      }
      
      // Upsert customers
      for (const customer of data.customers) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('bakery_id', bakeryId)
          .eq('customer_number', customer.customerNumber)
          .maybeSingle();
        
        if (existing) {
          await supabase
            .from('customers')
            .update({ 
              name: customer.name, 
              address: customer.address,
              is_active: true 
            })
            .eq('id', existing.id);
          customerMap.set(customer.customerNumber, existing.id);
          customersUpdated++;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              bakery_id: bakeryId,
              customer_number: customer.customerNumber,
              name: customer.name,
              address: customer.address,
            })
            .select('id')
            .single();
          
          if (newCustomer) {
            customerMap.set(customer.customerNumber, newCustomer.id);
            customersCreated++;
          }
        }
      }
      
      // Load existing products/customers for order matching if not in import
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, product_number')
        .eq('bakery_id', bakeryId);
      
      existingProducts?.forEach(p => {
        if (!productMap.has(p.product_number)) {
          productMap.set(p.product_number, p.id);
        }
      });
      
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, customer_number')
        .eq('bakery_id', bakeryId);
      
      existingCustomers?.forEach(c => {
        if (!customerMap.has(c.customer_number)) {
          customerMap.set(c.customer_number, c.id);
        }
      });
      
      // Create import batch
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          bakery_id: bakeryId,
          delivery_date: deliveryDateStr,
          category_id: data.categoryId,
          products_count: productsCreated + productsUpdated,
          customers_count: customersCreated + customersUpdated,
          orders_count: data.orders.length,
        })
        .select('id')
        .single();
      
      if (batchError || !batch) {
        throw new Error('Kunne ikke opprette import-batch');
      }
      
      // Process aggregated orders
      for (const order of data.orders) {
        const customerId = customerMap.get(order.customerNumber);
        
        if (!customerId) {
          console.warn(`Hopper over ordre: kunde ${order.customerNumber} ikke funnet`);
          skippedOrders++;
          continue;
        }
        
        // Create order rows for each product in the aggregated order
        for (const orderProduct of order.products) {
          const productId = productMap.get(orderProduct.productNumber);
          
          if (!productId) {
            console.warn(`Hopper over ordrelinje: produkt ${orderProduct.productNumber} ikke funnet`);
            continue;
          }
          
          // Check for existing order with same product/customer/date/category
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('bakery_id', bakeryId)
            .eq('customer_id', customerId)
            .eq('product_id', productId)
            .eq('delivery_date', order.deliveryDate)
            .eq('category_id', data.categoryId)
            .maybeSingle();
          
          if (existingOrder) {
            console.log(`Duplikat ordre: kunde ${order.customerNumber}, produkt ${orderProduct.productNumber}, dato ${order.deliveryDate}, kategori ${data.categoryId}`);
            continue;
          }
          
          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
              bakery_id: bakeryId,
              product_id: productId,
              customer_id: customerId,
              quantity: orderProduct.quantity,
              delivery_date: order.deliveryDate,
              import_batch_id: batch.id,
              category_id: data.categoryId,
            })
            .select('id')
            .single();
          
          if (orderError) {
            console.error(`Feil ved oppretting av ordre:`, orderError);
            continue;
          }
          
          if (newOrder) {
            ordersCreated++;
            orderProductsCreated++;
            
            // Create packing_status for the order
            await supabase.from('packing_status').insert({
              order_id: newOrder.id,
              status: 'pending' as const,
            });
          }
        }
      }
      
      return {
        productsCreated,
        productsUpdated,
        customersCreated,
        customersUpdated,
        ordersCreated,
        orderProductsCreated,
        skippedOrders,
        batchId: batch.id,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
  
  return {
    parseFiles,
    importData: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importError: importMutation.error,
  };
}
