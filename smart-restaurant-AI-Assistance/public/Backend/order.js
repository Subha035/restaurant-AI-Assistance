const menuItems = [
    {
        id: 'a1',
        category: 'breakfast',
        name: 'Aloo paratha',
        description: 'Flaky stuffed flatbread with spiced potato.',
        price: 120,
    },
    {
        id: 'a2',
        category: 'breakfast',
        name: 'Poha',
        description: 'Light and tangy flattened rice with peanuts.',
        price: 100,
    },
    {
        id: 'a3',
        category: 'breakfast',
        name: 'Masala Chai',
        description: 'Spiced tea with milk and warming masalas.',
        price: 60,
    },
    {
        id: 'l1',
        category: 'lunch',
        name: 'Paneer Butter Masala',
        description: 'Creamy tomato curry with soft paneer cubes.',
        price: 280,
    },
    {
        id: 'l2',
        category: 'lunch',
        name: 'Dal Fry',
        description: 'Comforting lentils tempered with spices.',
        price: 180,
    },
    {
        id: 'l3',
        category: 'lunch',
        name: 'Jeera Rice',
        description: 'Aromatic cumin rice.',
        price: 140,
    },
    {
        id: 'l4',
        category: 'lunch',
        name: 'Roti',
        description: 'Freshly made whole wheat flatbread.',
        price: 40,
    },
    {
        id: 'd1',
        category: 'dinner',
        name: 'Veg Biriyani',
        description: 'Spiced vegetable rice cooked with saffron.',
        price: 320,
    },
    {
        id: 'd2',
        category: 'dinner',
        name: 'Raita',
        description: 'Yogurt dip with cucumber and spices.',
        price: 80,
    },
    {
        id: 'd3',
        category: 'dinner',
        name: 'Salad',
        description: 'Fresh mixed greens with seasonal veggies.',
        price: 120,
    },
    {
        id: 'd4',
        category: 'dinner',
        name: 'Gulab Jamun',
        description: 'Sweet syrup-soaked dumplings.',
        price: 90,
    },
    {
        id: 'w1',
        category: 'wine',
        name: 'Pinot Noir',
        description: 'Elegant red with notes of cherry and spice.',
        price: 2200,
    },
    {
        id: 'w2',
        category: 'wine',
        name: 'Chardonnay',
        description: 'Creamy white with oak and citrus.',
        price: 1800,
    },
    {
        id: 'w3',
        category: 'wine',
        name: 'Prosecco',
        description: 'Sparkling wine with apple and pear.',
        price: 2400,
    },
];

const cart = {};

const menuList = document.getElementById('menuList');
const categorySelect = document.getElementById('categorySelect');
const subtotalEl = document.getElementById('subtotal');
const taxesEl = document.getElementById('taxes');
const totalEl = document.getElementById('total');
const checkoutForm = document.getElementById('checkoutForm');
const successMessage = document.getElementById('successMessage');
const orderModal = document.getElementById('orderModal');
const closeOrderModal = document.getElementById('closeOrderModal');
const closeModalButton = document.getElementById('closeModalButton');
const orderSequenceEl = document.getElementById('orderSequence');
const orderNumberEl = document.getElementById('orderNumber');
const orderTotalEl = document.getElementById('orderTotal');
const qrCode = document.getElementById('qrCode');
const qrCard = document.querySelector('.qr-card');
const customerName = document.getElementById('customerName');
const phoneInput = document.getElementById('customerPhone');
const phoneError = document.getElementById('phoneError');
const payButton = document.getElementById('payNowButton');
let phoneSuccessTimeout;

function renderMenu(filterCategory = 'breakfast') {
    const filteredItems = menuItems.filter((item) => item.category === filterCategory);

    menuList.innerHTML = filteredItems.map(item => {
        const count = cart[item.id] || 0;
        return `
            <div class="item-row">
                <div class="item-title">
                    <strong>${item.name}</strong>
                    <span>${item.description}</span>
                </div>
                <div class="item-actions">
                    <div class="item-price">₹${item.price}</div>
                    <button class="remove-button" data-id="${item.id}" type="button">-</button>
                    <button class="add-button" data-id="${item.id}" type="button">+</button>
                    <div class="item-count">${count ? `Added: ${count}` : 'Add to cart'}</div>
                </div>
            </div>
        `;
    }).join('');

    menuList.querySelectorAll('.add-button').forEach((button) => {
        button.addEventListener('click', () => onAddItem(button.dataset.id));
    });

    menuList.querySelectorAll('.remove-button').forEach((button) => {
        button.addEventListener('click', () => onRemoveItem(button.dataset.id));
    });
}

function onAddItem(id) {
    const currentQty = cart[id] || 0;
    cart[id] = currentQty + 1;
    renderMenu(categorySelect.value);
    updateTotals();
}

function onRemoveItem(id) {
    const currentQty = cart[id] || 0;
    if (currentQty <= 1) {
        delete cart[id];
    } else {
        cart[id] = currentQty - 1;
    }
    renderMenu(categorySelect.value);
    updateTotals();
}

function updateTotals() {
    const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
        const item = menuItems.find((entry) => entry.id === id);
        return sum + (item.price * qty);
    }, 0);

    const taxes = Math.round(subtotal * 0.05);
    const total = subtotal + taxes;

    subtotalEl.textContent = `₹${subtotal}`;
    taxesEl.textContent = `₹${taxes}`;
    totalEl.textContent = `₹${total}`;
    // Enable Pay button only when there is at least one item
    if (payButton) {
        const empty = subtotal === 0;
        payButton.disabled = empty;
        payButton.setAttribute('aria-disabled', empty ? 'true' : 'false');
        payButton.classList.toggle('disabled', empty);
        payButton.classList.toggle('enabled', !empty);
        // update title for accessibility
        payButton.title = empty ? 'Add items to enable' : 'Proceed to pay';
    }
}

function scrollToCheckout() {
    document.querySelector('.checkout-panel').scrollIntoView({ behavior: 'smooth' });
}

function sanitizeNameInput() {
    const sanitized = customerName.value.replace(/[^A-Za-z ]+/g, '');
    if (customerName.value !== sanitized) {
        customerName.value = sanitized;
    }
}

function sanitizePhoneInput() {
    const digitsOnly = phoneInput.value.replace(/\D+/g, '');
    if (phoneInput.value !== digitsOnly) {
        phoneInput.value = digitsOnly;
    }
}

function isValidPhoneNumber(value) {
    const cleanedValue = value.trim().replace(/\s+/g, '');

    if (!cleanedValue) {
        return false;
    }

    return /^0?[6-9]\d{9}$/.test(cleanedValue) || /^[6-9]\d{9}$/.test(cleanedValue);
}

function updatePhoneValidation(showTransientSuccess = true) {
    const isValid = isValidPhoneNumber(phoneInput.value);
    phoneInput.classList.toggle('invalid', !isValid && phoneInput.value.trim() !== '');
    phoneInput.classList.toggle('valid', isValid);

    if (isValid && showTransientSuccess) {
        phoneError.textContent = '✓ Valid mobile number';
        phoneError.classList.add('success');
        phoneError.classList.remove('invalid');
        if (phoneSuccessTimeout) {
            clearTimeout(phoneSuccessTimeout);
        }
        phoneSuccessTimeout = setTimeout(() => {
            phoneError.textContent = '';
            phoneError.classList.remove('success');
        }, 1000);
    } else if (isValid) {
        phoneError.textContent = '';
        phoneError.classList.remove('success');
    } else if (phoneInput.value.trim()) {
        phoneError.textContent = 'Please enter a valid 10-digit mobile number.';
        phoneError.classList.remove('success');
    } else {
        phoneError.textContent = 'Mobile number is required.';
        phoneError.classList.remove('success');
    }

    return isValid;
}

phoneInput.addEventListener('input', () => {
    sanitizePhoneInput();
    updatePhoneValidation(true);
});
phoneInput.addEventListener('blur', () => updatePhoneValidation(false));
customerName.addEventListener('input', sanitizeNameInput);

categorySelect.addEventListener('change', () => {
    renderMenu(categorySelect.value);
});

checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!name || !phone) {
        successMessage.innerHTML = '<div class="success-box"><strong>Please complete all fields.</strong><p>Fill in your name and phone number to proceed.</p></div>';
        return;
    }

    const isPhoneValid = updatePhoneValidation(false);
    if (!isPhoneValid) {
        successMessage.innerHTML = '<div class="success-box"><strong>Invalid phone number.</strong><p>Please enter a valid 10-digit mobile number to continue.</p></div>';
        phoneInput.focus();
        return;
    }

    const subtotal = Number(subtotalEl.textContent.replace('₹', ''));
    if (subtotal === 0) {
        // If somehow submitted with empty cart, silently prevent submission.
        return;
    }

    const sequence = Math.floor(Math.random() * 10) + 1;
    const orderId = Math.floor(Math.random() * 900) + 100;
    const total = totalEl.textContent;
    const itemsText = Object.entries(cart).map(([id, qty]) => {
        const item = menuItems.find((entry) => entry.id === id);
        const lineTotal = item.price * qty;
        return `${item.name} x${qty} = ₹${lineTotal}`;
    }).join('\n');
    const priceBreakup = `Subtotal: ₹${subtotal}\nTaxes (5%): ₹${Math.round(subtotal * 0.05)}\nTotal: ${total}`;
    const orderData = `Order Seq: ${sequence}\nOrder ID: ${orderId}\nName: ${name}\nPhone: ${phone}\nPayment: ${paymentMethod.toUpperCase()}\n\nItems:\n${itemsText}\n\nPrice Breakup:\n${priceBreakup}`;

    const initialQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(orderData)}`;
    const savedFilename = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'customer'}_${phone}_${orderId}_${sequence}.png`;

    orderSequenceEl.textContent = sequence;
    orderNumberEl.textContent = orderId;
    orderTotalEl.textContent = total;
    qrCode.innerHTML = '';
    orderModal.classList.remove('hidden');
    setProcessingState(true);
    setQrLoading(true);

    // Show pending state in modal heading
    const modalHeading = orderModal.querySelector('h2');
    if (modalHeading) {
        modalHeading.textContent = '⏳ Order Pending';
        modalHeading.style.color = 'var(--accent-gold, #f0a500)';
    }

    successMessage.innerHTML = `
        <div class="success-box">
            <strong>Order pending...</strong>
            <p>Thank you, ${name}. Your order total is ${total}.</p>
            <p>Payment method: ${paymentMethod.toUpperCase()}</p>
            <p>Your QR code is being generated. Please wait a moment.</p>
        </div>
    `;

    let serverSaved = false;
    let qrUrl = initialQrUrl;

    try {
        const response = await fetch('/api/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderData, name, orderId, sequence }),
        });

        if (response.ok) {
            const data = await response.json();
            qrUrl = data.url || qrUrl;
            serverSaved = true;
        }
    } catch (error) {
        console.warn('QR server unavailable, using client-side QR image.', error);
    } finally {
        qrCode.innerHTML = `<img src="${qrUrl}" alt="Order QR Code" />`;
        setQrLoading(false);
    }

    // Update modal heading to confirmed now that QR is ready
    const modalHeadingFinal = orderModal.querySelector('h2');
    if (modalHeadingFinal) {
        modalHeadingFinal.textContent = '✓ Order Confirmed';
        modalHeadingFinal.style.color = 'var(--accent-success, #2ecc71)';
    }

    successMessage.innerHTML = `
        <div class="success-box">
            <strong>Order confirmed!</strong>
            <p>Thank you, ${name}. Your order total is ${total}.</p>
            <p>Payment method: ${paymentMethod.toUpperCase()}</p>
            <p>${serverSaved ? `Your QR code has been saved as <strong>${savedFilename}</strong>.` : 'The payment flow completed, and you can still scan the QR below.'}</p>
        </div>
    `;
    setProcessingState(false);
});

function setQrLoading(isLoading) {
    if (!qrCard) return;
    qrCard.classList.toggle('loading', isLoading);
    if (isLoading) {
        qrCode.innerHTML = '<div class="qr-loader"><span></span></div>';
    }
}

function setProcessingState(isProcessing) {
    if (!payButton) return;
    payButton.disabled = isProcessing;
    payButton.textContent = isProcessing ? 'Processing...' : 'Verify & Pay Now';
    payButton.classList.toggle('disabled', isProcessing);
    payButton.classList.toggle('enabled', !isProcessing && !payButton.disabled);
}

function resetOrderState() {
    Object.keys(cart).forEach((key) => delete cart[key]);
    renderMenu(categorySelect.value);
    updateTotals();
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerPhone').classList.remove('valid', 'invalid');
    phoneError.textContent = '';
    phoneError.classList.remove('success');
    document.getElementById('paymentMethod').value = 'cash';
    successMessage.innerHTML = '';
    qrCode.innerHTML = '';
    orderSequenceEl.textContent = '';
    orderNumberEl.textContent = '';
    orderTotalEl.textContent = '₹0';
}

function closeModal() {
    orderModal.classList.add('hidden');
    resetOrderState();
}

closeOrderModal.addEventListener('click', closeModal);
closeModalButton.addEventListener('click', closeModal);

renderMenu();
