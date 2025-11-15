import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem, Cart } from '../api/types';

const CART_STORAGE_KEY = '@AlashCloud_Cart';

class CartService {
  private cart: Cart = {
    items: [],
    total: 0
  };

  private listeners: Array<(cart: Cart) => void> = [];
  private saveTimeout: NodeJS.Timeout | null = null;

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

  private calculateTotal(): void {
    this.cart.total = this.cart.items.reduce((total, item) => {
      return total + (item.product.amount * item.quantity);
    }, 0);
  }

  getCart(): Cart {
    return { ...this.cart };
  }

  async addToCart(product: Product, quantity: number = 1): Promise<void> {
    const existingItemIndex = this.cart.items.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      this.cart.items[existingItemIndex].quantity += quantity;
    } else {
      this.cart.items.push({
        product,
        quantity
      });
    }

    this.calculateTotal();
    this.notifyListeners();
    this.debouncedSave();
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const itemIndex = this.cart.items.findIndex(item => item.product.id === productId);
    if (itemIndex >= 0) {
      this.cart.items[itemIndex].quantity = quantity;
      this.calculateTotal();
      this.notifyListeners();
      this.debouncedSave();
    }
  }

  removeFromCart(productId: number): void {
    this.cart.items = this.cart.items.filter(item => item.product.id !== productId);
    this.calculateTotal();
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
    const item = this.cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  getTotalItems(): number {
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }
}

export const cartService = new CartService();