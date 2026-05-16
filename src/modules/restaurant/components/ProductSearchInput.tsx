// src/modules/restaurant/components/ProductSearchInput.tsx

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/shared/types';

// ======
// TYPES
// ======

export interface ProductSearchInputProps {
  /** Valeur actuelle du champ de recherche */
  value: string;
  /** Callback quand la valeur change */
  onChange: (value: string) => void;
  /** Callback quand un produit est sélectionné */
  onSelect: (productId: string, product: Product) => void;
  /** Callback pour effacer la sélection */
  onClear?: () => void;
  /** Liste des produits disponibles */
  products: Product[];
  /** État de chargement */
  isLoading?: boolean;
  /** Produit actuellement sélectionné */
  selectedProduct?: Product | null;
  /** Placeholder du champ */
  placeholder?: string;
  /** Classes CSS supplémentaires */
  className?: string;
  /** Désactiver le composant */
  disabled?: boolean;
  /** Nombre maximum de suggestions (défaut: 10) */
  maxSuggestions?: number;
}

// ======
// COMPOSANT PRINCIPAL
// ======

export function ProductSearchInput({
  value,
  onChange,
  onSelect,
  onClear,
  products,
  isLoading = false,
  selectedProduct,
  placeholder = "Rechercher par nom ou code-barres...",
  className,
  disabled = false,
  maxSuggestions = 10,
}: ProductSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filtrer les suggestions
  const suggestions = useMemo(() => {
    if (!value.trim() || !products.length) return [];
    
    const searchTerm = value.toLowerCase();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) || 
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
    );
    
    return filtered.slice(0, maxSuggestions);
  }, [products, value, maxSuggestions]);

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation clavier
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      // Si la liste n'est pas ouverte, l'ouvrir sur flèche bas
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll automatique vers l'élément highlighté
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = (product: Product) => {
    onSelect(product.id, product);
    onChange(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Champ de recherche */}
      <div className="relative">
        <Search 
          size={15} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-9 pr-8 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all",
            disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white",
            className
          )}
        />
        
        {/* Bouton effacer */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        
        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Liste des suggestions */}
      {isOpen && !disabled && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          {suggestions.map((product, index) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "w-full px-4 py-2.5 text-left transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between",
                highlightedIndex === index ? "bg-sky-50" : "hover:bg-gray-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {product.barcode && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      🔖 {product.barcode}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                      Stock: {product.stock} {product.unit || 'u.'}
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-400 rotate-[-90deg] shrink-0 ml-2" />
            </button>
          ))}
        </div>
      )}

      {/* Aucun résultat */}
      {isOpen && !disabled && value.trim() && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">Aucun produit trouvé</p>
          <p className="text-xs text-gray-400 mt-1">
            Aucun produit ne correspond à "{value}"
          </p>
        </div>
      )}

      {/* Produit sélectionné (affichage compact) */}
      {selectedProduct && !value && (
        <div className="mt-2 p-2 bg-sky-50 rounded-lg border border-sky-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {selectedProduct.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {selectedProduct.barcode && (
                <span className="text-[10px] text-gray-500 font-mono">
                  🔖 {selectedProduct.barcode}
                </span>
              )}
              <span className="text-[10px] text-gray-500">
                Stock: {selectedProduct.stock} {selectedProduct.unit || 'u.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClear?.();
              inputRef.current?.focus();
            }}
            className="p-1 rounded-lg hover:bg-sky-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ======
// EXPORT PAR DÉFAUT
// ======

export default ProductSearchInput;