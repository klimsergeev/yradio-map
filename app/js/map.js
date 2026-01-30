/**
 * Модуль работы с Яндекс Картами API 3.0
 */

let map = null;
let markers = [];
let popup = null;
let pointsMap = new Map(); // Хранилище данных точек по ID
let delegatedListenerAttached = false;

// Начальная позиция — центр России
// Яндекс Карты API 3.0 использует формат [longitude, latitude]
const INITIAL_LOCATION = {
    center: [37.573856, 55.751574],
    zoom: 4
};

/**
 * Обработчик клика по маркеру (делегирование событий)
 */
function handleMarkerClick(event) {
    const markerEl = event.target.closest('[data-point-id]');
    if (!markerEl) return;

    const pointId = markerEl.dataset.pointId;
    const pointData = pointsMap.get(pointId);
    if (!pointData) return;

    const coordinates = [pointData.coords[1], pointData.coords[0]]; // [lon, lat]
    showPopup(pointData, coordinates);
}

/**
 * Инициализация карты
 * @param {string} containerId - ID контейнера карты
 */
export async function initMap(containerId) {
    await ymaps3.ready;

    const {
        YMap,
        YMapDefaultSchemeLayer,
        YMapDefaultFeaturesLayer
    } = ymaps3;

    const container = document.getElementById(containerId);

    // Создаём карту
    map = new YMap(
        container,
        {
            location: INITIAL_LOCATION
        }
    );

    // Добавляем слои
    map.addChild(new YMapDefaultSchemeLayer());
    map.addChild(new YMapDefaultFeaturesLayer({ zIndex: 1800 }));

    // Один event listener на контейнере карты (делегирование событий)
    if (!delegatedListenerAttached) {
        container.addEventListener('click', handleMarkerClick);
        delegatedListenerAttached = true;
    }

    // Скрываем индикатор загрузки
    const loadingEl = document.getElementById('map-loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }

    return map;
}

/**
 * Генерация уникального ID для точки
 */
function generatePointId(point, index) {
    return `point-${index}-${point.coords[0]}-${point.coords[1]}`;
}

/**
 * Обновить маркеры на карте
 * @param {Array} points - Массив точек для отображения
 */
export async function updateMarkers(points) {
    if (!map) return;

    // Удаляем старые маркеры
    markers.forEach(m => map.removeChild(m));
    markers = [];
    pointsMap.clear();

    if (points.length === 0) return;

    const { YMapMarker } = ymaps3;

    // Создаём маркеры для каждой точки
    // Яндекс Карты API 3.0 использует [longitude, latitude], а данные в [lat, lon]
    points.forEach((point, index) => {
        const coordinates = [point.coords[1], point.coords[0]]; // [lon, lat]
        const pointId = generatePointId(point, index);

        // Сохраняем данные точки в Map
        pointsMap.set(pointId, point);

        const element = document.createElement('div');
        element.dataset.pointId = pointId; // data-атрибут для идентификации
        element.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#E53030"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`;
        element.style.cssText = 'cursor: pointer; transform: translate(-50%, -50%);';

        const marker = new YMapMarker(
            { coordinates },
            element
        );

        markers.push(marker);
        map.addChild(marker);
    });
}

/**
 * Показать popup с информацией о точке
 */
async function showPopup(point, coordinates) {
    // Закрываем предыдущий popup
    closePopup();

    const { YMapMarker } = ymaps3;

    const element = document.createElement('div');
    element.className = 'balloon';
    element.innerHTML = `
        <div class="balloon-brand">${escapeHtml(point.brand.name)}</div>
        <div class="balloon-address">${escapeHtml(point.address)}</div>
        <div class="balloon-city">${escapeHtml(point.city)}</div>
        <div class="balloon-details">
            <div class="balloon-row">
                <span class="balloon-label">Цена:</span>
                <span class="balloon-value">${formatPrice(point.price)} ₽/мес</span>
            </div>
            <div class="balloon-row">
                <span class="balloon-label">Контактов:</span>
                <span class="balloon-value">${formatNumber(point.contacts)}</span>
            </div>
            <div class="balloon-row">
                <span class="balloon-label">Часы работы:</span>
                <span class="balloon-value">${escapeHtml(point.hours || 'Не указано')}</span>
            </div>
        </div>
    `;

    // Создаём контейнер для popup
    const container = document.createElement('div');
    container.style.cssText = `
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transform: translate(-50%, -100%) translateY(-12px);
    `;
    container.appendChild(element);

    // Добавляем стрелку
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
    `;
    container.appendChild(arrow);

    // Добавляем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        border: none;
        background: #f5f5f5;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePopup();
    });
    container.appendChild(closeBtn);

    popup = new YMapMarker(
        { coordinates, zIndex: 2000 },
        container
    );

    map.addChild(popup);

    // Плавно перемещаем карту к точке со смещением вверх для видимости popup
    // Popup примерно 200px высотой + 12px отступ + стрелка
    // Смещаем центр вниз от точки, чтобы popup оказался по центру вьюпорта
    const currentZoom = map.zoom || 14;
    // Смещение в градусах зависит от зума: чем больше зум, тем меньше смещение
    const latOffset = 0.002 * Math.pow(2, 14 - currentZoom);

    map.setLocation({
        center: [coordinates[0], coordinates[1] - latOffset],
        zoom: currentZoom,
        duration: 400
    });
}

/**
 * Закрыть popup
 */
export function closePopup() {
    if (popup) {
        map.removeChild(popup);
        popup = null;
    }
}

/**
 * Переместить карту к региону (fit bounds)
 * @param {Array} points - Точки для вписывания
 */
export function fitToPoints(points) {
    if (!map || points.length === 0) return;

    // Данные в формате [lat, lon], нужно конвертировать в [lon, lat] для API
    const coords = points.map(p => [p.coords[1], p.coords[0]]);

    if (coords.length === 1) {
        // Одна точка — просто центрируем
        map.setLocation({
            center: coords[0],
            zoom: 14,
            duration: 500
        });
        return;
    }

    // Вычисляем bounds в формате [[minLon, minLat], [maxLon, maxLat]]
    const lons = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);

    const bounds = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
    ];

    map.setLocation({
        bounds,
        duration: 500
    });
}

/**
 * Показать все точки (вся Россия)
 */
export function fitToAllPoints(points) {
    fitToPoints(points);
}

// Вспомогательные функции
function formatPrice(price) {
    if (price == null) return 'Не указано';
    return price.toLocaleString('ru-RU');
}

function formatNumber(num) {
    if (num == null) return 'Не указано';
    return num.toLocaleString('ru-RU');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
