/**
 * Модуль работы с URL-параметрами
 * Формат: ?region=moscow-oblast&brand=lenta
 */

/**
 * Загрузить состояние фильтров из URL
 * @returns {{ region: string|null, brand: string|null }}
 */
export function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        region: params.get('region') || null,
        brand: params.get('brand') || null
    };
}

/**
 * Сохранить состояние фильтров в URL
 * @param {{ region: string|null, brand: string|null }} state
 */
export function saveToUrl(state) {
    const params = new URLSearchParams();

    if (state.region) {
        params.set('region', state.region);
    }
    if (state.brand) {
        params.set('brand', state.brand);
    }

    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    // Используем replaceState для обновления без создания истории
    // Используем pushState только при явном изменении фильтров
    window.history.replaceState(state, '', newUrl);
}

/**
 * Подписаться на изменения URL (кнопки назад/вперёд)
 * @param {function} callback - Функция-обработчик
 */
export function onUrlChange(callback) {
    window.addEventListener('popstate', (event) => {
        const state = event.state || loadFromUrl();
        callback(state);
    });
}

/**
 * Обновить URL с добавлением в историю (для шаринга)
 * @param {{ region: string|null, brand: string|null }} state
 */
export function pushToUrl(state) {
    const params = new URLSearchParams();

    if (state.region) {
        params.set('region', state.region);
    }
    if (state.brand) {
        params.set('brand', state.brand);
    }

    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    window.history.pushState(state, '', newUrl);
}
