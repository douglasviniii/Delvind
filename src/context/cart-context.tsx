'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

type Product = {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  imageUrl: string;
  stock?: number;
  requiresShipping?: boolean;
};

type CartItem = Product & {
  quantity: number;
};

type ShippingInfo = {
    cep: string;
    cost: number;
    deliveryTime: string;
} | null;

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  shippingInfo: ShippingInfo;
  setShippingInfo: (shippingInfo: ShippingInfo) => void;
  cartCount: number;
  subtotal: number;
  total: number;
  cartRequiresShipping: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedShipping = localStorage.getItem('shippingInfo');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    if (savedShipping) {
      setShippingInfo(JSON.parse(savedShipping));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);
  
  useEffect(() => {
    if (shippingInfo) {
        localStorage.setItem('shippingInfo', JSON.stringify(shippingInfo));
    } else {
        localStorage.removeItem('shippingInfo');
    }
  }, [shippingInfo]);

  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        toast({ title: "Produto já está no carrinho", description: `A quantidade de "${product.name}" foi atualizada.` });
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        toast({ title: "Produto adicionado!", description: `"${product.name}" foi adicionado ao seu carrinho.` });
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };
  
  const clearCart = () => {
    setCartItems([]);
    setShippingInfo(null);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const subtotal = cartItems.reduce((sum, item) => {
      const price = item.promoPrice || item.price;
      return sum + price * item.quantity;
  }, 0);
  
  const cartRequiresShipping = cartItems.some(item => item.requiresShipping);
  const total = subtotal + (shippingInfo?.cost || 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, shippingInfo, setShippingInfo, cartCount, subtotal, total, cartRequiresShipping }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
