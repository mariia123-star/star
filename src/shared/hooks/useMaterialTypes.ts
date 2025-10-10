import { useQuery } from '@tanstack/react-query'
import { getMaterialTypes, type MaterialType } from '@/entities/material-types'

export const useMaterialTypes = () => {
  return useQuery<MaterialType[]>({
    queryKey: ['material-types'],
    queryFn: getMaterialTypes,
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
  })
}
