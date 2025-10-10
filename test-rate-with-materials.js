/**
 * Тест создания расценки с материалами
 * Проверяет всю цепочку: создание расценки → создание связей в rate_materials_mapping
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRateWithMaterials() {
  console.log('\n🧪 Тест создания расценки с материалами\n')

  try {
    // Шаг 1: Получаем существующую категорию стоимости
    console.log('1️⃣ Получение категории стоимости...')
    const { data: costCategories, error: costCatError } = await supabase
      .from('cost_categories')
      .select('id, name')
      .limit(1)

    if (costCatError) throw costCatError
    if (!costCategories || costCategories.length === 0) {
      throw new Error('Нет категорий стоимости в БД')
    }

    const costCategoryId = costCategories[0].id
    console.log(`✅ Категория: ${costCategories[0].name} (${costCategoryId})`)

    // Шаг 2: Получаем несколько материалов для теста
    console.log('\n2️⃣ Получение материалов...')
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('id, code, name, last_purchase_price')
      .limit(3)

    if (materialsError) throw materialsError
    if (!materials || materials.length === 0) {
      throw new Error('Нет материалов в БД')
    }

    console.log(`✅ Получено ${materials.length} материалов:`)
    materials.forEach((m, i) => {
      console.log(
        `   ${i + 1}. ${m.code} - ${m.name} (${m.last_purchase_price || 0} руб.)`
      )
    })

    // Шаг 3: Создаем тестовую расценку
    console.log('\n3️⃣ Создание тестовой расценки...')
    const testRate = {
      code: `TEST-${Date.now().toString().slice(-6)}`,
      name: 'Тестовая расценка для проверки связей с материалами',
      description:
        'Создана автотестом для проверки работы rate_materials_mapping',
      category: 'general_construction',
      cost_category_id: costCategoryId,
      unit_name: 'м³',
      labor_cost: 1000,
      equipment_cost: 500,
      material_cost: 2000,
      overhead_cost: 350,
      profit: 150,
      total_cost: 4000,
      is_active: true,
    }

    const { data: createdRate, error: createRateError } = await supabase
      .from('rates')
      .insert(testRate)
      .select()
      .single()

    if (createRateError) throw createRateError
    console.log(
      `✅ Расценка создана: ${createdRate.code} (ID: ${createdRate.id})`
    )

    // Шаг 4: Создаем связи с материалами
    console.log('\n4️⃣ Создание связей с материалами...')
    const rateMaterials = materials.map((material, index) => ({
      rate_id: createdRate.id,
      material_id: material.id,
      consumption: (index + 1) * 0.5, // 0.5, 1.0, 1.5
      unit_price: material.last_purchase_price || 0,
      notes: `Добавлен автотестом #${index + 1}`,
    }))

    const { data: createdRateMaterials, error: createRateMaterialsError } =
      await supabase.from('rate_materials_mapping').insert(rateMaterials)
        .select(`
        *,
        material:materials (
          id,
          code,
          name,
          last_purchase_price
        )
      `)

    if (createRateMaterialsError) {
      console.error('❌ Ошибка создания связей:', createRateMaterialsError)
      throw createRateMaterialsError
    }

    console.log(`✅ Создано ${createdRateMaterials.length} связей:`)
    createdRateMaterials.forEach((rm, i) => {
      console.log(
        `   ${i + 1}. ${rm.material.code} - расход: ${rm.consumption}, цена: ${rm.unit_price}`
      )
    })

    // Шаг 5: Проверяем, что связи сохранились
    console.log('\n5️⃣ Проверка сохраненных связей...')
    const { data: savedRateMaterials, error: fetchError } = await supabase
      .from('rate_materials_mapping')
      .select(
        `
        *,
        material:materials (
          id,
          code,
          name
        )
      `
      )
      .eq('rate_id', createdRate.id)

    if (fetchError) throw fetchError

    console.log(
      `✅ В БД сохранено ${savedRateMaterials.length} связей для расценки ${createdRate.code}`
    )
    savedRateMaterials.forEach((rm, i) => {
      console.log(`   ${i + 1}. ${rm.material.code} - ${rm.material.name}`)
    })

    // Шаг 6: Очистка - удаляем тестовые данные
    console.log('\n6️⃣ Очистка тестовых данных...')

    // Сначала удаляем связи
    const { error: deleteMappingError } = await supabase
      .from('rate_materials_mapping')
      .delete()
      .eq('rate_id', createdRate.id)

    if (deleteMappingError) {
      console.warn('⚠️  Ошибка удаления связей:', deleteMappingError.message)
    } else {
      console.log('✅ Связи удалены')
    }

    // Затем удаляем саму расценку
    const { error: deleteRateError } = await supabase
      .from('rates')
      .delete()
      .eq('id', createdRate.id)

    if (deleteRateError) {
      console.warn('⚠️  Ошибка удаления расценки:', deleteRateError.message)
    } else {
      console.log('✅ Расценка удалена')
    }

    console.log('\n✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!')
    console.log('━'.repeat(60))
    console.log('Создание расценок с материалами работает корректно.')
    console.log('Проблема может быть на уровне фронтенда.')
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА:', error.message)
    if (error.details) console.error('Детали:', error.details)
    if (error.hint) console.error('Подсказка:', error.hint)
    process.exit(1)
  }
}

testRateWithMaterials()
