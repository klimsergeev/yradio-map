# Figma MCP Configuration

## Подключение

Проект использует встроенный MCP-сервер Figma Desktop на порту 3845.

**Требования:**
- Figma Desktop установлен и запущен
- Dev Mode включён (требуется платная подписка)

**Конфиг** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "Figma": {
      "url": "http://127.0.0.1:3845/mcp",
      "headers": {}
    }
  }
}
```

---

## Доступные инструменты

### Основные

| Инструмент | Описание |
|------------|----------|
| `get_figma_data` | Получить структуру и стили из макета |
| `download_figma_images` | Скачать изображения/иконки |
| `get_design_context` | Получить контекст дизайна для выбранного элемента |
| `get_screenshot` | Сделать скриншот элемента |

### Дополнительные

| Инструмент | Описание |
|------------|----------|
| `get_variable_defs` | Получить переменные дизайн-системы |
| `get_code_connect_map` | Получить маппинг компонентов к коду |
| `add_code_connect_map` | Добавить связь компонента с кодом |
| `get_strategy_for_mapping` | Получить стратегию маппинга |
| `send_get_strategy_response` | Отправить ответ стратегии |
| `get_metadata` | Получить метаданные файла |
| `create_design_system_rules` | Создать правила дизайн-системы |
| `get_figjam` | Получить данные из FigJam |
| `get_code_for_selection` | Получить код для выбранного элемента |
| `map_selection_to_code_connect` | Связать выделение с Code Connect |

---

## Использование

### Получить данные макета

```
fileKey — из URL: figma.com/design/<fileKey>/...
nodeId — из параметра node-id в URL (формат: 39-357 или 39:357)
```

**Пример URL:**
```
https://www.figma.com/design/FZMiaKatf94PXSukdGYWoF/Y-Radio?node-id=39-357
```

**Параметры:**
- `fileKey`: `FZMiaKatf94PXSukdGYWoF`
- `nodeId`: `39-357`

### Ответ содержит

- Структуру элементов (дерево)
- Layout-параметры (padding, gap, sizing)
- Стили (цвета, шрифты, тени)
- Позиционирование (absolute/relative, координаты)
- Компоненты и их свойства

---

## Важно

1. **Figma Desktop должен быть запущен** — иначе MCP-сервер недоступен
2. **Не гадать** — если MCP не работает, сообщить пользователю
3. **Pixel-perfect** — все значения брать из ответа MCP, не округлять
