function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function formatReviewDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getSafeImageUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const url = value.trim();

  if (!url) {
    return '';
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }

    return parsedUrl.href;
  } catch {
    return '';
  }
}

function normalizePhotos(review) {
  let photos = [];

  // Новый формат: photos — массив
  if (Array.isArray(review.photos)) {
    photos = review.photos;
  }

  // Совместимость с photo_url
  else if (Array.isArray(review.photo_url)) {
    photos = review.photo_url;
  }

  // Если сервер вернул JSON-строку
  else if (
    typeof review.photo_url === 'string' &&
    review.photo_url.trim()
  ) {
    const value = review.photo_url.trim();

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        photos = parsed;
      } else if (typeof parsed === 'string') {
        photos = [parsed];
      }
    } catch {
      // Совместимость со строками,
      // где ссылки разделены запятыми
      photos = value
        .split(',')
        .map((photo) => photo.trim())
        .filter(Boolean);
    }
  }

  return photos
    .map(getSafeImageUrl)
    .filter(Boolean);
}

function createPhotosHtml(review) {
  const photos = normalizePhotos(review);

  if (photos.length === 0) {
    return '';
  }

  return `
    <div class="review-photos">
      ${photos
        .map((photo, index) => `
          <img
            src="${escapeHtml(photo)}"
            alt="Фото к отзыву ${index + 1}"
            loading="lazy"
            data-full-image="${escapeHtml(photo)}"
          >
        `)
        .join('')}
    </div>
  `;
}

async function loadPublicReviews() {
  const container = document.getElementById('reviews-list');

  if (!container) {
    return;
  }

  try {
    const response = await fetch('/api/reviews');

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Сервер вернул некорректный формат данных');
    }

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = `
        <p class="reviews-empty">
          Пока нет опубликованных отзывов.
        </p>
      `;

      return;
    }

    data.forEach((review) => {
      const reviewElement = document.createElement('article');

      reviewElement.className = 'review-item';

      const rating = Math.max(
        0,
        Math.min(5, Number(review.rating) || 0)
      );

      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

     const reviewDate = formatReviewDate(review.created_at);

reviewElement.innerHTML = `
  <div class="review-item__top">
    <strong>${escapeHtml(review.name)}</strong>

    ${
      reviewDate
        ? `<time
            class="review-item__date"
            datetime="${escapeHtml(review.created_at)}"
          >
            ${escapeHtml(reviewDate)}
          </time>`
        : ''
    }
  </div>

  <span
    class="stars"
    aria-label="Оценка ${rating} из 5"
  >
    ${stars}
  </span>

  <p>${escapeHtml(review.text)}</p>

  ${createPhotosHtml(review)}
`;

      container.appendChild(reviewElement);
    });
  } catch (error) {
    console.error('Ошибка загрузки отзывов:', error);

    container.innerHTML = `
      <p class="reviews-error">
        Не удалось загрузить отзывы.
      </p>
    `;
  }
}

async function handleReviewSubmit(event) {
  event.preventDefault();

  const formElement = document.getElementById('review-form');
  const nameElement = document.getElementById('review-name');
  const ratingElement = document.getElementById('review-rating');
  const textElement = document.getElementById('review-text');
  const photosElement = document.getElementById('review-photos');
  const messageElement = document.getElementById('review-message');

  if (
    !formElement ||
    !nameElement ||
    !ratingElement ||
    !textElement ||
    !photosElement ||
    !messageElement
  ) {
    console.warn('Не все элементы формы найдены');
    return;
  }

  const name = nameElement.value.trim();
  const rating = ratingElement.value;
  const text = textElement.value.trim();

  if (!name || !rating || !text) {
    messageElement.textContent =
      'Заполни имя, оценку и текст отзыва';

    messageElement.style.color = '#b74949';

    return;
  }

  const formData = new FormData();

  formData.append('name', name);
  formData.append('rating', rating);
  formData.append('text', text);

  const files = Array.from(photosElement.files || []);

  if (files.length > 5) {
    messageElement.textContent =
      'Можно прикрепить не больше пяти фотографий';

    messageElement.style.color = '#b74949';

    return;
  }

  files.forEach((file) => {
    formData.append('photos', file);
  });

  messageElement.textContent = 'Отправка...';
  messageElement.style.color = '#555';

  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Не удалось сохранить отзыв'
      );
    }

    messageElement.textContent =
      'Отзыв успешно отправлен и ожидает модерации';

    messageElement.style.color = '#2ecc71';

    formElement.reset();

    // Новый отзыв имеет статус pending,
    // поэтому на публичной странице он сразу не появится
    await loadPublicReviews();
  } catch (error) {
    console.error('Ошибка отправки отзыва:', error);

    messageElement.textContent =
      error.message || 'Ошибка сети';

    messageElement.style.color = '#b74949';
  }
}

/* =========================
   Модальное окно фотографий
========================= */

function createImageModal() {
  const modal = document.createElement('div');

  modal.className = 'image-modal';

  modal.innerHTML = `
    <button
      class="image-modal__close"
      type="button"
      aria-label="Закрыть изображение"
    >
      ×
    </button>

    <img
      class="image-modal__image"
      src=""
      alt="Увеличенное изображение"
    >
  `;

  document.body.appendChild(modal);

  return modal;
}

function setupImageModal() {
  const modal = createImageModal();

  const modalImage = modal.querySelector(
    '.image-modal__image'
  );

  const closeButton = modal.querySelector(
    '.image-modal__close'
  );

  function openModal(image) {
    const imageUrl =
      image.dataset.fullImage || image.currentSrc || image.src;

    if (!imageUrl) {
      return;
    }

    modalImage.src = imageUrl;
    modalImage.alt = image.alt || 'Увеличенное изображение';

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modalImage.src = '';
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (event) => {
    const image = event.target.closest(
      '#reviews-list .review-photos img'
    );

    if (image) {
      openModal(image);
    }
  });

  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeModal();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
}

/* =========================
   Запуск
========================= */

document.addEventListener('DOMContentLoaded', () => {
  loadPublicReviews();

  const formElement = document.getElementById('review-form');

  if (formElement) {
    formElement.addEventListener(
      'submit',
      handleReviewSubmit
    );
  }

  setupImageModal();
});