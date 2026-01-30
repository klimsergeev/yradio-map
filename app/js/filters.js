/**
 * Модуль фильтрации с двусторонней зависимостью
 */

let allPoints = [];
let allFilters = { regions: [], brands: [] };
let currentValues = { region: null, brand: null };
let callbacks = {};

// DOM элементы
let regionFilter, brandFilter;
let regionInput, brandInput;
let regionDropdown, brandDropdown;
let resetBtn;

/**
 * Инициализация фильтров
 * @param {Object} filters - Данные фильтров { regions, brands }
 * @param {Array} points - Массив всех точек
 * @param {Object} options - Колбэки { onFilterChange }
 */
export function initFilters(filters, points, options = {}) {
    allFilters = filters;
    allPoints = points;
    callbacks = options;

    // Получаем DOM элементы
    regionFilter = document.getElementById('region-filter');
    brandFilter = document.getElementById('brand-filter');
    regionInput = document.getElementById('region-input');
    brandInput = document.getElementById('brand-input');
    regionDropdown = regionFilter.querySelector('.filter-dropdown');
    brandDropdown = brandFilter.querySelector('.filter-dropdown');

    // Инициализация dropdown'ов
    initDropdown(regionFilter, regionInput, regionDropdown, 'region');
    initDropdown(brandFilter, brandInput, brandDropdown, 'brand');

    // Первоначальный рендер
    renderDropdown(regionDropdown, allFilters.regions, 'region');
    renderDropdown(brandDropdown, allFilters.brands, 'brand');

    // Кнопка сброса
    resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', resetFilters);

    // Скрываем кнопку по умолчанию
    updateResetButtonVisibility();
}

/**
 * Инициализация одного dropdown
 */
function initDropdown(container, input, dropdown, type) {
    let highlightedIndex = -1;
    const clearBtn = container.querySelector('.filter-clear');

    // Открытие при фокусе
    input.addEventListener('focus', () => {
        openDropdown(dropdown);
        highlightedIndex = -1;
    });

    // Поиск при вводе
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        const items = getAvailableItems(type);
        const filtered = query
            ? items.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.cities && item.cities.some(city =>
                    city.toLowerCase().includes(query)
                ))
              )
            : items;

        renderDropdown(dropdown, filtered, type);
        openDropdown(dropdown);
        highlightedIndex = -1;
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('li:not(.no-results)');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
                updateHighlight(items, highlightedIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, 0);
                updateHighlight(items, highlightedIndex);
                break;

            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && items[highlightedIndex]) {
                    selectItem(type, items[highlightedIndex].dataset.id);
                }
                break;

            case 'Escape':
                closeDropdown(dropdown);
                input.blur();
                break;
        }
    });

    // Клик по элементу
    dropdown.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.id) {
            selectItem(type, li.dataset.id);
        }
    });

    // Кнопка очистки
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFilter(type);
    });

    // Закрытие при клике вне
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            closeDropdown(dropdown);
        }
    });
}

/**
 * Рендер списка dropdown
 */
function renderDropdown(dropdown, items, type) {
    if (items.length === 0) {
        dropdown.innerHTML = '<li class="no-results">Ничего не найдено</li>';
        return;
    }

    dropdown.innerHTML = items.map(item => `
        <li data-id="${item.id}" class="${currentValues[type] === item.id ? 'selected' : ''}">
            <span class="item-name">${item.name}</span>
            <span class="item-count">${item.count}</span>
        </li>
    `).join('');
}

/**
 * Выбор элемента
 */
function selectItem(type, id) {
    const items = type === 'region' ? allFilters.regions : allFilters.brands;
    const item = items.find(i => i.id === id);

    if (!item) return;

    currentValues[type] = id;

    const input = type === 'region' ? regionInput : brandInput;
    const dropdown = type === 'region' ? regionDropdown : brandDropdown;
    const container = type === 'region' ? regionFilter : brandFilter;

    input.value = item.name;
    container.classList.add('has-value');
    closeDropdown(dropdown);

    // Обновляем противоположный фильтр
    updateDependentFilter(type);

    // Обновляем видимость кнопки сброса
    updateResetButtonVisibility();

    // Вызываем callback
    if (callbacks.onFilterChange) {
        callbacks.onFilterChange(currentValues);
    }
}

/**
 * Очистка одного фильтра
 */
function clearFilter(type) {
    currentValues[type] = null;

    const input = type === 'region' ? regionInput : brandInput;
    const container = type === 'region' ? regionFilter : brandFilter;
    const dropdown = type === 'region' ? regionDropdown : brandDropdown;

    input.value = '';
    container.classList.remove('has-value');

    // Обновляем списки
    updateDependentFilter(type);
    renderDropdown(dropdown, getAvailableItems(type), type);

    // Обновляем видимость кнопки сброса
    updateResetButtonVisibility();

    if (callbacks.onFilterChange) {
        callbacks.onFilterChange(currentValues);
    }
}

/**
 * Обновление зависимого фильтра
 */
function updateDependentFilter(changedType) {
    const otherType = changedType === 'region' ? 'brand' : 'region';
    const otherDropdown = otherType === 'region' ? regionDropdown : brandDropdown;

    // Обновляем список с новыми счётчиками
    renderDropdown(otherDropdown, getAvailableItems(otherType), otherType);
}

/**
 * Получить доступные элементы с учётом выбранного фильтра
 */
function getAvailableItems(type) {
    const otherType = type === 'region' ? 'brand' : 'region';
    const otherValue = currentValues[otherType];

    if (!otherValue) {
        // Если ничего не выбрано — возвращаем все
        return type === 'region' ? allFilters.regions : allFilters.brands;
    }

    // Фильтруем точки по выбранному значению
    const filteredPoints = allPoints.filter(p => {
        return otherType === 'region'
            ? p.region.id === otherValue
            : p.brand.id === otherValue;
    });

    // Считаем элементы в отфильтрованных точках
    const counts = {};
    filteredPoints.forEach(p => {
        const id = type === 'region' ? p.region.id : p.brand.id;
        counts[id] = (counts[id] || 0) + 1;
    });

    // Возвращаем только те, что есть в отфильтрованных
    const allItems = type === 'region' ? allFilters.regions : allFilters.brands;
    return allItems
        .filter(item => counts[item.id])
        .map(item => ({
            ...item,
            count: counts[item.id]
        }));
}

/**
 * Сброс всех фильтров
 */
export function resetFilters() {
    currentValues = { region: null, brand: null };

    regionInput.value = '';
    brandInput.value = '';
    regionFilter.classList.remove('has-value');
    brandFilter.classList.remove('has-value');

    renderDropdown(regionDropdown, allFilters.regions, 'region');
    renderDropdown(brandDropdown, allFilters.brands, 'brand');

    // Скрываем кнопку сброса
    updateResetButtonVisibility();

    // Закрываем popup на карте
    if (callbacks.onResetFilters) {
        callbacks.onResetFilters();
    }

    if (callbacks.onFilterChange) {
        callbacks.onFilterChange(currentValues);
    }
}

/**
 * Обновление видимости кнопки сброса
 */
function updateResetButtonVisibility() {
    const hasFilters = currentValues.region !== null || currentValues.brand !== null;
    resetBtn.classList.toggle('hidden', !hasFilters);
}

/**
 * Установить значения фильтров (для восстановления из URL)
 */
export function setFilterValues(values) {
    if (values.region) {
        const regionItem = allFilters.regions.find(r => r.id === values.region);
        if (regionItem) {
            currentValues.region = values.region;
            regionInput.value = regionItem.name;
            regionFilter.classList.add('has-value');
        }
    }

    if (values.brand) {
        const brandItem = allFilters.brands.find(b => b.id === values.brand);
        if (brandItem) {
            currentValues.brand = values.brand;
            brandInput.value = brandItem.name;
            brandFilter.classList.add('has-value');
        }
    }

    // Обновляем списки
    renderDropdown(regionDropdown, getAvailableItems('region'), 'region');
    renderDropdown(brandDropdown, getAvailableItems('brand'), 'brand');

    // Обновляем видимость кнопки сброса
    updateResetButtonVisibility();
}

/**
 * Получить текущие значения фильтров
 */
export function getFilterValues() {
    return { ...currentValues };
}

/**
 * Получить отфильтрованные точки
 */
export function getFilteredPoints() {
    return allPoints.filter(point => {
        if (currentValues.region && point.region.id !== currentValues.region) {
            return false;
        }
        if (currentValues.brand && point.brand.id !== currentValues.brand) {
            return false;
        }
        return true;
    });
}

// Вспомогательные функции
function openDropdown(dropdown) {
    dropdown.classList.add('open');
}

function closeDropdown(dropdown) {
    dropdown.classList.remove('open');
}

function updateHighlight(items, index) {
    items.forEach((item, i) => {
        item.classList.toggle('highlighted', i === index);
    });

    if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}
