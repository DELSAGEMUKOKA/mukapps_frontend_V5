// src/core/hooks/usePaginatedQuery.ts
import { useQuery, useInfiniteQuery, keepPreviousData, type UseQueryOptions } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES, GC_TIMES } from '@/core/config/reactQueryConfig';

// ============ TYPES ============
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<TData = any> {
  data: TData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsePaginatedQueryOptions<TData = any>
  extends Omit<UseQueryOptions<PaginatedResponse<TData>>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<TData>>;
  params: PaginationParams;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

// ============ HOOK PRINCIPAL ============
/**
 * Hook personnalisé pour les requêtes paginées
 * Évite les écrans blancs avec keepPreviousData
 */
export function usePaginatedQuery<TData = any>({
  queryKey,
  queryFn,
  params,
  enabled = true,
  staleTime = STALE_TIMES.STANDARD,
  gcTime = GC_TIMES.STANDARD,
  ...options
}: UsePaginatedQueryOptions<TData>) {
  const { page, limit, search, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: [...queryKey, page, limit, search, sortBy, sortOrder],
    queryFn: () => queryFn(params),
    // ============ POINT CLÉ : keepPreviousData ============
    // Permet de garder les données précédentes pendant le chargement
    // Cela ÉVITE TOTALEMENT LES ÉCRANS BLANCS lors des changements de page
    placeholderData: keepPreviousData,
    staleTime,
    gcTime,
    enabled,
    ...options,
  });
}

// ============ HOOK POUR LISTES SIMPLES ============
/**
 * Hook simplifié pour les listes paginées avec recherche
 */
export function useSimplePaginatedQuery<TData = any>({
  queryKey,
  queryFn,
  page,
  limit,
  search,
  enabled = true,
}: {
  queryKey: string;
  queryFn: (page: number, limit: number, search?: string) => Promise<any>;
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [queryKey, page, limit, search],
    queryFn: () => queryFn(page, limit, search),
    placeholderData: keepPreviousData, // ← ÉVITE LES ÉCRANS BLANCS
    staleTime: STALE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    enabled,
  });
}

// ============ HOOK POUR LISTES INFINIES ============
/**
 * Hook pour le chargement infini (scroll)
 */
export function useInfinitePaginatedQuery<TData = any>({
  queryKey,
  queryFn,
  limit,
  search,
  enabled = true,
}: {
  queryKey: string;
  queryFn: (page: number, limit: number, search?: string) => Promise<any>;
  limit: number;
  search?: string;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: [queryKey, 'infinite', limit, search],
    queryFn: ({ pageParam = 1 }) => queryFn(pageParam, limit, search),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any, pages: any[]) => {
      const totalPages = lastPage?.pagination?.totalPages || 1;
      const nextPage = pages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: STALE_TIMES.STANDARD,
    enabled,
  });
}

// ============ HOOK AVEC PRÉCHARGEMENT AUTOMATIQUE ============
/**
 * Hook avec préchargement automatique des pages adjacentes
 */
export function usePaginatedQueryWithPrefetch<TData = any>({
  queryKey,
  queryFn,
  params,
  queryClient,
  enabled = true,
}: {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<TData>>;
  params: PaginationParams;
  queryClient: any;
  enabled?: boolean;
}) {
  const result = usePaginatedQuery({
    queryKey,
    queryFn,
    params,
    enabled,
  });

  const { page, limit, search } = params;
  const totalPages = result.data?.pagination?.totalPages || 1;

  // Fonction pour précharger une page spécifique
  const prefetchPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      queryClient.prefetchQuery({
        queryKey: [...queryKey, targetPage, limit, search],
        queryFn: () => queryFn({ page: targetPage, limit, search }),
      });
    }
  };

  // Précharger la page suivante
  const prefetchNextPage = () => prefetchPage(page + 1);
  
  // Précharger la page précédente
  const prefetchPreviousPage = () => prefetchPage(page - 1);

  return {
    ...result,
    prefetchNextPage,
    prefetchPreviousPage,
    prefetchPage,
  };
}

// ============ HOOK POUR LES RECHERCHES AVEC DEBOUNCE ============
import { useState, useEffect } from 'react';

/**
 * Hook pour la recherche avec debounce intégré
 */
export function useDebouncedSearchQuery<TData = any>({
  queryKey,
  queryFn,
  limit = 20,
  debounceDelay = 300,
}: {
  queryKey: string;
  queryFn: (search: string, limit: number) => Promise<any>;
  limit?: number;
  debounceDelay?: number;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [search, debounceDelay]);

  const query = useQuery({
    queryKey: [queryKey, 'search', debouncedSearch, limit],
    queryFn: () => queryFn(debouncedSearch, limit),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIMES.FREQUENT,
    enabled: true,
  });

  return {
    search,
    setSearch,
    debouncedSearch,
    ...query,
  };
}

// ============ HOOK POUR LES STATISTIQUES ============
/**
 * Hook pour les données statistiques (mises à jour périodiques)
 */
export function useStatsQuery<TData = any>({
  queryKey,
  queryFn,
  refreshInterval = 30 * 1000, // 30 secondes par défaut
}: {
  queryKey: string[];
  queryFn: () => Promise<TData>;
  refreshInterval?: number;
}) {
  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
    staleTime: refreshInterval,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
  });
}