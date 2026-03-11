import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { apiClient, ApiResponse } from '../utils/apiClient'

export function useFetch<T = any>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<T>, Error>({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<T>>(url)
      return response
    },
    ...options,
  })
}

export function useCreate<TData = any, TVariables = any>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<TData>, Error, TVariables>, 'mutationFn'>
) {
  return useMutation<ApiResponse<TData>, Error, TVariables>({
    mutationFn: async (variables) => {
      const response = await apiClient.post<ApiResponse<TData>>(url, variables)
      return response
    },
    ...options,
  })
}

export function useUpdate<TData = any, TVariables = any>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<TData>, Error, TVariables>, 'mutationFn'>
) {
  return useMutation<ApiResponse<TData>, Error, TVariables>({
    mutationFn: async (variables) => {
      const response = await apiClient.put<ApiResponse<TData>>(url, variables)
      return response
    },
    ...options,
  })
}

export function useDelete<TData = any>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<TData>, Error, string>, 'mutationFn'>
) {
  return useMutation<ApiResponse<TData>, Error, string>({
    mutationFn: async (id) => {
      const response = await apiClient.delete<ApiResponse<TData>>(`${url}/${id}`)
      return response
    },
    ...options,
  })
}
