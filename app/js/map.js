/**
 * Модуль работы с Яндекс Картами API 3.0
 */

let map = null;
let markers = [];
let popup = null;

// Начальная позиция — центр России
// Яндекс Карты API 3.0 использует формат [longitude, latitude]
const INITIAL_LOCATION = {
    center: [37.573856, 55.751574],
    zoom: 4
};

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

    // Создаём карту
    map = new YMap(
        document.getElementById(containerId),
        {
            location: INITIAL_LOCATION
        }
    );

    // Добавляем слои
    map.addChild(new YMapDefaultSchemeLayer());
    map.addChild(new YMapDefaultFeaturesLayer({ zIndex: 1800 }));

    // Скрываем индикатор загрузки
    const loadingEl = document.getElementById('map-loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }

    return map;
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

    if (points.length === 0) return;

    const { YMapMarker } = ymaps3;

    // Создаём маркеры для каждой точки
    // Яндекс Карты API 3.0 использует [longitude, latitude], а данные в [lat, lon]
    points.forEach(point => {
        const coordinates = [point.coords[1], point.coords[0]]; // [lon, lat]

        const element = document.createElement('div');
        element.className = 'point-marker';
        element.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F44336"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
        `;

        element.addEventListener('click', (e) => {
            e.stopPropagation();
            showPopup(point, coordinates);
        });

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
