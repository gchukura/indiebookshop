import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Bookstore } from '@shared/schema';

type BookstoreContextType = {
  selectedBookstore: Bookstore | null;
  setSelectedBookstore: (bookstore: Bookstore | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (isOpen: boolean) => void;
};

const BookstoreContext = createContext<BookstoreContextType | undefined>(undefined);

export const BookstoreProvider = ({ children }: { children: ReactNode }) => {
  const [selectedBookstore, setSelectedBookstore] = useState<Bookstore | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <BookstoreContext.Provider
      value={{
        selectedBookstore,
        setSelectedBookstore,
        isDetailOpen,
        setIsDetailOpen,
      }}
    >
      {children}
    </BookstoreContext.Provider>
  );
};

export const useBookstoreContext = () => {
  const context = useContext(BookstoreContext);
  if (context === undefined) {
    throw new Error('useBookstoreContext must be used within a BookstoreProvider');
  }
  return context;
};
