// src/core/components/common/SmartLoader.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { Loader as Loader2, RefreshCw } from 'lucide-react';
import { PageLoader } from './Loader';

// ============ TYPES ============
export interface SmartLoaderProps {
  /** État de chargement initial */
  isLoading: boolean;
  /** État de rafraîchissement (recherche, changement de page) */
  isFetching?: boolean;
  /** Indique si les données affichées sont des données précédentes (placeholder) */
  isPlaceholderData?: boolean;
  /** Indique si une erreur est survenue */
  isError?: boolean;
  /** Message d'erreur */
  errorMessage?: string;
  /** Composant à afficher */
  children: ReactNode;
  /** Composant de fallback pour le premier chargement */
  fallback?: ReactNode;
  /** Composant de fallback pour les erreurs */
  errorFallback?: ReactNode;
  /** Afficher un indicateur subtil pendant le rafraîchissement */
  showRefreshingIndicator?: boolean;
  /** Position de l'indicateur de rafraîchissement */
  refreshIndicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Délai avant d'afficher le loader (évite les flashs) */
  delayMs?: number;
}

// ============ COMPOSANT D'INDICATEUR DE RAFRAÎCHISSEMENT ============
interface RefreshIndicatorProps {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

function RefreshIndicator({ position }: RefreshIndicatorProps) {
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-10`}>
      <div className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
        <RefreshCw size={12} className="animate-spin" />
        <span>Mise à jour...</span>
      </div>
    </div>
  );
}

// ============ COMPOSANT DE CHARGEMENT AVEC DÉLAI ============
interface DelayedLoaderProps {
  delayMs: number;
  children: ReactNode;
}

function DelayedLoader({ delayMs, children }: DelayedLoaderProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!show) return null;
  return <>{children}</>;
}

// ============ COMPOSANT D'ERREUR ============
interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

function ErrorFallback({ message, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-600">{message || "Une erreur est survenue"}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

// ============ COMPOSANT PRINCIPAL ============
/**
 * SmartLoader - Composant de chargement intelligent
 * 
 * Fonctionnalités :
 * - Évite les écrans blancs en gardant les données précédentes
 * - Affiche un indicateur subtil pendant les rafraîchissements
 * - Gère les erreurs avec fallback
 * - Délai optionnel pour éviter les flashs de chargement
 * 
 * @example
 * <SmartLoader isLoading={isLoading} isFetching={isFetching} isPlaceholderData={isPlaceholderData}>
 *   <MyComponent />
 * </SmartLoader>
 */
export function SmartLoader({
  isLoading,
  isFetching = false,
  isPlaceholderData = false,
  isError = false,
  errorMessage,
  children,
  fallback,
  errorFallback,
  showRefreshingIndicator = true,
  refreshIndicatorPosition = 'top-right',
  delayMs = 0,
}: SmartLoaderProps) {
  // Premier chargement : afficher le loader
  if (isLoading) {
    if (delayMs > 0) {
      return (
        <DelayedLoader delayMs={delayMs}>
          {fallback || <PageLoader />}
        </DelayedLoader>
      );
    }
    return fallback || <PageLoader />;
  }

  // Erreur : afficher le fallback d'erreur
  if (isError) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    return <ErrorFallback message={errorMessage} />;
  }

  // Rafraîchissement en arrière-plan : afficher les données avec indicateur
  if (isFetching && !isPlaceholderData && showRefreshingIndicator) {
    return (
      <div className="relative">
        <RefreshIndicator position={refreshIndicatorPosition} />
        {children}
      </div>
    );
  }

  // Cas normal : afficher les données
  return <>{children}</>;
}

// ============ VARIANTE POUR LES TABLEAUX ============
interface TableSmartLoaderProps extends SmartLoaderProps {
  columns: number;
  rows?: number;
}

/**
 * SmartLoader spécialisé pour les tableaux
 * Affiche un skeleton de tableau pendant le chargement
 */
export function TableSmartLoader({
  isLoading,
  isFetching = false,
  isPlaceholderData = false,
  columns,
  rows = 5,
  children,
  showRefreshingIndicator = true,
  refreshIndicatorPosition = 'top-right',
}: TableSmartLoaderProps) {
  // Premier chargement : afficher un skeleton de tableau
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: columns }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Rafraîchissement en arrière-plan
  if (isFetching && !isPlaceholderData && showRefreshingIndicator) {
    return (
      <div className="relative">
        <RefreshIndicator position={refreshIndicatorPosition} />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// ============ VARIANTE POUR LES CARTES ============
interface CardsSmartLoaderProps extends SmartLoaderProps {
  cardsCount?: number;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * SmartLoader spécialisé pour les grilles de cartes
 */
export function CardsSmartLoader({
  isLoading,
  isFetching = false,
  isPlaceholderData = false,
  cardsCount = 6,
  columns = 3,
  children,
  showRefreshingIndicator = true,
  refreshIndicatorPosition = 'top-right',
}: CardsSmartLoaderProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {Array.from({ length: cardsCount }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isFetching && !isPlaceholderData && showRefreshingIndicator) {
    return (
      <div className="relative">
        <RefreshIndicator position={refreshIndicatorPosition} />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// ============ COMPOSANT DE SQUELETTE RÉUTILISABLE ============
interface SkeletonProps {
  className?: string;
  count?: number;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

/**
 * Squelette de chargement réutilisable
 */
export function Skeleton({ 
  className = '', 
  count = 1, 
  height = 'auto',
  width = '100%',
  rounded = 'rounded-md'
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 ${rounded} ${className}`}
          style={{ height, width }}
        />
      ))}
    </>
  );
}

// Export par défaut
export default SmartLoader;