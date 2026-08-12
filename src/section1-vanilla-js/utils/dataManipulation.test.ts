import { PRODUCTS_DB, type Product } from "../api/mockApi";
import {
  getAffordableInStockItems,
  getTotalInventoryValue,
  groupByCategory,
  getAllUniqueTags,
  updateProductStock,
  removeProduct,
  buildProductIndex,
  getUniqueCategories,
  deepCloneCart,
  sortProductsBy,
} from "./dataManipulation.js";

// Work off a fresh copy per test file so nothing here can ever mutate the
// shared fixture and bleed into other test files.
const products: Product[] = structuredClone(PRODUCTS_DB);

describe("getAffordableInStockItems", () => {
  it("filters out-of-stock and over-budget items", () => {
    const result = getAffordableInStockItems(products, 30);
    expect(result).toEqual([
      { id: "p1", label: "Wireless Mouse - $25.99" },
      { id: "p3", label: "Cotton T-Shirt - $15.00" },
      { id: "p5", label: "Ceramic Mug Set - $22.75" },
    ]);
  });

  it("returns an empty array when nothing matches (edge case)", () => {
    expect(getAffordableInStockItems(products, 0)).toEqual([]);
  });

  it("returns an empty array for an empty input (edge case)", () => {
    expect(getAffordableInStockItems([], 100)).toEqual([]);
  });
});

describe("getTotalInventoryValue", () => {
  it("sums price * stock across all products", () => {
    const expected = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    expect(getTotalInventoryValue(products)).toBeCloseTo(expected);
  });

  it("returns 0 for an empty catalog (edge case)", () => {
    expect(getTotalInventoryValue([])).toBe(0);
  });
});

describe("groupByCategory", () => {
  it("groups products under their category key", () => {
    const grouped = groupByCategory(products);
    expect(Object.keys(grouped).sort()).toEqual([
      "apparel",
      "books",
      "electronics",
      "home",
    ]);
    expect(grouped.electronics).toHaveLength(2);
  });

  it("does not mutate the original array", () => {
    const originalLength = products.length;
    groupByCategory(products);
    expect(products).toHaveLength(originalLength);
  });
});

describe("getAllUniqueTags", () => {
  it("flattens and deduplicates tags across products", () => {
    const tags = getAllUniqueTags(products);
    expect(tags).toEqual(
      expect.arrayContaining(["bestseller", "wireless", "new", "gift"]),
    );
    expect(new Set(tags).size).toBe(tags.length); // no duplicates
  });

  it("returns an empty array when no product has tags (edge case)", () => {
    const untagged = products.map((p) => ({ ...p, tags: [] }));
    expect(getAllUniqueTags(untagged)).toEqual([]);
  });
});

describe("updateProductStock (immutability)", () => {
  it("returns a new array with the target product updated", () => {
    const updated = updateProductStock(products, "p1", 999);
    const target = updated.find((p) => p.id === "p1");

    expect(target?.stock).toBe(999);
    expect(updated).not.toBe(products); // new array reference
    expect(products.find((p) => p.id === "p1")?.stock).not.toBe(999); // original untouched
  });

  it("returns an equivalent array when the id does not exist (edge case)", () => {
    const updated = updateProductStock(products, "does-not-exist", 5);
    expect(updated).toEqual(products);
  });
});

describe("removeProduct", () => {
  it("removes only the matching product", () => {
    const result = removeProduct(products, "p4");
    expect(result.find((p) => p.id === "p4")).toBeUndefined();
    expect(result).toHaveLength(products.length - 1);
  });

  it("is a no-op (same length) when the id is not found (edge case)", () => {
    const result = removeProduct(products, "nope");
    expect(result).toHaveLength(products.length);
  });
});

describe("buildProductIndex / getUniqueCategories (Map & Set)", () => {
  it("builds a Map keyed by product id for O(1) lookup", () => {
    const index = buildProductIndex(products);
    expect(index.get("p2")?.name).toBe("Mechanical Keyboard");
    expect(index.size).toBe(products.length);
  });

  it("builds a Set of unique categories", () => {
    const categories = getUniqueCategories(products);
    expect(categories.has("electronics")).toBe(true);
    expect(categories.size).toBe(4);
  });
});

describe("deepCloneCart (structuredClone)", () => {
  it("produces a fully independent deep copy", () => {
    const cart = {
      items: [products[0]],
      meta: { createdAt: new Date(2024, 0, 1) },
    };
    const clone = deepCloneCart(cart);

    clone.items[0].price = 0;
    clone.meta.createdAt = new Date(2099, 0, 1);

    expect(cart.items[0].price).not.toBe(0); // original untouched
    expect(clone).not.toBe(cart);
    expect(clone.items).not.toBe(cart.items); // nested arrays are also new references
  });
});

describe("sortProductsBy", () => {
  it("sorts ascending by price by default", () => {
    const sorted = sortProductsBy(products, "price", "asc");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].price).toBeGreaterThanOrEqual(sorted[i - 1].price);
    }
  });

  it("sorts descending when specified", () => {
    const sorted = sortProductsBy(products, "rating", "desc");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].rating).toBeLessThanOrEqual(sorted[i - 1].rating);
    }
  });

  it("does not mutate the original array", () => {
    const before = [...products];
    sortProductsBy(products, "name", "asc");
    expect(products).toEqual(before);
  });

  it("handles an empty array without throwing (edge case)", () => {
    expect(sortProductsBy([], "price", "asc")).toEqual([]);
  });
});
