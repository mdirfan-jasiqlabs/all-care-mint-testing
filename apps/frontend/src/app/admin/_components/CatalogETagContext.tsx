'use client';

import React, { createContext, useState, useContext } from 'react';

interface CatalogETagContextType {
  etag: string;
  setEtag: (etag: string) => void;
}

const CatalogETagContext = createContext<CatalogETagContextType>({
  etag: 'W/"6f8ad1b51e"', // default approved fallback ETag
  setEtag: () => {},
});

export const useCatalogETag = () => useContext(CatalogETagContext);

export function CatalogETagProvider({ children }: { children: React.ReactNode }) {
  const [etag, setEtag] = useState('W/"6f8ad1b51e"');

  return (
    <CatalogETagContext.Provider value={{ etag, setEtag }}>
      {children}
    </CatalogETagContext.Provider>
  );
}
