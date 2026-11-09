document.addEventListener("DOMContentLoaded", () => {
 

  "use strict";

  const cart = new Map();
  const FREE_DELIVERY_WEIGHT = 8;

  let lastFocusedElement = null;

  const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
  };

  const $$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
  };

  const elements = {
    openCart: $("#open-cart"),
    cartPanel: $("#cart-panel"),
    cartOverlay: $("#cart-overlay"),
    closeCart: $("#close-cart"),

    cartItems: $("#cart-items"),
    emptyCartMessage: $("#empty-cart-message"),

    cartCount: $("#cart-count"),
    headerTotalPrice: $("#header-total-price"),
    headerTotalWeight: $("#header-total-weight"),

    cartTotalPrice: $("#cart-total-price"),
    cartTotalWeight: $("#cart-total-weight"),
    deliveryStatus: $("#delivery-status"),
    checkoutButton: $("#checkout-button"),

    deliveryPanel: $("#delivery-panel"),
    deliveryOverlay: $("#delivery-overlay"),
    closeDelivery: $("#close-delivery"),
    deliveryNext: $("#delivery-next"),
    citySelect: $("#city"),
    cityError: $("#city-error"),

    checkoutPanel: $("#checkout-panel"),
    checkoutOverlay: $("#checkout-overlay"),
    closeCheckout: $("#close-checkout"),

    orderForm: $("#order-form"),
    formMessage: $("#form-message")
  };

  /*
   * Проверяем только действительно обязательные элементы.
   * Переменная missingElements объявлена здесь и используется
   * только внутри этой области видимости.
   */
  const requiredElementNames = [
    "openCart",
    "cartPanel",
    "cartOverlay",
    "closeCart",
    "cartItems",
    "emptyCartMessage",
    "cartCount",
    "headerTotalPrice",
    "headerTotalWeight",
    "cartTotalPrice",
    "cartTotalWeight",
    "deliveryStatus",
    "checkoutButton",
    "deliveryPanel",
    "deliveryOverlay",
    "closeDelivery",
    "deliveryNext",
    "citySelect",
    "checkoutPanel",
    "checkoutOverlay",
    "closeCheckout",
    "orderForm",
    "formMessage"
  ];

  const missingElements = requiredElementNames.filter(
    (name) => !elements[name]
  );

  if (missingElements.length > 0) {
    console.error(
      "В index.html отсутствуют обязательные элементы:",
      missingElements.join(", ")
    );

    return;
  }

  const productCards = $$(".product-card");

  if (productCards.length === 0) {
    console.warn("В index.html не найдены карточки товаров.");
  }

  function parseNumber(value) {
    if (value === null || value === undefined) {
      return 0;
    }

    const normalizedValue = String(value)
      .replace(/\s/g, "")
      .replace(",", ".");

    const number = Number(normalizedValue);

    return Number.isFinite(number) ? number : 0;
  }

  function formatPrice(value) {
    return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
  }

  function formatWeight(value) {
    return `${value.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })} кг`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getProductData(card) {
    const type = card.dataset.type || "product";
    const isMeat = type === "meat";

    return {
      id: card.dataset.id || "",
      name: card.dataset.name || "Товар",
      type,
      isMeat,
      price: isMeat ? null : parseNumber(card.dataset.price),
      weight: isMeat ? null : parseNumber(card.dataset.weight),
      quantity: 1
    };
  }

  function getCardQuantity(card) {
    const quantityElement = $(".quantity-value", card);

    if (!quantityElement) {
      return 1;
    }

    const quantity = parseInt(quantityElement.textContent, 10);

    return Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 1;
  }

  function setCardQuantity(card, quantity) {
    const quantityElement = $(".quantity-value", card);

    if (!quantityElement) {
      return;
    }

    quantityElement.textContent = Math.max(0, quantity);
  }

  function resetCardQuantity(productId) {
    const card = productCards.find(
      (productCard) => productCard.dataset.id === productId
    );

    if (card) {
      setCardQuantity(card, 1);
    }
  }

  function calculateTotals() {
    let totalPrice = 0;
    let totalWeight = 0;
    let totalQuantity = 0;

    cart.forEach((product) => {
      totalQuantity += product.quantity;

      /*
       * У мясных наборов цена и вес уточняются отдельно.
       */
      if (!product.isMeat) {
        totalPrice += product.price * product.quantity;
        totalWeight += product.weight * product.quantity;
      }else {
      // Мясо: НЕ считаем ни цену, ни вес. Только количество уже учтено выше.
      // Ничего не делаем — просто пропускаем расчёт цены/веса.
    }
    });

    return {
      totalPrice,
      totalWeight,
      totalQuantity
    };
  }

  function updateHeader() {
    const totals = calculateTotals();

    elements.cartCount.textContent = totals.totalQuantity;
    elements.headerTotalPrice.textContent = formatPrice(totals.totalPrice);
    elements.headerTotalWeight.textContent = formatWeight(totals.totalWeight);
  }

  function updateCartFooter() {
    const totals = calculateTotals();

    elements.cartTotalPrice.textContent = formatPrice(totals.totalPrice);
    elements.cartTotalWeight.textContent = formatWeight(totals.totalWeight);

    const hasMeatProduct = Array.from(cart.values()).some(
      (product) => product.isMeat
    );

    elements.deliveryStatus.classList.remove("is-free");

    if (totals.totalWeight >= FREE_DELIVERY_WEIGHT) {
      elements.deliveryStatus.textContent = "Бесплатная доставка";
      elements.deliveryStatus.classList.add("is-free");
    } else if (hasMeatProduct && totals.totalWeight === 0) {
      elements.deliveryStatus.textContent =
        "Для мясных наборов сумму и кг уточняйте в MAX";
    } else if (totals.totalWeight > 0) {
      elements.deliveryStatus.textContent =
        "Бесплатная доставка от 8 кг";
    } else {
      elements.deliveryStatus.textContent =
        "Добавьте товары для расчёта доставки";
    }
  }

  function createCartItem(product) {
    const item = document.createElement("article");

    item.className = "cart-item";
    item.dataset.id = product.id;

    if (product.isMeat) {
      item.innerHTML = `
        <div class="cart-item__info">
          <h3>${escapeHtml(product.name)}</h3>
          <p>Количество: ${product.quantity} шт.</p>
          <small>
            Сумма и вес уточняются в MAX
          </small>
        </div>

        <div class="cart-item__right">
          <div class="cart-item__controls">
            <button
              class="cart-item-minus"
              type="button"
              data-id="${escapeHtml(product.id)}"
              aria-label="Уменьшить количество"
            >
              −
            </button>

            <span>${product.quantity}</span>

            <button
              class="cart-item-plus"
              type="button"
              data-id="${escapeHtml(product.id)}"
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>

          <button
            class="cart-item-remove"
            type="button"
            data-id="${escapeHtml(product.id)}"
          >
            Удалить
          </button>
        </div>
      `;

      return item;
    }

    const itemPrice = product.price * product.quantity;
    const itemWeight = product.weight * product.quantity;

    item.innerHTML = `
      <div class="cart-item__info">
        <h3>${escapeHtml(product.name)}</h3>

        <p>
          ${formatPrice(product.price)} × ${product.quantity}
        </p>

        <small>
          Вес: ${formatWeight(itemWeight)}
        </small>
      </div>

      <div class="cart-item__right">
        <strong>${formatPrice(itemPrice)}</strong>

        <div class="cart-item__controls">
          <button
            class="cart-item-minus"
            type="button"
            data-id="${escapeHtml(product.id)}"
            aria-label="Уменьшить количество"
          >
            −
          </button>

          <span>${product.quantity}</span>

          <button
            class="cart-item-plus"
            type="button"
            data-id="${escapeHtml(product.id)}"
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>

        <button
          class="cart-item-remove"
          type="button"
          data-id="${escapeHtml(product.id)}"
        >
          Удалить
        </button>
      </div>
    `;

    return item;
  }

  function renderCart() {
    elements.cartItems.innerHTML = "";

    if (cart.size === 0) {
      elements.emptyCartMessage.hidden = false;

      updateHeader();
      updateCartFooter();

      return;
    }

    elements.emptyCartMessage.hidden = true;

    cart.forEach((product) => {
      elements.cartItems.appendChild(
        createCartItem(product)
      );
    });

    updateHeader();
    updateCartFooter();
  }

  function addToCart(card) {
    const product = getProductData(card);
    const selectedQuantity = getCardQuantity(card);

    if (!product.id) {
      console.error(
        "У карточки товара отсутствует атрибут data-id:",
        card
      );

      return;
    }

    if (!product.isMeat) {
      if (product.price <= 0 || product.weight <= 0) {
        console.error(
          "У товара должны быть положительные data-price и data-weight:",
          product
        );

        return;
      }
    }

    if (cart.has(product.id)) {
      const existingProduct = cart.get(product.id);
      existingProduct.quantity += selectedQuantity;
    } else {
      product.quantity = selectedQuantity;
      cart.set(product.id, product);
    }

    /*
     * Корзина не открывается автоматически.
     */
    renderCart();
  }

  function changeCartQuantity(productId, amount) {
    const product = cart.get(productId);

    if (!product) {
      return;
    }

    product.quantity += amount;

    if (product.quantity <= 0) {
      cart.delete(productId);
      resetCardQuantity(productId);
    }

    renderCart();
  }

  function removeFromCart(productId) {
    if (!cart.has(productId)) {
      return;
    }

    cart.delete(productId);
    resetCardQuantity(productId);
    renderCart();
  }

  function openPanel(panel, overlay, focusElement) {
    panel.classList.add("is-open");
    overlay.classList.add("is-visible");

    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (focusElement) {
      setTimeout(() => {
        focusElement.focus();
      }, 250);
    }
  }

  function closePanel(panel, overlay, returnFocusElement) {
    const activeElement = document.activeElement;

    /*
     * Снимаем фокус до установки aria-hidden="true".
     */
    if (activeElement && panel.contains(activeElement)) {
      activeElement.blur();
    }

    panel.classList.remove("is-open");
    overlay.classList.remove("is-visible");

    panel.setAttribute("aria-hidden", "true");

    const anotherPanelIsOpen = document.querySelector(
      ".cart-panel.is-open, .delivery-panel.is-open, .checkout-panel.is-open"
    );

    if (!anotherPanelIsOpen) {
      document.body.classList.remove("modal-open");
    }

    if (
      returnFocusElement &&
      typeof returnFocusElement.focus === "function" &&
      document.body.contains(returnFocusElement)
    ) {
      setTimeout(() => {
        returnFocusElement.focus();
      }, 0);
    }
  }

  function openCart() {
    lastFocusedElement = document.activeElement;

    openPanel(
      elements.cartPanel,
      elements.cartOverlay,
      elements.closeCart
    );

    elements.openCart.setAttribute("aria-expanded", "true");
  }

  function closeCart() {
    closePanel(
      elements.cartPanel,
      elements.cartOverlay,
      lastFocusedElement || elements.openCart
    );

    elements.openCart.setAttribute("aria-expanded", "false");
    lastFocusedElement = null;
  }

  function openDeliveryPanel() {
    if (cart.size === 0) {
      alert("Сначала добавьте товар в корзину.");
      return;
    }

    closeCart();

    openPanel(
      elements.deliveryPanel,
      elements.deliveryOverlay,
      elements.closeDelivery
    );
  }

  function closeDeliveryPanel() {
    closePanel(
      elements.deliveryPanel,
      elements.deliveryOverlay,
      elements.openCart
    );
  }

  function openCheckoutPanel() {
    const city = elements.citySelect.value.trim();

    if (!city) {
      if (elements.cityError) {
        elements.cityError.textContent = "Выберите город.";
      }

      elements.citySelect.setAttribute("aria-invalid", "true");
      elements.citySelect.focus();

      return;
    }

    if (elements.cityError) {
      elements.cityError.textContent = "";
    }

    elements.citySelect.removeAttribute("aria-invalid");

    const selectedCityInput = $("#selected-city");

    if (selectedCityInput) {
      selectedCityInput.value = city;
    }

    closeDeliveryPanel();

    openPanel(
      elements.checkoutPanel,
      elements.checkoutOverlay,
      elements.closeCheckout
    );
  }

  function closeCheckoutPanel() {
    closePanel(
      elements.checkoutPanel,
      elements.checkoutOverlay,
      elements.openCart
    );
  }

  function showFieldError(fieldName, message) {
    const errorElement = $(
      `[data-error-for="${fieldName}"]`
    );

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearFieldErrors() {
    $$(".field-error").forEach((errorElement) => {
      errorElement.textContent = "";
    });
  }

  function validateOrderForm(formData) {
    let isValid = true;

    clearFieldErrors();

    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const comment = String(formData.get("comment") || "").trim();

    if (name.length < 2) {
      showFieldError(
        "name",
        "Введите имя не короче 2 символов."
      );

      isValid = false;
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10) {
      showFieldError(
        "phone",
        "Введите корректный номер телефона."
      );

      isValid = false;
    }

    if (address.length < 5) {
      showFieldError(
        "address",
        "Введите адрес доставки."
      );

      isValid = false;
    }

    if (comment.length > 500) {
      showFieldError(
        "comment",
        "Комментарий не должен превышать 500 символов."
      );

      isValid = false;
    }

    return isValid;
  }

 function getOrderText(formData) {
  const name = formData.get("name") || "";
  const phone = formData.get("phone") || "";
  const city = formData.get("city") || "";
  const address = formData.get("address") || "";
  const comment = formData.get("comment") || "";

  let itemsText = "Нет товаров";
  let totalWeight = 0;
  let totalPrice = 0; // ← добавили общую сумму

  const items = Array.from(cart.values());

  if (items.length > 0) {
    itemsText = items.map((item) => {
      // Считаем вес (для мяса он не участвует в расчётах)
      const itemWeight = item.weight ? item.weight * item.quantity : 0;
      totalWeight += itemWeight;

      let priceInfo;

      if (item.isMeat) {
        priceInfo = "Цена уточняется отдельно";
      } else {
        if (!item.price || item.price <= 0) {
          console.warn(`⚠️ У товара "${item.name}" нет цены (data-price).`);
          priceInfo = "Цена не указана";
        } else {
          const itemPriceTotal = item.price * item.quantity;
          priceInfo = `${formatPrice(item.price)} × ${item.quantity} = ${formatPrice(itemPriceTotal)}`;
          totalPrice += itemPriceTotal; // ← добавляем к общей сумме
        }
      }

      return `- ${item.name}: ${item.quantity} шт. (${priceInfo})`;
    }).join("\n");
  }

  // Добавили строку «Общая сумма: ...»
  return `
Имя: ${name}
Телефон: ${phone}
Город: ${city}
Адрес: ${address}
Пожелания: ${comment}

Состав заказа:
${itemsText}

Общий вес: ${formatWeight(totalWeight)}
Общая сумма за полуфабрикаты: ${formatPrice(totalPrice)}
  `.trim();
}


function sendOrderByEmail(text) {
  const serviceId = "service_3svwzit";
  const templateId = "template_7a1fhjn"; // ← Вставь ID шаблона из EmailJS

 const payload = {
    to_name: "Администратор",
    message: text,
    // Остальные поля можно убрать — в шаблоне EmailJS ты сам настраиваешь, какие переменные подставлять
    name: (text.match(/Имя:\s*(.+)/) || ['', ''])[1] || "",
    phone: (text.match(/Телефон:\s*(.+)/) || ['', ''])[1] || "",
    city: (text.match(/Город:\s*(.+)/) || ['', ''])[1] || "",
    address: (text.match(/Адрес:\s*(.+)/) || ['', ''])[1] || "",
    comment: (text.match(/Пожелания:\s*(.+)/) || ['', ''])[1] || ""
  };

  console.log("📧 Отправка на Email:", payload);

  return emailjs.send(serviceId, templateId, payload);
}

  async function handleOrderSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.orderForm);

  if (!validateOrderForm(formData)) {
    const firstError = $(".field-error:not(:empty)");
    if (firstError) {
      const fieldName = firstError.dataset.errorFor;
      const field = $(`[name="${fieldName}"]`);
      if (field) field.focus();
    }
    return;
  }

  const orderText = getOrderText(formData);
  console.log("📄 Текст заказа:", orderText);

  const submitBtn = event.submitter || elements.checkoutButton;
  const originalText = submitBtn ? submitBtn.textContent : "Отправить";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка...";
  }

  try {
    await sendOrderByEmail(orderText);
    elements.formMessage.textContent = "Спасибо! Заказ отправлен на почту.";
    elements.formMessage.classList.add("is-success");
    elements.formMessage.classList.remove("is-error");
  } catch (error) {
    console.error("❌ Ошибка отправки Email:", error);
    elements.formMessage.textContent = "Ошибка отправки. Попробуйте позже или позвоните нам.";
    elements.formMessage.classList.add("is-error");
    elements.formMessage.classList.remove("is-success");
  }

  elements.orderForm.reset();
  cart.clear();
  renderCart();

  setTimeout(() => {
    closeCheckoutPanel();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }, 2000);
}



  productCards.forEach((card) => {
  const minusButton = $(".quantity-minus", card);
  const plusButton = $(".quantity-plus", card);
  const qtyEl = $(".quantity-value", card); // обязательно проверь, что такой элемент есть в HTML

  // Если вообще нет элементов количества — пропускаем эту карточку
  if (!qtyEl) {
    console.warn('В карточке нет .quantity-value, не получится менять количество:', card);
    return;
  }

  const syncCardToCart = () => {
    const quantity = parseInt(qtyEl.textContent, 10) || 0;
    const product = getProductData(card);

    if (quantity <= 0) {
      // Удаляем из корзины, если 0
      cart.delete(product.id);
      renderCart();
      return;
    }

    // Если уже есть в корзине — просто обновляем количество
    if (cart.has(product.id)) {
      const existing = cart.get(product.id);
      existing.quantity = quantity;
      renderCart();
      return;
    }

    // Иначе добавляем товар с текущим количеством
    addToCart(card); // эта функция у тебя уже умеет брать getCardQuantity
  };

  if (minusButton) {
    minusButton.addEventListener("click", () => {
      const current = parseInt(qtyEl.textContent, 10) || 1;
      const newQty = Math.max(0, current - 1); // разрешаем 0, чтобы потом удалить из корзины
      qtyEl.textContent = newQty;             // сначала обновляем цифру на карточке
      syncCardToCart();                        // потом синхронизируем корзину
    });
  }

  if (plusButton) {
    plusButton.addEventListener("click", () => {
      const current = parseInt(qtyEl.textContent, 10) || 0;
      const newQty = current + 1;
      qtyEl.textContent = newQty;
      syncCardToCart();
    });
  }
});



  elements.openCart.addEventListener("click", openCart);
  elements.closeCart.addEventListener("click", closeCart);
  elements.cartOverlay.addEventListener("click", closeCart);

  elements.closeDelivery.addEventListener(
    "click",
    closeDeliveryPanel
  );

  elements.deliveryOverlay.addEventListener(
    "click",
    closeDeliveryPanel
  );

  elements.closeCheckout.addEventListener(
    "click",
    closeCheckoutPanel
  );

  elements.checkoutOverlay.addEventListener(
    "click",
    closeCheckoutPanel
  );

  elements.checkoutButton.addEventListener(
    "click",
    openDeliveryPanel
  );

  elements.deliveryNext.addEventListener(
    "click",
    openCheckoutPanel
  );

  elements.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
      return;
    }

    const productId = button.dataset.id;

    if (!productId) {
      return;
    }

    if (button.classList.contains("cart-item-minus")) {
      changeCartQuantity(productId, -1);
    }

    if (button.classList.contains("cart-item-plus")) {
      changeCartQuantity(productId, 1);
    }

    if (button.classList.contains("cart-item-remove")) {
      removeFromCart(productId);
    }
  });

  elements.orderForm.addEventListener(
    "submit",
    handleOrderSubmit
  );

  elements.citySelect.addEventListener("change", () => {
    elements.citySelect.removeAttribute("aria-invalid");

    if (elements.cityError) {
      elements.cityError.textContent = "";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (elements.checkoutPanel.classList.contains("is-open")) {
      closeCheckoutPanel();
      return;
    }

    if (elements.deliveryPanel.classList.contains("is-open")) {
      closeDeliveryPanel();
      return;
    }

    if (elements.cartPanel.classList.contains("is-open")) {
      closeCart();
    }
  });

  renderCart();

  const revealElements = document.querySelectorAll('.scroll-reveal');

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.05
  }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

}); // <-- закрывающая скобка для DOMCo
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(
    "#product-search"
  );

  const searchClear = document.querySelector(
    "#product-search-clear"
  );

  const searchDropdown = document.querySelector(
    "#product-search-results"
  );

  const searchMessage = document.querySelector(
    "#catalog-search-message"
  );

  const productCards = [
    ...document.querySelectorAll(".product-card")
  ];

  if (
    !searchInput ||
    !searchClear ||
    !searchDropdown ||
    !searchMessage ||
    !productCards.length
  ) {
    return;
  }

  const normalizeText = (value) => {
    return value
      .toLowerCase()
      .replace(/ё/g, "е")
      .trim();
  };

  const escapeHtml = (value) => {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
  };

  const highlightText = (text, query) => {
    const safeText = escapeHtml(text);
    const safeQuery = escapeHtml(query);

    if (!safeQuery) {
      return safeText;
    }

    return safeText.replace(
      new RegExp(`(${safeQuery})`, "gi"),
      "<mark>$1</mark>"
    );
  };

  const products = productCards.map((card) => {
    const image = card.querySelector(
      ".product-image img"
    );

    const price = card.querySelector(
      ".product-price"
    );

    const weight = card.querySelector(
      ".product-weight"
    );

    const category = card.querySelector(
      ".product-category"
    );

    const name =
      card.dataset.name ||
      card.querySelector("h3")?.textContent ||
      "Товар";

    return {
      card,
      name: name.trim(),
      searchText: normalizeText(card.textContent),
      image: image?.getAttribute("src") || "",
      imageAlt: image?.getAttribute("alt") || name,
      price: price?.textContent.trim() || "",
      weight: weight?.textContent.trim() || "",
      category: category?.textContent.trim() || ""
    };
  });

  const closeDropdown = () => {
    searchDropdown.hidden = true;
    searchInput.setAttribute(
      "aria-expanded",
      "false"
    );
  };

  const openDropdown = () => {
    searchDropdown.hidden = false;
    searchInput.setAttribute(
      "aria-expanded",
      "true"
    );
  };

  const showResults = (query) => {
    const normalizedQuery = normalizeText(query);

    searchDropdown.innerHTML = "";

    if (!normalizedQuery) {
      closeDropdown();
      searchMessage.textContent = "";
      return;
    }

    const matches = products
      .filter((product) => {
        return product.searchText.includes(
          normalizedQuery
        );
      })
      .slice(0, 10);

    if (!matches.length) {
      searchDropdown.innerHTML = `
        <div class="catalog-search__empty">
          По вашему запросу ничего не найдено
        </div>
      `;

      searchMessage.textContent =
        "Попробуйте ввести другое название.";

      openDropdown();
      return;
    }

    const resultHtml = matches
      .map((product, index) => {
        const safeName = escapeHtml(product.name);
        const safeImage = escapeHtml(product.image);
        const safeAlt = escapeHtml(product.imageAlt);
        const safePrice = escapeHtml(product.price);
        const safeWeight = escapeHtml(product.weight);
        const safeCategory = escapeHtml(product.category);

        return `
          <button
            class="catalog-search__result"
            type="button"
            role="option"
            data-product-index="${index}"
          >
            <span class="catalog-search__result-image">
              ${
                safeImage
                  ? `
                    <img
                      src="${safeImage}"
                      alt="${safeAlt}"
                    />
                  `
                  : ""
              }
            </span>

            <span class="catalog-search__result-info">
              <span class="catalog-search__result-name">
                ${highlightText(product.name, query)}
              </span>

              <span class="catalog-search__result-meta">
                ${
                  safePrice
                    ? `
                      <span class="catalog-search__result-price">
                        ${safePrice}
                      </span>
                    `
                    : ""
                }

                ${
                  safeWeight
                    ? `
                      <span>${safeWeight}</span>
                    `
                    : ""
                }

                ${
                  safeCategory
                    ? `
                      <span class="catalog-search__result-category">
                        ${safeCategory}
                      </span>
                    `
                    : ""
                }
              </span>
            </span>
          </button>
        `;
      })
      .join("");

    searchDropdown.innerHTML = resultHtml;
    searchMessage.textContent =
      `Найдено товаров: ${matches.length}`;

    openDropdown();

    const resultButtons = searchDropdown.querySelectorAll(
      ".catalog-search__result"
    );

    resultButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        const product = matches[index];

        product.card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        clearSelectedCards();

        setTimeout(() => {
          product.card.classList.add(
            "search-selected"
          );
        }, 400);

        searchInput.value = product.name;
        searchClear.hidden = false;
        closeDropdown();
      });
    });
  };

  const clearSelectedCards = () => {
    productCards.forEach((card) => {
      card.classList.remove("search-selected");
    });
  };

  searchInput.addEventListener("input", () => {
    clearSelectedCards();

    const value = searchInput.value.trim();

    searchClear.hidden = value === "";

    showResults(value);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      showResults(searchInput.value);
    }
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.hidden = true;
    searchMessage.textContent = "";
    clearSelectedCards();
    closeDropdown();
    searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    const isInsideSearch =
      event.target.closest(".catalog-search");

    if (!isInsideSearch) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
    }
  });
});
 const mainNav = document.querySelector('.main-nav');
  const menuToggle = mainNav.querySelector('.menu-toggle');
  const navLinks = mainNav.querySelectorAll('.nav-list a');

  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('menu-open');

    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.querySelector('.visually-hidden').textContent = isOpen
      ? 'Закрыть меню'
      : 'Открыть меню';
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.querySelector('.visually-hidden').textContent =
        'Открыть меню';
    });
  });

  document.addEventListener('click', (event) => {
    if (!mainNav.contains(event.target)) {
      mainNav.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.querySelector('.visually-hidden').textContent =
        'Открыть меню';
    }
  });
  