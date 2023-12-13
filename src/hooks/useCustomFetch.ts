import { useCallback, useContext } from "react"
import { changeCacheParams } from "src/utils/types"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const updateCacheWhenChecked = (endpoint: RegisteredEndpoints, params: changeCacheParams) => {
    if (endpoint === "setTransactionApproval") {
      const itemId = params.transactionId
      const cacheKey1 = getCacheKey("transactionsByEmployee", { employeeId: params.employeeId })

      for (const [key, value] of cache?.current) {
        if (key.includes("paginatedTransactions")) {
          const data = JSON.parse(value)
          const index = data.data.findIndex((item: any) => item.id === itemId)
          if (index !== -1) {
            data.data[index].approved = params.value
            cache?.current.set(key, JSON.stringify(data))
          }
        }
      }
      console.log("cacheKey1", cacheKey1)
      if (cache?.current.has(cacheKey1)) {
        const data = JSON.parse(cache?.current.get(cacheKey1))
        const index = data.findIndex((item: any) => item.id === itemId)
        if (index !== -1) {
          data[index].approved = params.value
          cache?.current.set(cacheKey1, JSON.stringify(data))
        }
      }
    }
  }

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      }),
    [wrappedRequest]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return {
    fetchWithCache,
    updateCacheWhenChecked,
    fetchWithoutCache,
    clearCache,
    clearCacheByEndpoint,
    loading,
  }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
