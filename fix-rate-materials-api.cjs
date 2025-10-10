const fs = require('fs')

const filePath = 'src/entities/rates/api/rate-materials-api.ts'
let content = fs.readFileSync(filePath, 'utf8')

// Находим и заменяем метод getByRateId
const oldPattern =
  /const \{ data, error \} = await supabase\s+\.from\('rate_materials_mapping'\)\s+\.select\(`[\s\S]*?`\)\s+\.eq\('rate_id', rateId\)\s+\.order\('created_at', \{ ascending: true \}\)\s+console\.log\('API Response: Materials for rate',[\s\S]*?\)\s+if \(error\) \{[\s\S]*?throw error\s+\}\s+return data \|\| \[\]/

const newCode = `// Получаем записи из mapping таблицы
    const { data: mappingData, error: mappingError } = await supabase
      .from('rate_materials_mapping')
      .select('*')
      .eq('rate_id', rateId)
      .order('created_at', { ascending: true })

    if (mappingError) {
      console.error('Get rate materials mapping error:', mappingError)
      throw mappingError
    }

    if (!mappingData || mappingData.length === 0) {
      console.log('API Response: No materials found for rate')
      return []
    }

    // Получаем все уникальные material_id
    const materialIds = [...new Set(mappingData.map(m => m.material_id))]

    // Получаем данные материалов
    const { data: materialsData, error: materialsError } = await supabase
      .from('materials')
      .select(\`
        id,
        code,
        name,
        description,
        unit_id,
        unit_name,
        unit_short_name,
        last_purchase_price,
        is_active,
        unit:units (
          id,
          name,
          short_name
        )
      \`)
      .in('id', materialIds)

    if (materialsError) {
      console.error('Get materials error:', materialsError)
      throw materialsError
    }

    // Объединяем данные
    const result = mappingData.map(mapping => ({
      ...mapping,
      material: materialsData?.find(m => m.id === mapping.material_id) || null
    }))

    console.log('API Response: Materials for rate', {
      action: 'get_materials_by_rate_response',
      success: true,
      dataCount: result.length,
      timestamp: new Date().toISOString(),
    })

    return result as RateMaterial[]`

content = content.replace(oldPattern, newCode)

fs.writeFileSync(filePath, content, 'utf8')
console.log('File updated successfully!')
