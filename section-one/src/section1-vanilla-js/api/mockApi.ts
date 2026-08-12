// src/section1-vanilla-js/api/mockApi.ts
//
// A fake E-commerce backend. In real life this would be your actual
// server; here it's a deterministic in-memory dataset we can shape for
// specific test scenarios (empty results, 500 errors, slow responses).

export interface Product {
  id: string;
  name: string;
  category: 'electronics' | 'apparel' | 'home' | 'books';
  price: number;
  stock: number;
  rating: number;
  tags: string[];
}

export const PRODUCTS_DB: Product[] = [
  { id: 'p1', name: 'Wireless Mouse', category: 'electronics', price: 25.99, stock: 120, rating: 4.5, tags: ['bestseller', 'wireless'] },
  { id: 'p2', name: 'Mechanical Keyboard', category: 'electronics', price: 89.99, stock: 45, rating: 4.8, tags: ['bestseller'] },
  { id: 'p3', name: 'Cotton T-Shirt', category: 'apparel', price: 15.0, stock: 300, rating: 4.1, tags: ['new'] },
  { id: 'p4', name: 'Denim Jacket', category: 'apparel', price: 59.5, stock: 0, rating: 4.3, tags: [] },
  { id: 'p5', name: 'Ceramic Mug Set', category: 'home', price: 22.75, stock: 80, rating: 4.6, tags: ['new', 'gift'] },
  { id: 'p6', name: 'Clean Code', category: 'books', price: 33.0, stock: 60, rating: 4.9, tags: ['bestseller', 'gift'] },
];

/**
 * Simulates GET /api/products with configurable latency + failure mode.
 * Real fetch wrappers get built around endpoints shaped exactly like this,
 * so keep the signature close to what `fetch(...).then(r => r.json())`
 * would actually resolve to.
 */
export function fetchProductsRaw(options?: {
  delayMs?: number;
  shouldFail?: boolean;
  signal?: AbortSignal;
}): Promise<Product[]> {
  const { delayMs = 300, shouldFail = false, signal } = options ?? {};

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      if (shouldFail) {
        reject(new Error('HTTP 500: Internal Server Error'));
        return;
      }
      resolve(structuredClone(PRODUCTS_DB));
    }, delayMs);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
