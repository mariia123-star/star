export const MATERIAL_CATEGORIES = {
  CONCRETE: {
    id: 'concrete',
    name: 'Бетон и железобетон',
    color: 'blue',
  },
  METAL: {
    id: 'metal',
    name: 'Металлические конструкции',
    color: 'gray',
  },
  BRICK: {
    id: 'brick',
    name: 'Кирпич и камень',
    color: 'red',
  },
  WOOD: {
    id: 'wood',
    name: 'Деревянные материалы',
    color: 'orange',
  },
  ROOFING: {
    id: 'roofing',
    name: 'Кровельные материалы',
    color: 'purple',
  },
  INSULATION: {
    id: 'insulation',
    name: 'Теплоизоляция',
    color: 'green',
  },
  FINISHING: {
    id: 'finishing',
    name: 'Отделочные материалы',
    color: 'cyan',
  },
  PLUMBING: {
    id: 'plumbing',
    name: 'Сантехника',
    color: 'blue',
  },
  ELECTRICAL: {
    id: 'electrical',
    name: 'Электрооборудование',
    color: 'yellow',
  },
  FACADE: {
    id: 'facade',
    name: 'Фасадные материалы',
    color: 'magenta',
  },
  TRANSPARENT: {
    id: 'transparent',
    name: 'Светопрозрачные конструкции',
    color: 'volcano',
  },
  OTHER: {
    id: 'other',
    name: 'Прочие материалы',
    color: 'default',
  },
} as const

export const MATERIAL_CATEGORY_OPTIONS = Object.values(MATERIAL_CATEGORIES).map(
  category => ({
    value: category.id,
    label: category.name,
    color: category.color,
  })
)

export const getMaterialCategoryColor = (categoryId: string): string => {
  const category = Object.values(MATERIAL_CATEGORIES).find(
    cat => cat.id === categoryId
  )
  return category?.color || 'default'
}

export const getMaterialCategoryName = (categoryId: string): string => {
  const category = Object.values(MATERIAL_CATEGORIES).find(
    cat => cat.id === categoryId
  )
  return category?.name || 'Неизвестная категория'
}
