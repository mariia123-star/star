// Скрипт для диагностики базы данных через браузер
// Выполните этот код в консоли разработчика браузера на странице приложения

async function debugTenderEstimates() {
  console.log('=== Диагностика таблицы tender_estimates ===')

  try {
    // Получаем Supabase клиент из глобального контекста
    const supabase = window._supabaseClient || window.supabase

    if (!supabase) {
      console.error('Supabase клиент не найден в глобальном контексте')
      return
    }

    console.log('1. Проверка общего количества записей...')
    const { count: totalCount, error: countError } = await supabase
      .from('tender_estimates')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Ошибка подсчета записей:', countError)
    } else {
      console.log(`Общее количество записей: ${totalCount}`)
    }

    console.log('2. Проверка группировки по record_type...')
    const { data: allRecords, error: allError } = await supabase
      .from('tender_estimates')
      .select('record_type, materials, works')
      .limit(1000)

    if (allError) {
      console.error('Ошибка получения записей:', allError)
    } else {
      console.log(`Получено записей: ${allRecords?.length || 0}`)

      // Группировка по record_type
      const groupedByType = {}
      allRecords?.forEach(record => {
        const type = record.record_type || 'NULL'
        groupedByType[type] = (groupedByType[type] || 0) + 1
      })

      console.log('Группировка по record_type:')
      Object.entries(groupedByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`)
      })
    }

    console.log('3. Проверка последних добавленных записей...')
    const { data: recentRecords, error: recentError } = await supabase
      .from('tender_estimates')
      .select('id, materials, works, record_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Ошибка получения последних записей:', recentError)
    } else {
      console.log('Последние 10 записей:')
      recentRecords?.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`)
        console.log(`     Материалы: "${record.materials}"`)
        console.log(`     Работы: "${record.works}"`)
        console.log(`     Тип записи: ${record.record_type || 'NULL'}`)
        console.log(`     Создано: ${record.created_at}`)
        console.log('     ---')
      })
    }

    console.log('4. Проверка структуры таблицы через introspection...')
    try {
      const { data: tableInfo, error: tableError } = await supabase.rpc(
        'pg_get_tabledef',
        { table_name: 'tender_estimates' }
      )

      if (tableError) {
        console.log(
          'RPC функция pg_get_tabledef недоступна, используем альтернативный метод'
        )

        // Альтернативный способ - попробуем получить информацию о колонках через select
        const { data: sampleRecord, error: sampleError } = await supabase
          .from('tender_estimates')
          .select('*')
          .limit(1)
          .single()

        if (!sampleError && sampleRecord) {
          console.log('Структура таблицы (по образцу записи):')
          Object.keys(sampleRecord).forEach(field => {
            const value = sampleRecord[field]
            const type = value === null ? 'NULL' : typeof value
            console.log(`  ${field}: ${type} = ${value}`)
          })
        }
      } else {
        console.log('Определение таблицы:')
        console.log(tableInfo)
      }
    } catch (introspectionError) {
      console.log('Не удалось получить структуру таблицы:', introspectionError)
    }

    console.log('5. Проверка наличия новых полей...')
    const { data: fieldsTest, error: fieldsError } = await supabase
      .from('tender_estimates')
      .select(
        'record_type, material_type, coefficient, work_price, material_price, delivery_cost'
      )
      .limit(1)

    if (fieldsError) {
      console.error('Ошибка при проверке новых полей:', fieldsError)
      console.log(
        'Возможно, поля record_type, material_type, coefficient, work_price, material_price, delivery_cost не существуют в таблице'
      )
    } else {
      console.log('Новые поля доступны:', fieldsTest)
    }

    console.log('=== Диагностика завершена ===')
  } catch (error) {
    console.error('Общая ошибка при диагностике:', error)
  }
}

// Выполняем диагностику
debugTenderEstimates()
