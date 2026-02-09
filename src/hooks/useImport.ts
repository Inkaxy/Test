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

function toLocalDateString(date: Date): string {
  // Avoid timezone drift from toISOString() when we treat dates as date-only.
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface ImportData {
  products: ParsedProduct[];
  customers: ParsedCustomer[];
  orders: ParsedOrder[];
  deliveryDate: Date;
  categoryId: string;
  tripId?: string;
}

interface ImportResult {
  productsCreated: number;
  productsUpdated: number;
  customersCreated: number;
  customersUpdated: number;
  ordersCreated: number;
  orderProductsCreated: number;
  skippedOrders: number;
  skippedMissingCustomer: number;
  skippedMissingProduct: number;
  skippedDuplicate: number;
  batchId: string;
}

export function useImport() {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  const parseFiles = async (files: File[]): Promise<{
    data: Omit<ImportData, 'deliveryDate' | 'categoryId'> & { deliveryDate: Date | null };
    errors: string[];
  }> => {
    const products: ParsedProduct[] = [];
    const customers: ParsedCustomer[] = [];
    const orders: ParsedOrder[] = [];
    const errors: string[] = [];
    let deliveryDate: Date | null = null;
    
    // Sort files in correct processing order: PRD first, then CUS, then OD0
    const FILE_ORDER: Record<string, number> = { prd: 0, cus: 1, od0: 2 };
    const sortedFiles = [...files].sort((a, b) => {
      const extA = a.name.split('.').pop()?.toLowerCase() || '';
      const extB = b.name.split('.').pop()?.toLowerCase() || '';
      return (FILE_ORDER[extA] ?? 99) - (FILE_ORDER[extB] ?? 99);
    });
    
    for (const file of sortedFiles) {
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
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) {
        throw new Error('Ingen bakeri valgt. Kontakt administrator.');
      }
      
      const deliveryDateStr = toLocalDateString(data.deliveryDate);
      
      // Check for duplicate import (same bakery + date + category + trip)
      let duplicateQuery = supabase
        .from('import_batches')
        .select('id')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDateStr)
        .eq('category_id', data.categoryId);
      
      if (data.tripId) {
        duplicateQuery = duplicateQuery.eq('trip_id', data.tripId);
      } else {
        duplicateQuery = duplicateQuery.is('trip_id', null);
      }
      
      const { data: existingBatch } = await duplicateQuery.maybeSingle();
      
      if (existingBatch) {
        throw new Error(`Data for ${deliveryDateStr} er allerede importert til denne kategorien${data.tripId ? ' og turen' : ''}. Slett eksisterende import først.`);
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
      
      // Fetch default category and existing data in parallel
      // Build existing orders query with trip_id filter
      let existingOrdersQuery = supabase
        .from('orders')
        .select('id, customer_id, product_id, delivery_date, category_id')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDateStr)
        .eq('category_id', data.categoryId)
        .not('category_id', 'is', null);
      
      if (data.tripId) {
        existingOrdersQuery = existingOrdersQuery.eq('trip_id', data.tripId);
      } else {
        existingOrdersQuery = existingOrdersQuery.is('trip_id', null);
      }
      
      const [
        { data: defaultCategory },
        { data: existingProducts },
        { data: existingCustomers },
        { data: existingOrders }
      ] = await Promise.all([
        supabase
          .from('categories')
          .select('id')
          .eq('bakery_id', bakeryId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('products')
          .select('id, product_number')
          .eq('bakery_id', bakeryId),
        supabase
          .from('customers')
          .select('id, customer_number')
          .eq('bakery_id', bakeryId),
        existingOrdersQuery
      ]);
      
      const defaultCategoryId = defaultCategory?.id || null;
      
      // Build maps for existing products/customers
      const existingProductMap = new Map<string, string>();
      existingProducts?.forEach(p => existingProductMap.set(p.product_number, p.id));
      
      const existingCustomerMap = new Map<string, string>();
      existingCustomers?.forEach(c => existingCustomerMap.set(c.customer_number, c.id));
      
      // Build set of existing order keys for quick duplicate check
      const existingOrderKeys = new Set<string>();
      existingOrders?.forEach(o => {
        existingOrderKeys.add(`${o.customer_id}:${o.product_id}`);
      });
      
      // Separate products into new vs existing for batch operations
      const productsToInsert: Array<{
        bakery_id: string;
        product_number: string;
        name: string;
        category_id: string | null;
      }> = [];
      const productsToUpdate: Array<{ id: string; name: string }> = [];
      
      for (const product of data.products) {
        const existingId = existingProductMap.get(product.productNumber);
        if (existingId) {
          productsToUpdate.push({ id: existingId, name: product.name });
          productMap.set(product.productNumber, existingId);
          productsUpdated++;
        } else {
          productsToInsert.push({
            bakery_id: bakeryId,
            product_number: product.productNumber,
            name: product.name,
            category_id: defaultCategoryId,
          });
        }
      }
      
      // Batch insert new products
      if (productsToInsert.length > 0) {
        const { data: newProducts } = await supabase
          .from('products')
          .insert(productsToInsert)
          .select('id, product_number');
        
        newProducts?.forEach(p => {
          productMap.set(p.product_number, p.id);
          productsCreated++;
        });
      }
      
      // Batch update existing products (in chunks to avoid too large queries)
      if (productsToUpdate.length > 0) {
        await Promise.all(
          productsToUpdate.map(p => 
            supabase
              .from('products')
              .update({ name: p.name, is_active: true })
              .eq('id', p.id)
          )
        );
      }
      
      // Separate customers into new vs existing for batch operations
      const customersToInsert: Array<{
        bakery_id: string;
        customer_number: string;
        name: string;
        address: string | null;
      }> = [];
      const customersToUpdate: Array<{ id: string; name: string; address: string | null }> = [];
      
      for (const customer of data.customers) {
        const existingId = existingCustomerMap.get(customer.customerNumber);
        if (existingId) {
          customersToUpdate.push({ 
            id: existingId, 
            name: customer.name, 
            address: customer.address 
          });
          customerMap.set(customer.customerNumber, existingId);
          customersUpdated++;
        } else {
          customersToInsert.push({
            bakery_id: bakeryId,
            customer_number: customer.customerNumber,
            name: customer.name,
            address: customer.address,
          });
        }
      }
      
      // Batch insert new customers
      if (customersToInsert.length > 0) {
        const { data: newCustomers } = await supabase
          .from('customers')
          .insert(customersToInsert)
          .select('id, customer_number');
        
        newCustomers?.forEach(c => {
          customerMap.set(c.customer_number, c.id);
          customersCreated++;
        });
      }
      
      // Batch update existing customers
      if (customersToUpdate.length > 0) {
        await Promise.all(
          customersToUpdate.map(c => 
            supabase
              .from('customers')
              .update({ name: c.name, address: c.address, is_active: true })
              .eq('id', c.id)
          )
        );
      }
      
      // Add remaining products/customers to maps
      existingProducts?.forEach(p => {
        if (!productMap.has(p.product_number)) {
          productMap.set(p.product_number, p.id);
        }
      });
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
          trip_id: data.tripId || null,
          products_count: productsCreated + productsUpdated,
          customers_count: customersCreated + customersUpdated,
          orders_count: data.orders.length,
        })
        .select('id')
        .single();
      
      if (batchError || !batch) {
        throw new Error('Kunne ikke opprette import-batch');
      }
      
      // Prepare all orders for batch insert
      const ordersToInsert: Array<{
        bakery_id: string;
        product_id: string;
        customer_id: string;
        quantity: number;
        delivery_date: string;
        import_batch_id: string;
        category_id: string;
        trip_id: string | null;
      }> = [];
      
      for (const order of data.orders) {
        const customerId = customerMap.get(order.customerNumber);
        
        if (!customerId) {
          console.warn(`Hopper over ordre: kunde ${order.customerNumber} ikke funnet`);
          skippedOrders++;
          continue;
        }
        
        for (const orderProduct of order.products) {
          const productId = productMap.get(orderProduct.productNumber);
          
          if (!productId) {
            console.warn(`Hopper over ordrelinje: produkt ${orderProduct.productNumber} ikke funnet`);
            continue;
          }
          
          // Check for duplicate using our pre-fetched set
          const orderKey = `${customerId}:${productId}`;
          if (existingOrderKeys.has(orderKey)) {
            console.log(`Duplikat ordre: kunde ${order.customerNumber}, produkt ${orderProduct.productNumber}`);
            continue;
          }
          
          // Add to set to prevent duplicates within same import
          existingOrderKeys.add(orderKey);
          
          ordersToInsert.push({
            bakery_id: bakeryId,
            product_id: productId,
            customer_id: customerId,
            quantity: orderProduct.quantity,
            delivery_date: order.deliveryDate,
            import_batch_id: batch.id,
            category_id: data.categoryId,
            trip_id: data.tripId || null,
          });
        }
      }
      
      // Batch insert orders in chunks of 500
      const CHUNK_SIZE = 500;
      const createdOrderIds: string[] = [];
      
      for (let i = 0; i < ordersToInsert.length; i += CHUNK_SIZE) {
        const chunk = ordersToInsert.slice(i, i + CHUNK_SIZE);
        const { data: newOrders, error: orderError } = await supabase
          .from('orders')
          .insert(chunk)
          .select('id');
        
        if (orderError) {
          console.error(`Feil ved batch-innsetting av ordrer:`, orderError);
          continue;
        }
        
        if (newOrders) {
          createdOrderIds.push(...newOrders.map(o => o.id));
        }
      }
      
      ordersCreated = createdOrderIds.length;
      orderProductsCreated = createdOrderIds.length;
      
      // Batch insert packing_status for all orders
      if (createdOrderIds.length > 0) {
        const packingStatusToInsert = createdOrderIds.map(orderId => ({
          order_id: orderId,
          status: 'pending' as const,
        }));
        
        for (let i = 0; i < packingStatusToInsert.length; i += CHUNK_SIZE) {
          const chunk = packingStatusToInsert.slice(i, i + CHUNK_SIZE);
          await supabase.from('packing_status').insert(chunk);
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
