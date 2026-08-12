// src/section1-vanilla-js/utils/dataManipulation.ts
import type { Product } from '../api/mockApi.js';

/** filter + map pipeline: cheap in-stock items, formatted for a UI list. */
export function getAffordableInStockItems(products: Product[], maxPrice: number) {
  return products
    .filter((p) => p.stock > 0 && p.price <= maxPrice)
    .map((p) => ({ id: p.id, label: `${p.name} - $${p.price.toFixed(2)}` }));
}

/** reduce: total inventory value, a classic aggregation. */
export function getTotalInventoryValue(products: Product[]): number {
  return products.reduce((total, p) => total + p.price * p.stock, 0);
}

/** reduce: group-by, one of the highest-value reduce patterns in real apps. */
export function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, product) => {
    const key = product.category;
    // immutability note: we still mutate the accumulator itself (that's
    // fine and idiomatic for reduce), but we never mutate `product` or
    // reassign the array in place with something like acc[key].push
    // silently sharing references across renders in a React context.
    acc[key] = [...(acc[key] ?? []), product];
    return acc;
  }, {});
}

/** flatMap: every tag across every product, deduplicated. */
export function getAllUniqueTags(products: Product[]): string[] {
  const flat = products.flatMap((p) => p.tags);
  return Array.from(new Set(flat));
}

/** Immutable update helpers: never mutate the original array/object. */
export function updateProductStock(products: Product[], id: string, newStock: number): Product[] {
  return products.map((p) => (p.id === id ? { ...p, stock: newStock } : p));
}

export function removeProduct(products: Product[], id: string): Product[] {
  return products.filter((p) => p.id !== id);
}

/** Map/Set: fast lookup index + unique category set. */
export function buildProductIndex(products: Product[]): Map<string, Product> {
  return new Map(products.map((p) => [p.id, p]));
}

export function getUniqueCategories(products: Product[]): Set<string> {
  return new Set(products.map((p) => p.category));
}

/** structuredClone: real deep clone, handles nested arrays/objects, Dates, Maps, Sets. */
export function deepCloneCart(cart: { items: Product[]; meta: Record<string, unknown> }) {
  return structuredClone(cart);
}

export type SortDirection = 'asc' | 'desc';

/** Generic, reusable sorter. Never mutates the input array. */
export function sortProductsBy<K extends keyof Product>(
  products: Product[],
  key: K,
  direction: SortDirection = 'asc'
): Product[] {
  const sorted = [...products].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }
    return String(aVal).localeCompare(String(bVal));
  });
  return direction === 'asc' ? sorted : sorted.reverse();
}
