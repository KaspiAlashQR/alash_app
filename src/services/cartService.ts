import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem, Cart, BatchBreakdown } from '../api/types';

const CART_STORAGE_KEY = '@AlashCloud_Cart';

class CartService {
  private cart: Cart = {
    items: [],
    total: 0
  };

  private listeners: Array<(cart: Cart) => void> = [];
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadCart();
  }

  subscribe(listener: (cart: Cart) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.cart));
  }

  async loadCart(): Promise<Cart> {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        this.cart = JSON.parse(cartData);
      }
      this.notifyListeners();
      return this.cart;
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error);
      return this.cart;
    }
  }

  private async saveCart(): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
    } catch (error) {
      console.error('Ошибка сохранения корзины:', error);
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveCart();
    }, 300);
  }

  private calculateBatchBreakdown(product: Product, quantity: number): BatchBreakdown[] {
    const breakdown: BatchBreakdown[] = [];
    const batches = product.allBatches || [product];

    const sortedBatches = [...batches].sort((a, b) => a.priority - b.priority);

    let remainingToAssign = quantity;

    for (const batch of sortedBatches) {
      if (remainingToAssign <= 0) break;

      const batchRemaining = batch.remaining_quantity || 0;
      if (batchRemaining <= 0) continue;

      const assignFromBatch = Math.min(remainingToAssign, batchRemaining);

      breakdown.push({
        batch_product_id: batch.batch_product_id,
        batch_number: batch.batch_number,
        quantity: assignFromBatch,
        price: batch.selling_price,
        selling_price: batch.selling_price,
        purchase_price: batch.purchase_price,
        subtotal: assignFromBatch * batch.selling_price
      });

      remainingToAssign -= assignFromBatch;
    }

    return breakdown;
  }

  private calculateTotalWithFIFO(): void {
    let total = 0;

    for (const item of this.cart.items) {
      const breakdown = this.calculateBatchBreakdown(item.product, item.quantity);
      item.batchBreakdown = breakdown;
      total += breakdown.reduce((sum, b) => sum + b.subtotal, 0);
    }

    this.cart.total = total;
  }

  getCart(): Cart {
    return { ...this.cart };
  }

  async addToCart(product: Product, quantity: number = 1): Promise<void> {
    const totalRemaining = product.totalRemaining || product.remaining_quantity || 0;
    if (totalRemaining <= 0) {
      return;
    }

    const existingItemIndex = this.cart.items.findIndex(item => item.product.product_id === product.product_id);

    if (existingItemIndex >= 0) {
      const newQuantity = this.cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity <= totalRemaining) {
        this.cart.items[existingItemIndex].quantity = newQuantity;
        this.cart.items[existingItemIndex].product = product;
      } else {
        this.cart.items[existingItemIndex].quantity = totalRemaining;
        this.cart.items[existingItemIndex].product = product;
      }
    } else {
      const addQuantity = Math.min(quantity, totalRemaining);
      this.cart.items.push({
        product,
        quantity: addQuantity
      });
    }

    this.calculateTotalWithFIFO();
    this.notifyListeners();
    this.debouncedSave();
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const itemIndex = this.cart.items.findIndex(item => item.product.product_id === productId);
    if (itemIndex >= 0) {
      const product = this.cart.items[itemIndex].product;
      const totalRemaining = product.totalRemaining || product.remaining_quantity || 0;

      const finalQuantity = Math.min(quantity, totalRemaining);
      this.cart.items[itemIndex].quantity = finalQuantity;

      this.calculateTotalWithFIFO();
      this.notifyListeners();
      this.debouncedSave();
    }
  }

  removeFromCart(productId: number): void {
    this.cart.items = this.cart.items.filter(item => item.product.product_id !== productId);
    this.calculateTotalWithFIFO();
    this.notifyListeners();
    this.debouncedSave();
  }

  async clearCart(): Promise<void> {
    this.cart = {
      items: [],
      total: 0
    };
    await this.saveCart();
    this.notifyListeners();
  }

  getItemQuantity(productId: number): number {
    const item = this.cart.items.find(item => item.product.product_id === productId);
    return item ? item.quantity : 0;
  }

  getTotalItems(): number {
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  getBatchBreakdown(productId: number): BatchBreakdown[] {
    const item = this.cart.items.find(item => item.product.product_id === productId);
    return item?.batchBreakdown || [];
  }
}

export const cartService = new CartService();
