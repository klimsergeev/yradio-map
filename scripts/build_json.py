#!/usr/bin/env python3
"""
Скрипт для генерации points.json из CSV с применением маппингов.
"""

import pandas as pd
import json
import re
from pathlib import Path
from datetime import datetime

# Пути
BASE_DIR = Path(__file__).parent.parent
CSV_PATH = BASE_DIR / "data" / "map_prices.csv"
REGION_MAPPING_PATH = BASE_DIR / "data" / "mappings" / "region-mapping.json"
BRAND_MAPPING_PATH = BASE_DIR / "data" / "mappings" / "brand-mapping.json"
OUTPUT_PATH = BASE_DIR / "data" / "points.json"


def slugify(text: str) -> str:
    """Создаёт URL-safe идентификатор из текста."""
    # Транслитерация кириллицы
    translit = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '_': '-'
    }

    result = []
    for char in text.lower():
        if char in translit:
            result.append(translit[char])
        elif char.isalnum() or char == '-':
            result.append(char)

    # Убираем множественные дефисы
    slug = re.sub(r'-+', '-', ''.join(result))
    return slug.strip('-')


def main():
    print("Загрузка данных...")

    # Загрузка CSV
    df = pd.read_csv(CSV_PATH)
    print(f"  Записей в CSV: {len(df)}")

    # Загрузка маппингов
    with open(REGION_MAPPING_PATH, 'r', encoding='utf-8') as f:
        region_mapping = json.load(f)
    print(f"  Регионов в маппинге: {len(region_mapping)}")

    with open(BRAND_MAPPING_PATH, 'r', encoding='utf-8') as f:
        brand_mapping = json.load(f)
    print(f"  Брендов в маппинге: {len(brand_mapping)}")

    print("\nОбработка данных...")

    points = []
    region_counts = {}
    brand_counts = {}

    for idx, row in df.iterrows():
        raw_region = row['Регион']
        raw_brand = row['Название']

        # Нормализация региона
        if raw_region in region_mapping:
            region_info = region_mapping[raw_region]
            region_id = region_info['regionId']
            region_name = region_info['regionName']
            city = region_info.get('city') or raw_region
        else:
            region_id = slugify(raw_region)
            region_name = raw_region
            city = raw_region

        # Нормализация бренда (только для группировки)
        if raw_brand in brand_mapping:
            brand_info = brand_mapping[raw_brand]
            brand_id = brand_info['brandId']
            brand_name = brand_info['brandName']
        else:
            brand_id = slugify(raw_brand)
            brand_name = raw_brand

        # Формируем точку
        point = {
            "id": f"point-{idx + 1:04d}",
            "coords": [float(row['lat']), float(row['lon'])],
            "address": row['Адрес'],
            "brand": {
                "id": brand_id,
                "name": brand_name
            },
            "region": {
                "id": region_id,
                "name": region_name
            },
            "city": city,
            "price": int(row['Цена']) if pd.notna(row['Цена']) else None,
            "contacts": int(row['Контактов / мес']) if pd.notna(row['Контактов / мес']) else None,
            "hours": row['Часы работы'] if pd.notna(row['Часы работы']) else None
        }

        points.append(point)

        # Подсчёт для фильтров
        region_counts[region_id] = region_counts.get(region_id, 0) + 1
        brand_counts[brand_id] = brand_counts.get(brand_id, 0) + 1

    print(f"  Обработано точек: {len(points)}")

    # Формируем списки для фильтров
    # Получаем уникальные имена регионов
    region_names = {}
    brand_names = {}
    for p in points:
        region_names[p['region']['id']] = p['region']['name']
        brand_names[p['brand']['id']] = p['brand']['name']

    regions_list = [
        {"id": rid, "name": region_names[rid], "count": count}
        for rid, count in region_counts.items()
    ]
    regions_list.sort(key=lambda x: x['name'])

    brands_list = [
        {"id": bid, "name": brand_names[bid], "count": count}
        for bid, count in brand_counts.items()
    ]
    brands_list.sort(key=lambda x: x['name'])

    print(f"  Уникальных регионов: {len(regions_list)}")
    print(f"  Уникальных брендов: {len(brands_list)}")

    # Итоговая структура
    result = {
        "points": points,
        "filters": {
            "regions": regions_list,
            "brands": brands_list
        },
        "meta": {
            "totalPoints": len(points),
            "generatedAt": datetime.now().strftime("%Y-%m-%d"),
            "pricesPeriod": "01.02.2026 - 28.02.2026"
        }
    }

    # Сохранение
    print(f"\nСохранение в {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

    # Размер файла
    file_size = OUTPUT_PATH.stat().st_size / 1024
    print(f"  Размер файла: {file_size:.1f} KB")

    print("\nГотово!")


if __name__ == "__main__":
    main()
