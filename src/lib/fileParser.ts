// File parser for bakery import files (.PRD, .CUS, .OD0)
// Supports proprietary formats from external bakery systems

import { removeLeadingZeros } from './idUtils';

export interface ParsedProduct {
  productNumber: string;
  name: string;
}

export interface ParsedCustomer {
  customerNumber: string;  // Normalized (no leading zeros)
  originalId: string;      // Original with leading zeros
  name: string;
  address?: string;
  phone?: string;
}

export interface ParsedOrderProduct {
  productNumber: string;   // Normalized (no leading zeros)
  quantity: number;
}

export interface ParsedOrder {
  customerNumber: string;  // Normalized (no leading zeros)
  deliveryDate: string;    // YYYY-MM-DD format
  products: ParsedOrderProduct[];
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
 * Format: product_number product_name [EAN_code] [price]
 * Example: 101 Rundstykker 7045010012345 12.50
 * Example: 1050 Skillingsbolle med rosiner 7045010012347 18.00
 * 
 * Product name ends before first word starting with 4+ digits (EAN code)
 */
export function parsePrdFile(content: string): { products: ParsedProduct[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const products: ParsedProduct[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return;
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('varenr') || 
      trimmedLine.toLowerCase().includes('product') ||
      trimmedLine.toLowerCase().includes('produktnr')
    )) {
      return;
    }
    
    // Split on whitespace
    const parts = trimmedLine.split(/\s+/);
    
    if (parts.length < 2) {
      errors.push(`Linje ${index + 1}: For få felter`);
      return;
    }
    
    // Product number is the first part (keep as-is, no normalization)
    const productNumber = parts[0];
    
    // Find where the product name ends (before first 4+ digit number = EAN)
    let nameEndIndex = parts.length;
    for (let j = 1; j < parts.length; j++) {
      // Check if this part starts with 4+ digits (likely EAN code or price)
      if (/^\d{4,}/.test(parts[j])) {
        nameEndIndex = j;
        break;
      }
      // Also stop at decimal numbers (prices like 12.50)
      if (/^\d+[.,]\d+$/.test(parts[j])) {
        nameEndIndex = j;
        break;
      }
    }
    
    // Product name is everything between product number and EAN/price
    const productName = parts.slice(1, nameEndIndex).join(' ');
    
    if (!productNumber || !productName) {
      errors.push(`Linje ${index + 1}: Mangler produktnummer eller navn`);
      return;
    }
    
    products.push({ 
      productNumber, 
      name: productName 
    });
    
    console.log(`PRD Line ${index + 1}: Parsed product "${productNumber}" - "${productName}"`);
  });
  
  return { products, errors };
}

/**
 * Parse a .CUS file (Customers)
 * 
 * Format A: Standard (4+ space separated)
 * Example: 000123    Bakeri Hansen AS    Storgata 1, Oslo
 * 
 * Format B: Labeled (key-value pairs)
 * Example: kundenummer: 000123 Kundenanv: Bakeri Hansen AS Adresse: Storgata 1 Tlf: 12345678
 * 
 * CRITICAL: Customer numbers are normalized by removing leading zeros
 */
export function parseCusFile(content: string): { customers: ParsedCustomer[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const customers: ParsedCustomer[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return;
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('kundenr') || 
      trimmedLine.toLowerCase().includes('customer') ||
      trimmedLine.toLowerCase().includes('kundenummer')
    )) {
      return;
    }
    
    let originalId: string;
    let customerNumber: string;
    let name: string;
    let address: string | undefined;
    let phone: string | undefined;
    
    // Detect format: labeled vs standard
    if (trimmedLine.toLowerCase().includes('kundenummer:') || 
        trimmedLine.toLowerCase().includes('kundenanv:')) {
      // Format B: Labeled format
      const customerIdMatch = trimmedLine.match(/kundenummer:\s*(\d+)/i);
      const nameMatch = trimmedLine.match(/Kundenanv:\s*(.+?)(?:\s+(?:Adresse|Tlf|$))/i);
      const addressMatch = trimmedLine.match(/Adresse:\s*(.+?)(?:\s+Tlf:|$)/i);
      const phoneMatch = trimmedLine.match(/Tlf:\s*(\d+)/i);
      
      if (!customerIdMatch || !nameMatch) {
        errors.push(`Linje ${index + 1}: Kunne ikke parse labeled format`);
        return;
      }
      
      originalId = customerIdMatch[1];
      customerNumber = removeLeadingZeros(originalId);
      name = nameMatch[1].trim();
      address = addressMatch?.[1]?.trim();
      phone = phoneMatch?.[1];
    } else {
      // Format A: Standard format (split on 4+ spaces)
      const parts = trimmedLine.split(/\s{4,}/);
      
      if (parts.length < 2) {
        // Try splitting on 2+ spaces if 4+ didn't work
        const fallbackParts = trimmedLine.split(/\s{2,}/);
        if (fallbackParts.length >= 2) {
          originalId = fallbackParts[0].trim();
          customerNumber = removeLeadingZeros(originalId);
          name = fallbackParts[1].trim();
          address = fallbackParts[2]?.trim();
        } else {
          errors.push(`Linje ${index + 1}: For få felter (trenger kundenr og navn)`);
          return;
        }
      } else {
        originalId = parts[0].trim();
        customerNumber = removeLeadingZeros(originalId);
        name = parts[1].trim();
        address = parts[2]?.trim();
      }
    }
    
    if (!customerNumber || !name) {
      errors.push(`Linje ${index + 1}: Mangler kundenummer eller navn`);
      return;
    }
    
    customers.push({
      originalId,
      customerNumber,
      name,
      address,
      phone,
    });
    
    console.log(`CUS Line ${index + 1}: Parsed customer "${originalId}" -> "${customerNumber}" - "${name}"`);
  });
  
  return { customers, errors };
}

/**
 * Parse a .OD0 file (Orders)
 * Format: product_id composite_field ignored1 ignored2 date
 * Example: 00101 1000012300050 00000 00000 20260203
 * 
 * Composite field structure:
 * - First 4 digits: prefix (ignored)
 * - Middle digits: customer number
 * - Last 5 digits: quantity
 * 
 * Example: 1000012300050
 *          ├──┤├───┤├───┤
 *          1000 0123 00050
 *          prefix customer qty
 *          (ign) -> 123   -> 50
 * 
 * Orders are aggregated per customer + date
 */
export function parseOd0File(content: string): { orders: ParsedOrder[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  
  // Map to aggregate orders by customer+date
  const orderMap = new Map<string, ParsedOrder>();
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return;
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('varenr') || 
      trimmedLine.toLowerCase().includes('product') ||
      trimmedLine.toLowerCase().includes('ordre')
    )) {
      return;
    }
    
    // Split on whitespace
    const parts = trimmedLine.split(/\s+/);
    
    if (parts.length < 5) {
      errors.push(`Linje ${index + 1}: For få felter (trenger 5 felter)`);
      return;
    }
    
    // Parse product number (first field)
    const productIdRaw = parts[0];
    const productNumber = removeLeadingZeros(productIdRaw);
    
    // Parse composite field (second field)
    const compositeField = parts[1];
    
    if (compositeField.length < 9) {
      errors.push(`Linje ${index + 1}: Kompositfelt for kort (${compositeField.length} tegn, trenger minst 9)`);
      return;
    }
    
    // Remove prefix (first 4 digits)
    const withoutPrefix = compositeField.substring(4);
    
    // Get quantity (last 5 digits)
    const quantityPart = withoutPrefix.slice(-5);
    const quantity = parseInt(removeLeadingZeros(quantityPart), 10);
    
    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Linje ${index + 1}: Ugyldig antall "${quantityPart}"`);
      return;
    }
    
    // Get customer number (middle part)
    const customerPart = withoutPrefix.slice(0, -5);
    const customerNumber = removeLeadingZeros(customerPart);
    
    if (!customerNumber) {
      errors.push(`Linje ${index + 1}: Kunne ikke parse kundenummer fra kompositfelt`);
      return;
    }
    
    // Parse date (fifth field, format: YYYYMMDD)
    const dateStr = parts[4];
    
    if (!/^\d{8}$/.test(dateStr)) {
      errors.push(`Linje ${index + 1}: Ugyldig datoformat "${dateStr}" (forventet YYYYMMDD)`);
      return;
    }
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const deliveryDate = `${year}-${month}-${day}`;
    
    // Validate date
    const dateObj = new Date(deliveryDate);
    if (isNaN(dateObj.getTime())) {
      errors.push(`Linje ${index + 1}: Ugyldig dato "${deliveryDate}"`);
      return;
    }
    
    console.log(`OD0 Line ${index + 1}: Product "${productIdRaw}" -> "${productNumber}", Customer "${customerPart}" -> "${customerNumber}", Qty: ${quantity}, Date: ${deliveryDate}`);
    
    // Aggregate orders per customer + date
    const orderKey = `${customerNumber}-${deliveryDate}`;
    
    if (!orderMap.has(orderKey)) {
      orderMap.set(orderKey, {
        customerNumber,
        deliveryDate,
        products: [],
      });
    }
    
    const order = orderMap.get(orderKey)!;
    
    // Check if this product already exists in the order
    const existingProduct = order.products.find(p => p.productNumber === productNumber);
    if (existingProduct) {
      // Add to existing quantity
      existingProduct.quantity += quantity;
    } else {
      order.products.push({
        productNumber,
        quantity,
      });
    }
  });
  
  const orders = Array.from(orderMap.values());
  
  return { orders, errors };
}

/**
 * Extract delivery date from filename
 * Supported formats:
 * - DD-MM-YYYY (e.g., 02-02-2026)
 * - DD.MM.YYYY (e.g., 02.02.2026)
 * - DDMMYYYY (e.g., 02022026)
 * - YYYY-MM-DD (e.g., 2026-02-02)
 * - YYYY.MM.DD (e.g., 2026.02.02)
 * - YYYYMMDD (e.g., 20260202)
 */
export function extractDateFromFilename(filename: string): Date | null {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Try DD-MM-YYYY format (dashes)
  const ddmmyyyyDash = nameWithoutExt.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyyDash) {
    const [, day, month, year] = ddmmyyyyDash;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Date extracted from filename (DD-MM-YYYY): ${date.toISOString()}`);
      return date;
    }
  }
  
  // Try DD.MM.YYYY format (dots)
  const ddmmyyyyDot = nameWithoutExt.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (ddmmyyyyDot) {
    const [, day, month, year] = ddmmyyyyDot;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Date extracted from filename (DD.MM.YYYY): ${date.toISOString()}`);
      return date;
    }
  }
  
  // Try YYYY-MM-DD format (ISO with dashes)
  const yyyymmddDash = nameWithoutExt.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmddDash) {
    const [, year, month, day] = yyyymmddDash;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Date extracted from filename (YYYY-MM-DD): ${date.toISOString()}`);
      return date;
    }
  }
  
  // Try YYYY.MM.DD format (ISO with dots)
  const yyyymmddDot = nameWithoutExt.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (yyyymmddDot) {
    const [, year, month, day] = yyyymmddDot;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Date extracted from filename (YYYY.MM.DD): ${date.toISOString()}`);
      return date;
    }
  }
  
  // Try compact YYYYMMDD format (8 consecutive digits starting with 19 or 20)
  const yyyymmddCompact = nameWithoutExt.match(/((?:19|20)\d{2})(\d{2})(\d{2})/);
  if (yyyymmddCompact) {
    const [, year, month, day] = yyyymmddCompact;
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    // Validate month and day ranges
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const date = new Date(parseInt(year), monthNum - 1, dayNum);
      if (!isNaN(date.getTime())) {
        console.log(`Date extracted from filename (YYYYMMDD): ${date.toISOString()}`);
        return date;
      }
    }
  }
  
  // Try compact DDMMYYYY format (8 consecutive digits ending with 19 or 20xx)
  const ddmmyyyyCompact = nameWithoutExt.match(/(\d{2})(\d{2})((?:19|20)\d{2})/);
  if (ddmmyyyyCompact) {
    const [, day, month, year] = ddmmyyyyCompact;
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    // Validate month and day ranges to distinguish from YYYYMMDD
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const date = new Date(parseInt(year), monthNum - 1, dayNum);
      if (!isNaN(date.getTime())) {
        console.log(`Date extracted from filename (DDMMYYYY): ${date.toISOString()}`);
        return date;
      }
    }
  }
  
  console.log(`Could not extract date from filename: ${filename}`);
  return null;
}

/**
 * Read file content as text with automatic encoding detection
 * Tries UTF-8 first, then falls back to Windows-1252 for Nordic files
 */
export async function readFileAsText(file: File): Promise<string> {
  // First try UTF-8
  const utf8Content = await readWithEncoding(file, 'UTF-8');
  
  // Check for garbled characters (UTF-8 read as Latin-1 produces "Ã")
  if (!hasGarbledCharacters(utf8Content)) {
    return utf8Content;
  }
  
  // If garbled, try Windows-1252 (common for older Nordic systems)
  console.log('Detected encoding issue, trying Windows-1252...');
  const win1252Content = await readWithEncoding(file, 'windows-1252');
  
  if (!hasGarbledCharacters(win1252Content)) {
    return win1252Content;
  }
  
  // Final fallback: ISO-8859-1
  console.log('Trying ISO-8859-1 fallback...');
  return readWithEncoding(file, 'ISO-8859-1');
}

function readWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, encoding);
  });
}

/**
 * Detect garbled Nordic characters
 * When UTF-8 is read as ISO-8859-1:
 * - ø becomes Ã¸
 * - æ becomes Ã¦  
 * - å becomes Ã¥
 */
function hasGarbledCharacters(content: string): boolean {
  // Common patterns when UTF-8 Nordic chars are misread as ISO-8859-1
  const garbledPatterns = [
    /Ã¸/,  // ø
    /Ã¦/,  // æ
    /Ã¥/,  // å
    /Ã˜/,  // Ø
    /Ã†/,  // Æ
    /Ã…/,  // Å
  ];
  
  return garbledPatterns.some(pattern => pattern.test(content));
}
