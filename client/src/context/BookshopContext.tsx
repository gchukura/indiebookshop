import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Bookstore } from '@shared/schema';

type BookshopContextType = {
  selectedBookshop: Bookstore | null;
  setSelectedBookshop: (bookshop: Bookstore | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (isOpen: boolean) => void;
};

const BookshopContext = createContext<BookshopContextType | undefined>(undefined);

export const BookshopProvider = ({ children }: { children: ReactNode }) => {
  const [selectedBookshop, setSelectedBookshop] = useState<Bookstore | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <BookshopContext.Provider
      value={{
        selectedBookshop,
        setSelectedBookshop,
        isDetailOpen,
        setIsDetailOpen,
      }}
    >
      {children}
    </BookshopContext.Provider>
  );
};

export const useBookshopContext = () => {
  const context = useContext(BookshopContext);
  if (context === undefined) {
    throw new Error('useBookshopContext must be used within a BookshopProvider');
  }
  return context;
};