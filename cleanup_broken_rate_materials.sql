-- Очистка битых данных в rate_materials_mapping

-- 1. Проверяем битые записи (материалы, которых нет в таблице materials)
SELECT
  rmm.id,
  rmm.rate_id,
  rmm.material_id,
  rmm.created_at
FROM public.rate_materials_mapping rmm
LEFT JOIN public.materials m ON rmm.material_id = m.id
WHERE m.id IS NULL;

-- 2. Удаляем битые записи
DELETE FROM public.rate_materials_mapping
WHERE material_id NOT IN (
  SELECT id FROM public.materials
);

-- 3. Проверяем результат - должно быть 0 записей
SELECT
  COUNT(*) as broken_records_count
FROM public.rate_materials_mapping rmm
LEFT JOIN public.materials m ON rmm.material_id = m.id
WHERE m.id IS NULL;

-- 4. Показываем текущие корректные данные
SELECT
  rmm.id,
  rmm.rate_id,
  r.code as rate_code,
  r.name as rate_name,
  rmm.material_id,
  m.code as material_code,
  m.name as material_name,
  rmm.consumption,
  rmm.unit_price
FROM public.rate_materials_mapping rmm
JOIN public.rates r ON rmm.rate_id = r.id
JOIN public.materials m ON rmm.material_id = m.id
ORDER BY rmm.created_at DESC;
