export interface MaterialType {
  id: string
  name: string
  short_name: string
}

export const materialTypesData: MaterialType[] = [
  {
    id: '1',
    name: 'Основной материал',
    short_name: 'основ',
  },
  {
    id: '2',
    name: 'Вспомогательный материал',
    short_name: 'вспом',
  },
  {
    id: '3',
    name: 'Расходный материал',
    short_name: 'расход',
  },
]

export const getMaterialTypes = (): Promise<MaterialType[]> => {
  return Promise.resolve(materialTypesData)
}

export const getMaterialTypeById = (id: string): MaterialType | undefined => {
  return materialTypesData.find(type => type.id === id)
}

export const getMaterialTypeByShortName = (
  shortName: string
): MaterialType | undefined => {
  return materialTypesData.find(type => type.short_name === shortName)
}
