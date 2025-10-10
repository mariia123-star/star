import {
  EstimateItem,
  EstimateCalculations,
  EstimateAnalytics,
} from '@/shared/types/estimate'

export class EstimateCalculator {
  static calculateTotals(items: EstimateItem[]): EstimateCalculations {
    const flatItems = this.flattenItems(items)

    const calculations: EstimateCalculations = {
      totalSum: 0,
      totalVolume: 0,
      totalMaterialCost: 0,
      totalWorkCost: 0,
      totalDeliveryCost: 0,
      itemsCount: flatItems.length,
    }

    for (const item of flatItems) {
      calculations.totalSum += item.total || 0
      calculations.totalVolume += item.volume || 0

      if (item.materialPriceWithVAT && item.volume) {
        calculations.totalMaterialCost +=
          item.materialPriceWithVAT * item.volume
      }

      if (item.workPrice && item.volume) {
        calculations.totalWorkCost += item.workPrice * item.volume
      }

      if (item.deliveryPrice && item.volume) {
        calculations.totalDeliveryCost += item.deliveryPrice * item.volume
      }
    }

    console.log('Estimate Calculator: Расчеты обновлены', {
      totalSum: calculations.totalSum,
      itemsCount: calculations.itemsCount,
      timestamp: new Date().toISOString(),
    })

    return calculations
  }

  static recalculateItem(item: EstimateItem): EstimateItem {
    const updatedItem = { ...item }

    // Пересчитываем итоговую сумму
    let total = 0

    if (item.volume) {
      // Стоимость работ
      if (item.workPrice) {
        total += item.workPrice * item.volume
      }

      // Стоимость материалов
      if (item.materialPriceWithVAT) {
        const materialCost = item.materialPriceWithVAT * item.volume
        if (item.materialCoeff) {
          total += materialCost * item.materialCoeff
        } else {
          total += materialCost
        }
      }

      // Стоимость доставки
      if (item.deliveryPrice) {
        total += item.deliveryPrice * item.volume
      }
    }

    updatedItem.total = total
    updatedItem.isModified = true

    console.log('Estimate Calculator: Позиция пересчитана', {
      itemId: item.id,
      oldTotal: item.total,
      newTotal: total,
      volume: item.volume,
    })

    return updatedItem
  }

  static generateAnalytics(items: EstimateItem[]): EstimateAnalytics {
    const flatItems = this.flattenItems(items)
    const totalSum = flatItems.reduce((sum, item) => sum + (item.total || 0), 0)

    // Аналитика по заказчикам
    const contractorMap = new Map<string, { total: number; count: number }>()
    flatItems.forEach(item => {
      const contractor = item.contractor || 'Не указан'
      const current = contractorMap.get(contractor) || { total: 0, count: 0 }
      contractorMap.set(contractor, {
        total: current.total + (item.total || 0),
        count: current.count + 1,
      })
    })

    const byContractor = Array.from(contractorMap.entries())
      .map(([contractor, data]) => ({
        contractor,
        total: data.total,
        count: data.count,
        percentage: totalSum > 0 ? (data.total / totalSum) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Аналитика по типам материалов
    const materialTypeMap = new Map<string, { total: number; count: number }>()
    flatItems.forEach(item => {
      const materialType = item.materialType || 'Не указан'
      const current = materialTypeMap.get(materialType) || {
        total: 0,
        count: 0,
      }
      materialTypeMap.set(materialType, {
        total: current.total + (item.total || 0),
        count: current.count + 1,
      })
    })

    const byMaterialType = Array.from(materialTypeMap.entries())
      .map(([materialType, data]) => ({
        materialType,
        total: data.total,
        count: data.count,
        percentage: totalSum > 0 ? (data.total / totalSum) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Аналитика по единицам измерения
    const unitMap = new Map<
      string,
      { totalVolume: number; totalCost: number; count: number }
    >()
    flatItems.forEach(item => {
      const unit = item.unit || 'Не указана'
      const current = unitMap.get(unit) || {
        totalVolume: 0,
        totalCost: 0,
        count: 0,
      }
      unitMap.set(unit, {
        totalVolume: current.totalVolume + (item.volume || 0),
        totalCost: current.totalCost + (item.total || 0),
        count: current.count + 1,
      })
    })

    const byUnit = Array.from(unitMap.entries())
      .map(([unit, data]) => ({
        unit,
        totalVolume: data.totalVolume,
        avgPrice: data.totalVolume > 0 ? data.totalCost / data.totalVolume : 0,
        count: data.count,
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)

    // Топ самых дорогих позиций
    const topExpensiveItems = [...flatItems]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10)

    // Топ позиций по объему
    const topVolumeItems = [...flatItems]
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 10)

    const analytics: EstimateAnalytics = {
      byContractor,
      byMaterialType,
      byUnit,
      topExpensiveItems,
      topVolumeItems,
    }

    console.log('Estimate Calculator: Аналитика сгенерирована', {
      contractorsCount: byContractor.length,
      materialTypesCount: byMaterialType.length,
      unitsCount: byUnit.length,
      timestamp: new Date().toISOString(),
    })

    return analytics
  }

  static applyVolumeChange(
    items: EstimateItem[],
    percentage: number
  ): EstimateItem[] {
    const multiplier = 1 + percentage / 100

    const updateItem = (item: EstimateItem): EstimateItem => {
      const updatedItem = {
        ...item,
        volume: (item.volume || 0) * multiplier,
        isModified: true,
      }

      // Пересчитываем итоговую сумму
      updatedItem.total = this.recalculateItem(updatedItem).total

      // Обновляем дочерние элементы
      if (item.children) {
        updatedItem.children = item.children.map(updateItem)
      }

      return updatedItem
    }

    console.log('Estimate Calculator: Применено изменение объема', {
      percentage,
      multiplier,
      itemsCount: items.length,
    })

    return items.map(updateItem)
  }

  static applyPriceChange(
    items: EstimateItem[],
    field: 'workPrice' | 'materialPriceWithVAT' | 'deliveryPrice',
    percentage: number
  ): EstimateItem[] {
    const multiplier = 1 + percentage / 100

    const updateItem = (item: EstimateItem): EstimateItem => {
      const updatedItem = { ...item, isModified: true }

      if (item[field] !== undefined) {
        updatedItem[field] = (item[field] as number) * multiplier
      }

      // Пересчитываем итоговую сумму
      updatedItem.total = this.recalculateItem(updatedItem).total

      // Обновляем дочерние элементы
      if (item.children) {
        updatedItem.children = item.children.map(updateItem)
      }

      return updatedItem
    }

    console.log('Estimate Calculator: Применено изменение цены', {
      field,
      percentage,
      multiplier,
      itemsCount: items.length,
    })

    return items.map(updateItem)
  }

  private static flattenItems(items: EstimateItem[]): EstimateItem[] {
    const result: EstimateItem[] = []

    const traverse = (items: EstimateItem[]) => {
      for (const item of items) {
        result.push(item)
        if (item.children) {
          traverse(item.children)
        }
      }
    }

    traverse(items)
    return result
  }
}
