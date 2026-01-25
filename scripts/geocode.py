#!/usr/bin/env python3
"""
Скрипт геокодирования адресов через Яндекс Геокодер API.
Обновляет колонки lat/lon в CSV-файле.
"""

import pandas as pd
import requests
import time
from pathlib import Path

# Отключаем буферизацию вывода
import sys
sys.stdout.reconfigure(line_buffering=True)

# Конфигурация
API_KEY = "cb4debfd-6a27-42fa-9356-b937e9b9bdc8"
GEOCODER_URL = "https://geocode-maps.yandex.ru/1.x/"
CSV_PATH = Path(__file__).parent.parent / "data" / "map_prices.csv"

# Настройки
DELAY_BETWEEN_REQUESTS = 0.1  # секунд между запросами
SAVE_EVERY_N_ROWS = 50        # сохранять CSV каждые N строк
MAX_RETRIES = 3               # повторных попыток при ошибке


def geocode_address(address: str, region: str) -> tuple[float | None, float | None, str]:
    """
    Геокодирует адрес через Яндекс API.

    Args:
        address: Адрес для геокодирования
        region: Регион для уточнения поиска

    Returns:
        (lat, lon, status) - координаты и статус
    """
    # Формируем полный адрес с регионом для лучшей точности
    full_address = f"Россия, {region}, {address}"

    params = {
        "apikey": API_KEY,
        "geocode": full_address,
        "format": "json",
        "results": 1
    }

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(GEOCODER_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            # Извлекаем координаты из ответа
            feature_member = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])

            if not feature_member:
                return None, None, "not_found"

            geo_object = feature_member[0].get("GeoObject", {})
            point = geo_object.get("Point", {}).get("pos", "")

            if not point:
                return None, None, "no_coords"

            # Яндекс возвращает "lon lat", нам нужно "lat, lon"
            lon, lat = map(float, point.split())

            # Проверяем точность (precision)
            precision = geo_object.get("metaDataProperty", {}).get("GeocoderMetaData", {}).get("precision", "")

            if precision in ["exact", "number", "near"]:
                return lat, lon, "ok"
            else:
                return lat, lon, f"low_precision:{precision}"

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
                continue
            return None, None, "timeout"

        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
                continue
            return None, None, f"error:{str(e)[:50]}"

        except (KeyError, ValueError, IndexError) as e:
            return None, None, f"parse_error:{str(e)[:50]}"

    return None, None, "max_retries"


def main():
    print(f"Загрузка данных из {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)

    total = len(df)

    # Считаем сколько уже геокодировано
    already_done = df["lat"].notna() & (df["lat"] != "")
    already_done_count = already_done.sum()

    print(f"Всего записей: {total}")
    print(f"Уже геокодировано: {already_done_count}")
    print(f"Осталось: {total - already_done_count}")
    print("-" * 50)

    # Статистика
    stats = {"ok": 0, "not_found": 0, "low_precision": 0, "error": 0}
    processed = 0

    try:
        for idx, row in df.iterrows():
            # Пропускаем уже геокодированные
            if pd.notna(row["lat"]) and row["lat"] != "":
                continue

            address = row["Адрес"]
            region = row["Регион"]

            # Геокодируем
            lat, lon, status = geocode_address(address, region)

            # Обновляем DataFrame
            if lat is not None:
                df.at[idx, "lat"] = lat
                df.at[idx, "lon"] = lon

            # Статистика
            if status == "ok":
                stats["ok"] += 1
            elif status == "not_found":
                stats["not_found"] += 1
            elif status.startswith("low_precision"):
                stats["low_precision"] += 1
                stats["ok"] += 1  # всё равно сохраняем
            else:
                stats["error"] += 1

            processed += 1

            # Прогресс
            if processed % 10 == 0:
                print(f"[{processed}/{total - already_done_count}] {status}: {region}, {address[:40]}...")

            # Периодическое сохранение
            if processed % SAVE_EVERY_N_ROWS == 0:
                df.to_csv(CSV_PATH, index=False, encoding="utf-8")
                print(f"  -> Сохранено ({processed} записей)")

            # Задержка между запросами
            time.sleep(DELAY_BETWEEN_REQUESTS)

    except KeyboardInterrupt:
        print("\n\nПрервано пользователем!")

    finally:
        # Сохраняем финальный результат
        df.to_csv(CSV_PATH, index=False, encoding="utf-8")
        print("-" * 50)
        print("Результаты:")
        print(f"  Успешно: {stats['ok']}")
        print(f"  Не найдено: {stats['not_found']}")
        print(f"  Низкая точность: {stats['low_precision']}")
        print(f"  Ошибки: {stats['error']}")
        print(f"\nCSV сохранён: {CSV_PATH}")


if __name__ == "__main__":
    main()
