import { useState, useEffect } from 'react';

interface KorvenProduct {
  name: string;
  type?: 'meal' | 'food';
  category?: string;
  area?: string;
  thumb?: string;
}

// Function to check if a name contains connectors (for meal names)
const hasConnectors = (name: string): boolean => {
  const connectors = ['con', 'y', 'de', 'al', 'en', 'para', 'sin', 'a', 'el', 'la', 'los', 'las'];
  const words = name.toLowerCase().split(/\s+/);
  return words.some(word => connectors.includes(word));
};

let cachedProducts: KorvenProduct[] | null = null;
let isLoading = false;
let loadPromise: Promise<KorvenProduct[]> | null = null;

const fetchKorvenProducts = async (): Promise<KorvenProduct[]> => {
  if (cachedProducts) {
    return cachedProducts;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = fetch('/api/korven-products', {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((products: KorvenProduct[]) => {
      if (Array.isArray(products) && products.length > 0) {
        cachedProducts = products;
      }
      isLoading = false;
      loadPromise = null;
      return Array.isArray(products) ? products : [];
    })
    .catch(error => {
      console.error('Error fetching Korven products:', error);
      isLoading = false;
      loadPromise = null;
      // Return empty array on error so the app continues to work
      return [];
    });

  return loadPromise;
};

export const useKorvenCheck = () => {
  const [products, setProducts] = useState<KorvenProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKorvenProducts().then(products => {
      setProducts(products);
      setLoading(false);
    });
  }, []);

  const isKorvenInspiredFood = (name: string): boolean => {
    if (!name || products.length === 0) return false;
    return products.some(
      product =>
        product.name.toLowerCase() === name.toLowerCase() &&
        (product.type ? product.type === 'food' : !hasConnectors(product.name))
    );
  };

  const isKorvenInspiredMeal = (name: string): boolean => {
    if (!name || products.length === 0) return false;
    return products.some(
      product =>
        product.name.toLowerCase() === name.toLowerCase() &&
        (product.type ? product.type === 'meal' : hasConnectors(product.name))
    );
  };

  return {
    korvenProducts: products,
    isLoadingKorven: loading,
    isKorvenInspiredFood,
    isKorvenInspiredMeal,
    loading
  };
};
