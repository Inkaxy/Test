// File parser for bakery import files (.PRD, .CUS, .OD0)

export interface ParsedProduct {
  productNumber: string;
  name: string;
}

export interface ParsedCustomer {
  customerNumber: string;
  name: string;
  address?: string;
}

export interface ParsedOrder {
  productNumber: string;
  customerNumber: string;
  quantity: number;
}

export interface ParseResult {
  products: ParsedProduct[];
  customers: ParsedCustomer[];
  orders: ParsedOrder[];
  deliveryDate: Date | null;
  errors: string[];
}

/**
 * Parse a .PRD file (Products)
 * Format: VARENR;VARENAVN (semicolon-separated)
 * Example: 101;Grovbrød
 */
export function parsePrdFile(content: string): { products: ParsedProduct[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const products: ParsedProduct[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    // Skip header line if it contains "VARENR" or similar
    if (index === 0 && (line.toLowerCase().includes('varenr') || line.toLowerCase().includes('product'))) {
      return;
    }
    
    const parts = line.split(';');
    if (parts.length >= 2) {
      const productNumber = parts[0].trim();
      const name = parts[1].trim();
      
      if (productNumber && name) {
        products.push({ productNumber, name });
      } else {
        errors.push(`Linje ${index + 1}: Ugyldig format`);
      }
    } else if (line.trim()) {
      errors.push(`Linje ${index + 1}: Mangler skilletegn (;)`);
    }
  });
  
  return { products, errors };
}

/**
 * Parse a .CUS file (Customers)
 * Format: KUNDENR;KUNDENAVN;ADRESSE (semicolon-separated)
 * Example: 1001;Bakergården AS;Storgata 1
 */
export function parseCusFile(content: string): { customers: ParsedCustomer[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const customers: ParsedCustomer[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    // Skip header line
    if (index === 0 && (line.toLowerCase().includes('kundenr') || line.toLowerCase().includes('customer'))) {
      return;
    }
    
    const parts = line.split(';');
    if (parts.length >= 2) {
      const customerNumber = parts[0].trim();
      const name = parts[1].trim();
      const address = parts[2]?.trim() || undefined;
      
      if (customerNumber && name) {
        customers.push({ customerNumber, name, address });
      } else {
        errors.push(`Linje ${index + 1}: Ugyldig format`);
      }
    } else if (line.trim()) {
      errors.push(`Linje ${index + 1}: Mangler skilletegn (;)`);
    }
  });
  
  return { customers, errors };
}

/**
 * Parse a .OD0 file (Orders)
 * Format: VARENR;KUNDENR;ANTALL (semicolon-separated)
 * Example: 101;1001;5
 */
export function parseOd0File(content: string): { orders: ParsedOrder[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const orders: ParsedOrder[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    // Skip header line
    if (index === 0 && (line.toLowerCase().includes('varenr') || line.toLowerCase().includes('product'))) {
      return;
    }
    
    const parts = line.split(';');
    if (parts.length >= 3) {
      const productNumber = parts[0].trim();
      const customerNumber = parts[1].trim();
      const quantity = parseInt(parts[2].trim(), 10);
      
      if (productNumber && customerNumber && !isNaN(quantity) && quantity > 0) {
        orders.push({ productNumber, customerNumber, quantity });
      } else {
        errors.push(`Linje ${index + 1}: Ugyldig format eller antall`);
      }
    } else if (line.trim()) {
      errors.push(`Linje ${index + 1}: Mangler felter (trenger varenr;kundenr;antall)`);
    }
  });
  
  return { orders, errors };
}

/**
 * Extract delivery date from filename
 * Expected format: DD-MM-YYYY.ext or YYYY-MM-DD.ext
 */
export function extractDateFromFilename(filename: string): Date | null {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Try DD-MM-YYYY format
  const ddmmyyyy = nameWithoutExt.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = nameWithoutExt.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Read file content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, 'ISO-8859-1'); // Nordic encoding fallback
  });
}
