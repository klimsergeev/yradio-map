/**
 * Главный модуль приложения
 */

import { initMap, updateMarkers, fitToPoints, fitToAllPoints, closePopup } from './map.js';
import { initFilters, getFilteredPoints, setFilterValues, resetFilters, getFilterValues } from './filters.js';
import { loadFromUrl, saveToUrl, onUrlChange } from './url-state.js';
import { getCachedData, setCachedData } from './cache.js';

// Определяем базовый путь относительно расположения скрипта
const scriptUrl = import.meta.url;
const baseUrl = new URL('../', scriptUrl).href;
const DATA_URL = baseUrl + 'data/points.json';

let appData = null;

/**
 * Загрузка данных
 */
async function loadData() {
    // Попытка загрузить из кэша
    const cached = getCachedData('points-data');
    if (cached) {
        console.log('Loaded from cache');
        return cached;
    }

    // Загрузка с сервера
    console.log('Loading from server...');
    const response = await fetch(DATA_URL);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Сохранение в кэш
    setCachedData('points-data', data);

    return data;
}

/**
 * Обновление вида (карта + счётчик)
 */
function updateView() {
    const filteredPoints = getFilteredPoints();
    const filterValues = getFilterValues();

    // Обновляем маркеры на карте
    updateMarkers(filteredPoints);

    // Обновляем счётчик
    document.getElementById('points-count').textContent = filteredPoints.length;

    // Сохраняем в URL
    saveToUrl(filterValues);

    // Автозум при выборе региона
    if (filterValues.region && filteredPoints.length > 0) {
        fitToPoints(filteredPoints);
    }
}

/**
 * Обработчик изменения фильтров
 */
function handleFilterChange(values) {
    updateView();
}

/**
 * Обработчик изменения URL (кнопки назад/вперёд)
 */
function handleUrlChange(state) {
    setFilterValues(state);
    updateView();
}

/**
 * Мобильное меню
 */
function initMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('mobile-filter-toggle');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        toggleBtn.style.display = 'none';
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        toggleBtn.style.display = '';
        document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Закрытие при выборе фильтра на мобильных
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('.filter-dropdown li')) {
            // Небольшая задержка для визуального фидбэка
            setTimeout(closeSidebar, 150);
        }
    });
}

/**
 * Инициализация приложения
 */
async function init() {
    try {
        console.log('Initializing app...');

        // Загрузка данных
        appData = await loadData();
        console.log(`Loaded ${appData.points.length} points`);

        // Отображаем период цен
        const periodEl = document.getElementById('price-period');
        if (periodEl && appData.meta.pricesPeriod) {
            periodEl.textContent = `Цены: ${appData.meta.pricesPeriod}`;
        }

        // Инициализация карты
        await initMap('map');
        console.log('Map initialized');

        // Инициализация фильтров
        const filtersCallbacks = {
            onFilterChange: handleFilterChange,
            onResetFilters: closePopup
        };
        initFilters(appData.filters, appData.points, filtersCallbacks);
        console.log('Filters initialized');

        // Восстановление состояния из URL
        const urlState = loadFromUrl();
        if (urlState.region || urlState.brand) {
            setFilterValues(urlState);
        }

        // Первоначальная отрисовка
        updateView();

        // Если нет фильтров — показываем все точки
        if (!urlState.region && !urlState.brand) {
            fitToAllPoints(appData.points);
        }

        // Слушатель изменения URL
        onUrlChange(handleUrlChange);

        // Мобильное меню
        initMobileMenu();

        console.log('App ready!');

    } catch (error) {
        console.error('Failed to initialize app:', error);

        const mapEl = document.getElementById('map');
        const loadingEl = document.getElementById('map-loading');

        if (loadingEl) {
            loadingEl.textContent = 'Ошибка загрузки данных';
            loadingEl.style.color = '#d32f2f';
        }
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
