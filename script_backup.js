
// Ініціалізація Supabase (встав свої дані з кроку 2)
const SUPABASE_URL = 'https://gbcjezzvioayompuqojx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YSAGI0OwC12XkBCVmkBMsw_0TVpkgjW';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// --- УНІВЕРСАЛЬНА ПЕРЕВІРКА АДМІНА ЧЕРЕЗ SUPABASE ---
async function isAdminUser() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session !== null; // Повертає true, якщо є токен
    } catch (e) {
        return false;
    }
}

// Твоє посилання на Google Таблицю
const DATABASE_URL = "https://script.google.com/macros/s/AKfycbwb60vHMeNOckDntRgobBn2Q7ULD3q8Xfer3Cj3dxKrbQTkzQl3u-eRwyWiUpBP3k398Q/exec";


// Завантажуємо налаштування або використовуємо стандартні, якщо їх немає
const settings = JSON.parse(localStorage.getItem('levkovo_settings')) || {
    retailPrice: 300,
    logoPrice: 150,
    wholesalePrices: {
        'капля': [{min: 100, price: 55}, {min: 70, price: 60}, {min: 50, price: 70}, {min: 30, price: 75}, {min: 10, price: 80}, {min: 0, price: 100}],
        // ... інші типи
    },
    sets: [
        {name: 'Міський', qty: 46, brands: ['Toyota', 'Honda', 'Mercedes']},
        {name: 'Сільський', qty: 30, brands: ['Lada', 'UAZ']}
    ]
};
// --- 1. СИСТЕМА АКАУНТІВ ТА РЕЄСТРАЦІЇ ---

// ОБ'ЄДНАНА ФУНКЦІЯ РЕЄСТРАЦІЇ (Таблиця + Telegram + Локально)
async function handleRegister(event) {
    event.preventDefault();
    
    // Вказуємо точні ID з твоєї форми реєстрації
    const phoneInput = document.getElementById('regPhone');
    const nameInput = document.getElementById('regName');
    const cityInput = document.getElementById('regCity');

    if (!validatePhone(phoneInput)) {
        alert("Введіть коректний номер (10 цифр)");
        return;
    }

    const name = nameInput.value;
    const phone = phoneInput.value; 
    const isWholesale = document.querySelector('input[name="isWholesale"]:checked').value;
    const city = cityInput?.value || "Не вказано";
    
    // Твій функціонал з апострофом для Excel
    const userData = { name, phone: "'" + phone, isWholesale, city }; 
    
    const message = `
👤 **НОВА РЕЄСТРАЦІЯ: LEVKOVO**
-------------------------
📝 **Ім'я:** ${name}
📞 **Тел:** ${phone}
🏢 **Тип:** ${isWholesale === 'yes' ? 'ОПТОВИЙ' : 'Роздрібний'}
📍 **Місто:** ${city}
-------------------------`;

    try {
        const response = await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.result === "exists") {
            alert(`Ви вже зареєстровані! Входьте за номером ${phone}.`);
            showLogin();
            return;
        }

        // Твій функціонал відправки в ТГ
      // НОВА БЕЗПЕЧНА ВІДПРАВКА ЧЕРЕЗ GOOGLE СЕЙФ
        await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "sendTelegram", message: message })
        });

        localStorage.setItem('currentUser', JSON.stringify({ name, phone, isWholesale, city }));
        alert(`Вітаємо, ${name}!`);
        closeAuth();
        location.reload(); 

    } catch (e) {
        console.warn("Помилка JSON, але дані в таблиці:", e);
    }
}

// Оновлення тексту в меню та кнопка ВИХОДУ
// --- ОНОВЛЕННЯ ІНТЕРФЕЙСУ ПРОФІЛЮ ТА МЕНЮ ---
async function updateProfileUI() {
    const userRaw = localStorage.getItem('currentUser');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const profileLi = document.getElementById('profile-link-li'); 
    
    if (!profileLi) return;

    // ПЕРЕВІРЯЄМО РЕАЛЬНОГО АДМІНА ЧЕРЕЗ SUPABASE
    const isAdmin = await isAdminUser();

    if (userRaw || isAdmin) {
        if (navAuthBtn) navAuthBtn.style.display = 'none';
        
        let userName = "Гість";
        let isWholesale = false;
        let userPhone = "";

        if (userRaw) {
            const user = JSON.parse(userRaw);
            userName = user.name || "Клієнт";
            isWholesale = (user.isWholesale === 'yes');
            userPhone = user.phone ? user.phone.replace(/\D/g, '') : "";
        }

        if (isAdmin) {
            userName = "Бос (Адмін)";
            isWholesale = true; 
        }
        
        let wholesaleButton = "";
        
        if (isWholesale) {
            wholesaleButton = `
                <div style="margin-top: 10px;">
                    <button onclick="window.location.href='wholesale-catalog.html'" style="background: #ffd700; color: #000; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">
                        💼 Оптовий кабінет
                    </button>
                </div>
            `;
        }

        if (isAdmin) {
            wholesaleButton += `
                <div style="margin-top: 8px;">
                    <button onclick="window.open('https://docs.google.com/spreadsheets/d/1Ff8LoN3nCJGKgPTaTxFLbvX76pUteDnfU0MaRqI59q0/edit?usp=sharing', '_blank')" style="background: #217346; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        📊 База клієнтів
                    </button>
                </div>
            `;
        }
            
        profileLi.innerHTML = `
            <div style="color: #8b4513; font-weight: bold; margin-bottom: 5px;">
                Привіт, ${userName}
            </div>
            <div style="margin: 8px 0;">
                <a href="my-orders.html" style="text-decoration: none; color: #000; display: flex; align-items: center; gap: 8px; font-size: 0.95rem;">
                    📦 Мої замовлення <span id="sql-orders-count"></span> 
                </a>
            </div>
            <a href="#" onclick="logout()" style="font-size: 0.8rem; color: #ff4d4d; text-decoration: underline; cursor: pointer;">Вийти з акаунта</a>
            ${wholesaleButton}
        `;

        if (userPhone && !isAdmin) updateOrdersCountInUI(userPhone);

    } else {
        if (navAuthBtn) navAuthBtn.style.display = 'block';
        profileLi.innerHTML = '<a href="#" onclick="login(); return false;">Мій Профіль / Реєстрація</a>';
    }
}
function renderWholesaleBanner() {
    const userRaw = localStorage.getItem('currentUser');
    const container = document.getElementById('wholesale-banner-container');
    
    if (!container) return; // Якщо ми не на головній, де є цей ID

    if (userRaw) {
        const user = JSON.parse(userRaw);
        // Перевіряємо, чи юзер оптовик (isWholesale === 'yes') або адмін
        if (user.isWholesale === 'yes' || user.phone.replace(/\D/g, '') === "0000000000") {
            container.innerHTML = `
                <div class="wholesale-banner" onclick="window.location.href='wholesale-catalog.html'">
                    <div class="banner-content">
                        <span class="banner-icon">💼</span>
                        <div class="banner-text">
                            <strong>Оптовий кабінет</strong>
                            <p>Спеціальні ціни та замовлення партіями</p>
                        </div>
                    </div>
                    <div class="banner-arrow">→</div>
                </div>
            `;
        } else {
            container.innerHTML = ''; // Для звичайних клієнтів ховаємо
        }
    }
}

// ==========================================
// ЄДИНИЙ ЗАПУСК УСІХ СИСТЕМ ПРИ ЗАВАНТАЖЕННІ
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Оновлення профілю (з затримкою для надійності)
    setTimeout(() => {
        updateProfileUI();    
        if (typeof updateCartCount === "function") updateCartCount();   
        
        if (window.location.hash === '#cart') {
            history.replaceState(null, null, window.location.pathname);
            if (typeof openCart === "function") openCart(); 
        }
    }, 100);

    // 2. Запуск систем для головної сторінки / категорій
    loadCategories();
    checkAdminForCategories();
    setTimeout(renderWholesaleBanner, 150);

    // 3. Запуск рендеру для сторінки ОДНОГО товару
    initSingleProductPage(); 
});

// ОКРЕМА ФУНКЦІЯ ДЛЯ ЦИФЕРКИ (щоб не ламати основний код)
async function updateOrdersCountInUI(phone) {
    try {
        const { count, error } = await supabaseClient
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('phone', phone);

        if (!error && count > 0) {
            const badge = document.getElementById('sql-orders-count');
            if (badge) {
                badge.innerHTML = `<span style="background: #ffd700; color: #000; border-radius: 50%; padding: 2px 7px; font-size: 0.7rem; font-weight: bold; border: 1px solid #8b4513;">${count}</span>`;
            }
        }
    } catch (e) {
        console.log("Поки немає замовлень в SQL для цього номера");
    }
}

async function logout() {
    if(confirm("Ви дійсно хочете вийти?")) {
        localStorage.removeItem('currentUser');
        await supabaseClient.auth.signOut(); // Знищуємо адмінський токен
        location.reload(); 
    }
}

window.onload = function() {
    updateProfileUI();
};

function login() {
    console.log("Запуск ядерного входу...");
    
    // Закриваємо сайдбар
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleSidebar();

    // Шукаємо ВСІ елементи з таким ID (хоча це неправильно для HTML, ми їх пробиваємо)
    const modals = document.querySelectorAll('#authModal');
    
    if (modals.length > 0) {
        modals.forEach(m => {
            m.style.display = 'flex';
            m.style.zIndex = '1000000';
            m.style.background = 'rgba(255, 0, 0, 0.9)'; // Твій червоний маркер
        });
        showAuthChoice();
        console.log(`Увімкнено ${modals.length} модалок`);
    } else {
        alert("ЖОДНОЇ МОДАЛКИ НЕ ЗНАЙДЕНО ВООБЩЕ!");
    }
}

function closeAuth() {
    document.getElementById('authModal').style.display = 'none';
}

function showAuthChoice() {
    const choice = document.getElementById('authChoice');
    const reg = document.getElementById('registerForm');
    const log = document.getElementById('loginForm');
    
    if (choice) choice.style.display = 'block';
    if (reg) reg.style.display = 'none';
    if (log) log.style.display = 'none';
}
function showRegister() {
    document.getElementById('authChoice').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('authChoice').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function toggleWholesale(show) {
    const fields = document.getElementById('wholesaleFields');
    const cityInput = document.getElementById('regCity');
    if (fields) {
        fields.style.display = show ? 'block' : 'none';
        if (cityInput) cityInput.required = show; // Якщо ОПТ - місто обов'язкове
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const phoneInput = document.getElementById('loginPhone'); // Чіткий ID для входу
    const phone = phoneInput.value; 
    
    // ТВІЙ СЕКРЕТНИЙ ВХІД (Збережено повністю)
    // ПРИХОВАНІ ДВЕРІ ДЛЯ АДМІНА
    if (phone === "0000000000" || phone === "0689721598") {
        closeAuth(); // Миттєво закриваємо клієнтське вікно
        document.getElementById('adminAuthModal').style.display = 'flex'; // Відкриваємо броньовані двері Supabase
        return; // Зупиняємо подальше виконання скрипта
    }

    try {
        const response = await fetch(`${DATABASE_URL}?phone=${phone}`);
        const data = await response.json();

        if (data.exists) {
            const user = { name: data.name, phone: phone, isWholesale: data.isWholesale };
            localStorage.setItem('currentUser', JSON.stringify(user));
            alert(`Вітаємо назад, ${data.name}!`);
            closeAuth();
            location.reload();
        } else {
            alert("Користувача не знайдено.");
        }
    } catch (e) {
        alert("Помилка підключення до бази.");
    }
}


// --- 2. КОШИК ТА ЦІНИ ---

// Оголошуємо кошик ТІЛЬКИ ТУТ (видали всі інші let cart)
let cart = JSON.parse(localStorage.getItem('levkovo_cart')) || [];

function saveCart() {
    localStorage.setItem('levkovo_cart', JSON.stringify(cart));
    updateCartCount(); // Обов'язково викликаємо тут!
}

function getPrice(basePrice, quantity) {
    return basePrice; // Просто повертаємо ціну без жодних перевірок на опт
}

async function addToCart(name, price, img) {
    const fileInput = document.getElementById('logo-photo');
    let fileData = null;

    // 1. Отримуємо вибраний колір
    const colorInput = document.getElementById('selectedColorValue');
    const selectedColor = colorInput ? colorInput.value : "";
    const fullName = selectedColor ? `${name} (${selectedColor})` : name;

    // 2. Обробка файлу (Збережено твою логіку)
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        if (file.size > 2000000) {
            alert("Файл занадто великий для кошика. Ми візьмемо його безпосередньо при оформленні!");
        } else {
            // Використовуємо проміс, як ти і хотів
            fileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            try {
                // Зберігаємо ОКРЕМО, щоб не забивати масив cart
                localStorage.setItem('pendingFileBase64', fileData);
            } catch (e) {
                console.warn("LocalStorage переповнений, фото не збережено локально, але товар додамо.");
            }
        }
    }

    // 3. Додавання в кошик (Тут я додав try/catch, щоб кошик не "вмирав")
    try {
        const existing = cart.find(item => item.name === fullName);
        if (existing) {
            existing.qty++;
        } else {
            const finalPrice = getPrice(price, 1);
            cart.push({ 
                name: fullName, 
                price: finalPrice, 
                img: img, 
                qty: 1, 
                selected: true,
                hasFile: !!fileInput?.files[0] 
            });
        }
        
        saveCart();
        alert(`"${fullName}" додано до кошика! 🐂`); 
        
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
            openCart();
        }
    } catch (error) {
        console.error("Помилка додавання в кошик:", error);
        alert("Сталася помилка. Спробуйте очистити кошик.");
    }

    return false;
}
function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    
    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        // БЕРЕМО РЕАЛЬНУ ЦІНУ З ПАМ'ЯТІ, НІЯКОГО ХАРДКОДУ
        const currentPrice = getPrice(item.price, item.qty);
        
        if (item.selected) {
            total += currentPrice * item.qty;
        }

        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #eee; padding: 10px 0;">
                <input type="checkbox" ${item.selected ? 'checked' : ''} onclick="toggleSelect(${index})">
                <img src="${item.img}" class="cart-img" style="width: 50px; height: 50px; object-fit: cover;">
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${item.name}</div>
                    
                    <div style="font-size: 0.85rem;">
                        <span style="color: #8b4513; font-weight: bold;">${currentPrice} грн</span>
                    </div>

                    <div style="display:flex; gap:5px; align-items:center; margin-top:5px;">
                        <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                        
                        <input type="number" value="${item.qty}" min="1" 
                               style="width: 50px; text-align: center; border: 1px solid #ccc; border-radius: 4px;"
                               onchange="updateQtyInput(${index}, this.value)">
                        
                        <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="runaway-delete" onclick="handleDelete(${index})" style="cursor:pointer; padding: 0 10px; font-weight: bold; color: red;">✕</div>
            </div>
        `;
    });
    
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
        totalElement.innerText = `Разом: ${total} грн`;
    }

    if (document.getElementById('checkout-total')) {
        renderCheckoutSummary(); // Оновлюємо суму в оформленні, якщо воно відкрите
    }
}

// --- 3. НАВІГАЦІЯ ТА КЕРУВАННЯ ---

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.classList.toggle('open');
    if (!sidebar.classList.contains('active')) {
        sidebar.style.display = 'block';
        setTimeout(() => sidebar.classList.add('active'), 10);
    } else {
        sidebar.classList.remove('active');
        setTimeout(() => sidebar.style.display = 'none', 500);
    }
}

function openCart() {
    document.getElementById('cartModal').style.display = 'flex';
    renderCart();
}

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        // Рахуємо суму всіх qty у кошику
        const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
        countElement.innerText = totalQty;
    }
}

function handleDelete(index) {
    cart.splice(index, 1);
    saveCart(); // ТУТ БУЛА ПОМИЛКА: додаємо збереження в пам'ять
    renderCart();
}

function changeQty(index, delta) {
    if (cart[index].qty + delta > 0) {
        cart[index].qty += delta;
        saveCart(); // ТУТ БУЛА ПОМИЛКА: додаємо збереження в пам'ять
        renderCart();
    }
}

function toggleSelect(index) {
    cart[index].selected = !cart[index].selected;
    saveCart(); // Додаємо і сюди, щоб галочки теж зберігалися
    renderCart();
}

// --- 4. ОФОРМЛЕННЯ ЗАМОВЛЕННЯ ---

function openCheckout() {
    closeCart(); 
    document.getElementById('checkoutModal').style.display = 'flex';
    renderCheckoutSummary();
    autofillCheckoutData(); // Функція автозаповнення спрацює тут
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
}

function renderCheckoutSummary() {
    const container = document.getElementById('checkout-items');
    let total = 0;
    container.innerHTML = '';

    // Отримуємо дані користувача для перевірки ОПТу
    const userRaw = localStorage.getItem('currentUser');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const isWholesale = user && user.isWholesale === 'yes';

   cart.forEach(item => {
        if (item.selected) {
            // Беремо реальну ціну товару з пам'яті!
            const base = item.price;
            const actualPrice = getPrice(base, item.qty);
            
            total += actualPrice * item.qty;
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom: 5px;">
                    <span>${item.name} x${item.qty}</span>
                    <span>${actualPrice * item.qty} грн</span>
                </div>`;
        }
    });
    document.getElementById('checkout-total').innerText = `До сплати: ${total} грн`;
}

async function generateReceipt(event) {
    event.preventDefault();
    
    // 1. Отримуємо дані користувача (якщо він є)
    const userRaw = localStorage.getItem('currentUser');
    const user = userRaw ? JSON.parse(userRaw) : null;

    // 2. Прізвище, Ім'я, По батькові
    const firstName = document.getElementById('orderFirstName')?.value || "";
    const middleName = document.getElementById('orderMiddleName')?.value || "";
    const lastName = document.getElementById('orderLastName')?.value || "";
    const clientName = `${lastName} ${firstName} ${middleName}`.trim();
    
    // 3. ТЕЛЕФОН: Якщо залогінений — з бази, якщо ні — з поля вводу
    let userPhone = "";
    if (user) {
        userPhone = user.phone.replace(/\D/g, '');
    } else {
        const phoneInput = document.getElementById('checkoutPhone');
        if (!validatePhone(phoneInput)) {
            alert("Будь ласка, введіть коректний номер телефону для зв'язку");
            return;
        }
        userPhone = phoneInput.value.replace(/\D/g, '');
    }
    await autoRegisterGuest(clientName, userPhone);

    const payMethod = document.getElementById('paymentMethod')?.value === 'card' ? "Картка" : "Післяплата";
    const callback = document.getElementById('callbackMethod')?.value === 'yes' ? "Дзвонити" : "Не дзвонити";
    
    const shipMethod = document.getElementById('shippingMethod')?.value;
    let addressInfo = "";
    if (shipMethod === 'nova') {
        addressInfo = `Нова Пошта: м. ${document.getElementById('npCity')?.value}, ${document.getElementById('npWarehouse')?.value}`;
    } else {
        addressInfo = `Укрпошта: м. ${document.getElementById('orderUkrCity')?.value}, інд. ${document.getElementById('orderUkrIndex')?.value}`;
    }

    const comment = document.getElementById('orderComment')?.value || "немає";

    let totalSum = 0;
    const itemsForDB = cart.filter(i => i.selected).map(i => {
        // Беремо реальну ціну товару з кошика, а не вигадуємо її
        totalSum += (i.price * i.qty);
        return { name: i.name, qty: i.qty, price: i.price };
    });

    const message = `📦 **НОВЕ ЗАМОВЛЕННЯ (LEVKOVO)**\n\n👤 **Клієнт:** ${clientName}\n📞 **Тел:** +38 ${userPhone}\n🚚 **Доставка:** ${addressInfo}\n💳 **Оплата:** ${payMethod}\n📞 **Дзвінок:** ${callback}\n💬 **Коментар:** ${comment}\n\n🛒 **Товари:**\n${itemsForDB.map(i => `• ${i.name} [x${i.qty}]`).join('\n')}\n\n💰 **РАЗОМ: ${totalSum} грн**`;

    try {
        await supabaseClient.from('orders').insert([{
            client_name: clientName,
            phone: userPhone,
            address: addressInfo,
            items: itemsForDB,
            total_price: totalSum,
            status: 'В обробці',
            comment: `Оплата: ${payMethod}, Дзвінок: ${callback}, Коментар: ${comment}`
        }]);

       // 1. Відправка тексту замовлення
        await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "sendTelegram", message: message })
        });

        // 2. Відправка фото (якщо є)
        const photoData = localStorage.getItem('pendingFileBase64');
        if (photoData) {
            await fetch(DATABASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "sendTelegramPhoto", photoBase64: photoData })
            });
            localStorage.removeItem('pendingFileBase64');
        }

        cart = cart.filter(i => !i.selected); 
        saveCart(); 
        closeCheckout();
        renderReceiptOverlay(`${totalSum} грн`, itemsForDB.map(i => `• ${i.name} x${i.qty}`).join('<br>'));
    } catch (e) { console.error("Помилка:", e); alert("Сталася помилка при оформленні. Спробуйте ще раз."); }
}

function handleWsShippingChange() {
    const method = document.getElementById('wsShippingMethod').value;
    const npBlock = document.getElementById('wsNpOptions');
    const ukrBlock = document.getElementById('wsUkrOptions');
    
    // Ховаємо обидва блоки перед вибором
    if (npBlock) npBlock.style.display = 'none';
    if (ukrBlock) ukrBlock.style.display = 'none';
    
    if (method === 'nova') {
        if (npBlock) npBlock.style.display = 'block';
    } else if (method === 'ukr') {
        if (ukrBlock) ukrBlock.style.display = 'block';
        // Тут нічого не малюємо через JS, бо поля вже є в HTML (ми їх додали раніше)
    }
}

function handleNPTypeChange() {
    const method = document.getElementById('shippingMethod').value;
    const npBlock = document.getElementById('npOptions');
    const ukrBlock = document.getElementById('ukrOptions');
    
    if (npBlock) npBlock.style.display = (method === 'nova') ? 'block' : 'none';
    if (ukrBlock) ukrBlock.style.display = (method === 'ukr') ? 'block' : 'none';
}



function updateQtyInput(index, value) {
    const newQty = parseInt(value);
    if (newQty > 0) {
        cart[index].qty = newQty;
        renderCart(); // Перемальовуємо, щоб ціна змінилася на оптову, якщо стало >= 10
    } else {
        cart[index].qty = 1;
        renderCart();
    }
}
function openProductPage(productId) {
    // productId — це назва файлу або унікальний код товару
    // Наприклад: product.html?id=brelok-crazy-horse
    window.location.href = `product.html?id=${productId}`;
}

function autofillWholesaleData() {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) return;
    const user = JSON.parse(userRaw);

    // Шукаємо елементи (вони є тільки в wholesale.html)
    const elLastName = document.getElementById('wsLastName');
    const elFirstName = document.getElementById('wsFirstName');
    const elMiddleName = document.getElementById('wsMiddleName');
    const elPhone = document.getElementById('wsPhone');
    const elUkrCity = document.getElementById('wsUkrCity');

    // Якщо ми НЕ на сторінці оптовиків (елементів немає) — просто виходимо
    if (!elLastName) return;

    const nameParts = user.name ? user.name.split(' ') : [];
    
    // Заповнюємо ПІБ
    elLastName.value = nameParts[0] || "";
    elFirstName.value = nameParts[1] || "";
    elMiddleName.value = nameParts[2] || ""; // Клієнт допише, якщо порожньо
    
    // Телефон
    if (elPhone) {
        elPhone.value = user.phone ? user.phone.replace('+380', '').replace(/\D/g, '') : "";
    }
    
    // МІСТО (автозаповнення для Укрпошти з реєстрації)
    if (elUkrCity && user.city) {
        elUkrCity.value = user.city;
    }
}
function fastTransition(element) {
    // Додаємо клас для миттєвого збільшення
    element.classList.add('logo-boom');
    
    // Через 150мс переходимо на сторінку Про нас
    setTimeout(() => {
        window.location.href = 'about.html';
    }, 150);
}
function openContacts() {
    // Якщо відкрите бокове меню — закриваємо його
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        toggleSidebar();
    }
    document.getElementById('contactsModal').style.display = 'flex';
}

function closeContacts() {
    document.getElementById('contactsModal').style.display = 'none';
}

// Закриття вікна при кліку на фон
window.onclick = function(event) {
    const modal = document.getElementById('contactsModal');
    if (event.target == modal) {
        closeContacts();
    }
}
function validatePhone(input) {
    // Залишаємо тільки цифри
    let val = input.value.replace(/\D/g, '');
    input.value = val;

    // Шукаємо батьківський контейнер для рамки
    const container = input.parentElement;

    // Перевірка: має бути рівно 10 цифр і починатися з 0
    if (val.length === 10 && val.startsWith('0')) {
        container.style.borderColor = "#32CD32"; // Зелений (успіх)
        return true;
    } else {
        container.style.borderColor = "#ff4d4d"; // Червоний (помилка)
        return false;
    }
}
function renderReceiptOverlay(total, itemsHtml) {
    const overlay = document.getElementById('receiptOverlay');
    const printBox = document.getElementById('receiptPrint');
    
    if (overlay && printBox) {
        printBox.innerHTML = `
            <h2 style="color: #8b4513;">Дякуємо за замовлення!</h2>
            <p style="margin: 15px 0;">Ми отримали ваш запит і скоро зв'яжемося для підтвердження.</p>
            <div style="text-align: left; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px dashed #ccc;">
                <strong>Ваші товари:</strong><br>
                ${itemsHtml}
                <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                <div style="font-weight: bold; font-size: 1.1rem; text-align: right;">${total}</div>
            </div>
            <button class="modal-btn btn-confirm" style="margin-top: 20px;" onclick="location.reload()">На головну</button>
        `;
        overlay.style.display = 'flex';
    }
}
// JS для оновлення назви вибраного файлу
function handleFileChange(input) {
    const status = document.getElementById('file-filename');
    if (input.files.length > 0) {
        status.innerText = input.files[0].name; // Показуємо назву файлу
    } else {
        status.innerText = "Файл не вибрано";
    }
}


$(document).ready(function() {
    // Пошук міста
    $('#npCity').on('input', async function() {
        let val = $(this).val();
        let listContainer = $(this).next('.autocomplete-list');
        
        if (val.length < 2) return listContainer.hide();

        try {
            // Звертаємося до нашого Google-сейфа
            const response = await fetch(DATABASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "novaPoshta", calledMethod: "getCities", methodProperties: { FindByString: val } })
            });
            const res = await response.json();

            let html = '';
            if(res.data && res.data.length > 0) {
                res.data.forEach(city => {
                    html += `<div class="list-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="selectCity('${city.Description}', '${city.Ref}')">${city.Description}</div>`;
                });
                listContainer.html(html).show();
            } else {
                listContainer.hide();
            }
        } catch (e) { console.error("Помилка НП:", e); }
    });
});

// Функція вибору міста (залишається без змін, але ось вона)
function selectCity(name, ref) {
    $('#npCity').val(name);
    $('.autocomplete-list').hide();
    $('#npWarehouse').prop('disabled', false).val('').focus();
    setupWarehouseSearch(ref); 
}

// Пошук відділень
function setupWarehouseSearch(cityRef) {
    $('#npWarehouse').off('input').on('input', async function() {
        let val = $(this).val();
        let listContainer = $(this).next('.autocomplete-list');
        
        try {
            // Звертаємося до нашого Google-сейфа
            const response = await fetch(DATABASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "novaPoshta", calledMethod: "getWarehouses", methodProperties: { CityRef: cityRef, FindByString: val } })
            });
            const res = await response.json();

            let html = '';
            if(res.data) {
                res.data.forEach(w => {
                    html += `<div class="list-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="selectWarehouse('${w.Description}')">${w.Description}</div>`;
                });
                listContainer.html(html).show();
            }
        } catch (e) { console.error("Помилка НП:", e); }
    });
}

function selectWarehouse(name) {
    $('#npWarehouse').val(name);
    $('.autocomplete-list').hide();
}
function selectColor(element) {
    // 1. Знімаємо виділення з усіх кружечків
    const allCircles = document.querySelectorAll('.color-circle');
    allCircles.forEach(circle => circle.classList.remove('active'));

    // 2. Додаємо виділення (рамку) на той, на який натиснули
    element.classList.add('active');

    // 3. Беремо назву кольору з атрибута data-color
    const colorName = element.getAttribute('data-color');

    // 4. Записуємо назву в приховане поле
    const hiddenInput = document.getElementById('selectedColorValue');
    if (hiddenInput) {
        hiddenInput.value = colorName;
    }
    
    console.log("Вибрано колір:", colorName);
}
function autofillCheckoutData() {
    console.log("Автозаповнення роздрібу поки не налаштовано");
}
// НОВА ФУНКЦІЯ: Автоматична реєстрація гостя при замовленні
async function autoRegisterGuest(name, phone) {
    const userRaw = localStorage.getItem('currentUser');
    if (userRaw) return; // Якщо вже залогінений — нічого не робимо

    console.log("Спроба автореєстрації для:", phone);

    try {
        // 1. Перевіряємо, чи існує такий номер у Google Таблиці
        const checkResponse = await fetch(`${DATABASE_URL}?phone=${phone}`);
        const checkData = await checkResponse.json();

        if (checkData.exists) {
            // Якщо акаунт уже є — просто логінимо його під цим ім'ям
            const existingUser = { name: checkData.name, phone: phone, isWholesale: checkData.isWholesale };
            localStorage.setItem('currentUser', JSON.stringify(existingUser));
            console.log("Користувач уже був у базі, просто увійшли.");
            return;
        }

        // 2. Якщо акаунта немає — створюємо новий (Роздрібний)
        const newUser = { 
            name: name, 
            phone: "'" + phone, // Апостроф для Excel
            isWholesale: "no", 
            city: "Авто-реєстрація" 
        };

        // Відправка в Google Таблицю
        await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(newUser)
        });

        // Повідомлення в Telegram про авто-реєстрацію
        const tgMsg = `🤖 **АВТО-РЕЄСТРАЦІЯ (ПРИ ЗАМОВЛЕННІ)**\n-------------------------\n📝 **Ім'я:** ${name}\n📞 **Тел:** ${phone}\n📍 Статус: Новий клієнт`;
        
      // НОВА БЕЗПЕЧНА ВІДПРАВКА ЧЕРЕЗ GOOGLE СЕЙФ
        await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "sendTelegram", message: tgMsg })
        });

        // 3. Зберігаємо в браузері, щоб клієнт став "авторизованим"
        localStorage.setItem('currentUser', JSON.stringify({ name, phone, isWholesale: "no" }));
        console.log("Авто-реєстрація завершена успішно.");

    } catch (e) {
        console.error("Помилка автореєстрації:", e);
    }
}
function autofillCheckoutData() {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) {
        console.log("Гість: автозаповнення не потрібне.");
        return;
    }

    const user = JSON.parse(userRaw);
    console.log("Автозаповнення для:", user.name);

    // 1. Розбиваємо ПІБ на частини (Твій функціонал)
    // Використовуємо регулярний вираз /\s+/, щоб пробіли не створювали порожніх рядків
    const nameParts = user.name ? user.name.trim().split(/\s+/) : [];
    
    // Знаходимо поля в index.html (Роздріб)
    const elLastName = document.getElementById('orderLastName');
    const elFirstName = document.getElementById('orderFirstName');
    const elMiddleName = document.getElementById('orderMiddleName');
    const elPhone = document.getElementById('checkoutPhone');

    // Заповнюємо, Прізвище - Ім'я - По батькові (Твій функціонал)
    if (elLastName) elLastName.value = nameParts[0] || "";
    if (elFirstName) elFirstName.value = nameParts[1] || "";
    if (elMiddleName) elMiddleName.value = nameParts[2] || "";

    // 2. ТЕЛЕФОН (Твій функціонал з очищенням від +38)
    if (elPhone && user.phone) {
        let cleanPhone = user.phone.replace('+38', '').replace(/\D/g, '');
        // Якщо номер довгий (наприклад 38068...), лишаємо останні 10 цифр
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        
        elPhone.value = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;
        
        // Твоя валідація, щоб рамка відразу стала зеленою
        if (typeof validatePhone === "function") {
            validatePhone(elPhone);
        }
    }

    // 3. МІСТО (Твій функціонал для Укрпошти)
    const elUkrCity = document.getElementById('orderUkrCity');
    if (elUkrCity && user.city && user.city !== "Не вказано") {
        elUkrCity.value = user.city;
    }
}


// 2. Перевірка на адміна для показу кнопки "Додати категорію"
async function checkAdminForCategories() {
    const controlsContainer = document.getElementById('admin-category-controls');
    if (!controlsContainer) return;
    const isAdmin = await isAdminUser();
    controlsContainer.style.display = isAdmin ? 'block' : 'none';
}

async function checkAdminForProducts() {
    const controls = document.getElementById('admin-product-controls');
    if (!controls) return;
    const isAdmin = await isAdminUser();
    controls.style.display = isAdmin ? 'block' : 'none';
}

// ==========================================
// ДВИГУН КАТЕГОРІЙ (ЗАВАНТАЖЕННЯ + CRUD)
// ==========================================
let loadedCategories = []; 
let currentEditCategoryId = null;

// --- 1. ЗАВАНТАЖЕННЯ КАТЕГОРІЙ (РОЗДРІБ) ---
async function loadCategories() {
    const container = document.getElementById('category-grid-container');
    if (!container) return;

    const isAdmin = await isAdminUser(); 

    try {
        // ЗАВАНТАЖУЄМО ТІЛЬКИ ТІ, ЩО НЕ ПОЧИНАЮТЬСЯ НА ws_
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .not('id', 'like', 'ws_%'); 

        if (error) throw error;
        loadedCategories = categories || [];

        if (loadedCategories.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color: #666; padding: 20px;">Категорій поки немає.</p>';
            return;
        }

        container.innerHTML = loadedCategories.map(cat => {
            const adminPanel = isAdmin ? `
                <div style="display:flex; justify-content:space-between; margin-top:8px;">
                    <button onclick="event.stopPropagation(); editCategory('${cat.id}')" style="background:#f39c12; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">✏️ Редаг.</button>
                    <button onclick="event.stopPropagation(); deleteCategory('${cat.id}')" style="background:#e74c3c; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">🗑️ Видал.</button>
                </div>
            ` : '';

            return `
            <div style="display: flex; flex-direction: column;">
                <div class="category-card" onclick="window.location.href='category.html?type=${cat.id}'">
                    <img src="${cat.image_url}" alt="${cat.title}" onerror="this.src='default.jpg'">
                    <span>${cat.title}</span>
                </div>
                ${adminPanel}
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

// --- 2. ЗАВАНТАЖЕННЯ КАТЕГОРІЙ (ОПТОВИХ) ---
async function loadWholesaleCategories() {
    const container = document.getElementById('ws-category-container');
    if (!container) return;

    const isAdmin = await isAdminUser(); 

    try {
        // ЗАВАНТАЖУЄМО ТІЛЬКИ ТІ, ЩО ПОЧИНАЮТЬСЯ НА ws_
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .like('id', 'ws_%'); 

        if (error) throw error;
        // Зберігаємо їх у той самий масив, щоб працювало редагування
        loadedCategories = categories || [];

        if (loadedCategories.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color: #666; padding: 20px;">Оптових категорій поки немає. Адмін має їх додати.</p>';
            return;
        }

        container.innerHTML = loadedCategories.map(cat => {
            const adminPanel = isAdmin ? `
                <div style="display:flex; justify-content:space-between; margin-top:8px;">
                    <button onclick="event.stopPropagation(); editCategory('${cat.id}')" style="background:#f39c12; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">✏️ Редаг.</button>
                    <button onclick="event.stopPropagation(); deleteCategory('${cat.id}')" style="background:#e74c3c; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">🗑️ Видал.</button>
                </div>
            ` : '';

            return `
            <div style="display: flex; flex-direction: column;">
                <div class="category-card" onclick="window.location.href='wholesale.html?type=${cat.id}'">
                    <img src="${cat.image_url}" alt="${cat.title}" onerror="this.src='default.jpg'">
                    <span>${cat.title}</span>
                </div>
                ${adminPanel}
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

async function checkAdminForCategories() {
    const controls = document.getElementById('admin-category-controls');
    if (!controls) return;
    const isAdmin = await isAdminUser();
    controls.style.display = isAdmin ? 'block' : 'none';
}

function openAddCategoryModal() { 
    currentEditCategoryId = null;
    document.getElementById('newCatId').value = '';
    document.getElementById('newCatTitle').value = '';
    document.getElementById('newCatImage').value = '';
    document.getElementById('newCatId').disabled = false; 
    document.querySelector('#addCategoryModal h2').innerText = "Нова категорія";
    document.getElementById('addCategoryModal').style.display = 'flex'; 
}

function closeAddCategoryModal() { 
    document.getElementById('addCategoryModal').style.display = 'none'; 
}

function editCategory(id) {
    const cat = loadedCategories.find(c => c.id === id);
    if (!cat) return alert("Помилка: категорію не знайдено.");

    currentEditCategoryId = id; 
    document.getElementById('newCatId').value = cat.id;
    document.getElementById('newCatId').disabled = true; // Захист ключа бази
    document.getElementById('newCatTitle').value = cat.title;
    document.getElementById('newCatImage').value = cat.image_url;
    
    document.querySelector('#addCategoryModal h2').innerText = "Редагувати категорію";
    document.getElementById('addCategoryModal').style.display = 'flex';
}

async function deleteCategory(id) {
    if (!confirm("Видалити цю категорію? Всі товари в ній можуть зникнути!")) return;
    try {
        const { error } = await supabaseClient.from('categories').delete().eq('id', id);
        if (error) throw error;
        loadCategories(); 
    } catch (error) {
        alert("Помилка: " + error.message);
    }
}

async function saveNewCategory() {
    const id = document.getElementById('newCatId').value.trim();
    const title = document.getElementById('newCatTitle').value.trim();
    const image_url = document.getElementById('newCatImage').value.trim();

    if (!id || !title || !image_url) return alert("Заповніть всі поля!");

    try {
        if (currentEditCategoryId) {
            const { error } = await supabaseClient.from('categories').update({ title, image_url }).eq('id', currentEditCategoryId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('categories').insert([{ id, title, image_url }]);
            if (error) {
                if (error.code === '23505') throw new Error("Такий ID вже існує!");
                throw error;
            }
        }
        closeAddCategoryModal();
        loadCategories(); 
    } catch (error) {
        alert("Помилка: " + error.message);
    }
}

// Запуск при завантаженні (для категорій)
window.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    checkAdminForCategories();
});
// ==========================================

// ЗБЕРЕЖЕННЯ (Розумне: Створення або Оновлення)
async function saveNewCategory() {
    const id = document.getElementById('newCatId').value.trim();
    const title = document.getElementById('newCatTitle').value.trim();
    const image_url = document.getElementById('newCatImage').value.trim();

    if (!id || !title || !image_url) {
        alert("Заповніть всі поля. Ніякої халтури.");
        return;
    }

    try {
        if (currentEditCategoryId) {
            // ОНОВЛЕННЯ існуючої категорії
            const { error } = await supabaseClient
                .from('categories')
                .update({ title: title, image_url: image_url })
                .eq('id', currentEditCategoryId);

            if (error) throw error;
            alert("Категорію успішно оновлено.");
        } else {
            // СТВОРЕННЯ нової категорії
            const { error } = await supabaseClient
                .from('categories')
                .insert([{ id, title, image_url }]);

            if (error) {
                if (error.code === '23505') throw new Error("Такий ID вже існує! Придумай інший.");
                throw error;
            }
            alert("Категорію успішно додано.");
        }

        closeAddCategoryModal();
        loadCategories(); // Миттєво перемальовуємо сітку
    } catch (error) {
        console.error("Помилка збереження:", error);
        alert("Помилка: " + error.message);
    }
}
// --- ЛОГІКА СТОРІНКИ КАТЕГОРІЙ ---

async function initCategoryPage() {
    // Перевіряємо, чи ми взагалі на сторінці категорій
    const titleElement = document.getElementById('dynamic-category-title');
    if (!titleElement) return;

    // 1. Читаємо URL (напр. ?type=wallets)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('type');

    if (!categoryId) {
        titleElement.innerText = "Категорію не знайдено";
        return;
    }

    // 2. Витягуємо назву категорії з бази
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('title')
            .eq('id', categoryId)
            .single();

        if (error) throw error;
        titleElement.innerText = data.title; // Ставимо правильний заголовок
    } catch (e) {
        console.error("Помилка завантаження заголовка:", e);
        titleElement.innerText = "Категорія";
    }

    // 3. Перевіряємо, чи ми адмін, щоб показати кнопку "Додати товар"
    checkAdminForProducts();
    
    // 4. Функція завантаження товарів буде тут (поки порожня)
    loadProducts(categoryId);
}



// Запускаємо логіку при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    initCategoryPage();
});
// --- ЛОГІКА ДОДАВАННЯ ТОВАРУ ---
// --- ЛОГІКА КЕРУВАННЯ ТОВАРАМИ (CRUD) ---
let loadedProducts = []; // Тут будемо зберігати товари, щоб не смикати базу зайвий раз
let currentEditProductId = null; // Запобіжник: якщо null - створюємо, якщо є ID - оновлюємо

// Модифікована кнопка "Додати" (очищає форму)
function openAddProductModal() { 
    currentEditProductId = null;
    document.getElementById('newProdTitle').value = '';
    document.getElementById('newProdDesc').value = '';
    document.getElementById('newProdDetailedDesc').value = ''; // Нове поле
    document.getElementById('newProdPrice').value = '';
    document.getElementById('newProdImage').value = '';
    document.getElementById('newProdGallery').value = '';
    document.querySelector('#addProductModal h2').innerText = "Новий товар";
    document.getElementById('addProductModal').style.display = 'flex'; 
    document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}
function closeAddProductModal() { document.getElementById('addProductModal').style.display = 'none'; }
function closeAddProductModal() { document.getElementById('addProductModal').style.display = 'none'; }

// Відкрити модалку з існуючими даними
function editProduct(id) {
    const prod = loadedProducts.find(p => p.id === id);
    if (!prod) return;

    currentEditProductId = id; 
    document.getElementById('newProdTitle').value = prod.title;
    document.getElementById('newProdDesc').value = prod.description;
    document.getElementById('newProdPrice').value = prod.price;
    document.getElementById('newProdImage').value = prod.main_image;
      const features = prod.features || {};
    // Відновлюємо галерею (склеюємо масив у текст через перенесення рядка)
    document.getElementById('newProdGallery').value = features.gallery ? features.gallery.join('\n') : "";

   

    // Відновлюємо детальний опис
    document.getElementById('newProdDetailedDesc').value = features.detailedDescription || "";

    const colors = features.colors || [];
    document.querySelectorAll('.prod-color').forEach(cb => cb.checked = colors.includes(cb.value));

    const hardware = features.hardware || [];
    document.querySelectorAll('.prod-hardware').forEach(cb => cb.checked = hardware.includes(cb.value));

    document.getElementById('optEngraving').checked = !!features.hasEngraving;
    document.getElementById('optEmbossing').checked = !!features.hasEmbossing;
    document.getElementById('optComment').checked = !!features.hasComment; // Нова галочка
    document.getElementById('optLogo').checked = !!features.hasLogo;

    document.querySelector('#addProductModal h2').innerText = "Редагувати товар";
    document.getElementById('addProductModal').style.display = 'flex';
}
// Видалення
async function deleteProduct(id) {
    if (!confirm("Ти точно хочеш видалити цей товар?")) return;

    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        
        // Розумне оновлення екрану
        if (document.getElementById('is-homepage')) {
            loadProducts('popular');
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            loadProducts(urlParams.get('type'));
        }
    } catch (error) {
        alert("Помилка видалення: " + error.message);
    }
}

// Розумне збереження (Insert або Update)
async function saveNewProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    let categoryId = urlParams.get('type');
    
    // Якщо ми на головній сторінці, примусово записуємо товар у категорію 'popular'
    if (document.getElementById('is-homepage')) {
        categoryId = 'popular';
    }

    if (!categoryId && !currentEditProductId) return alert("Помилка: невідома категорія.");

    const title = document.getElementById('newProdTitle').value.trim();
    const description = document.getElementById('newProdDesc').value.trim();
    const detailedDescription = document.getElementById('newProdDetailedDesc').value.trim(); 
    const price = parseInt(document.getElementById('newProdPrice').value.trim());
    const main_image = document.getElementById('newProdImage').value.trim();

    if (!title || !price || !main_image) return alert("Заповніть базові дані (Назва, Ціна, Фото)!");

   const selectedColors = Array.from(document.querySelectorAll('.prod-color:checked')).map(cb => cb.value);
    const selectedHardware = Array.from(document.querySelectorAll('.prod-hardware:checked')).map(cb => cb.value);
    
    // Збираємо галерею: розбиваємо текст по рядках, забираємо пробіли, викидаємо порожні
    const galleryRaw = document.getElementById('newProdGallery').value.trim();
    const galleryUrls = galleryRaw ? galleryRaw.split('\n').map(s => s.trim()).filter(s => s !== '') : [];

    const featuresJSON = {
        gallery: galleryUrls, // <--- ДОДАЛИ ГАЛЕРЕЮ В JSON
        colors: selectedColors,
        hardware: selectedHardware,
        detailedDescription: detailedDescription,
        hasEngraving: document.getElementById('optEngraving').checked,
        hasEmbossing: document.getElementById('optEmbossing').checked,
        hasComment: document.getElementById('optComment').checked,
        hasLogo: document.getElementById('optLogo').checked
    };

    try {
        if (currentEditProductId) {
            const { error } = await supabaseClient
                .from('products')
                .update({ title, description, price, main_image, features: featuresJSON })
                .eq('id', currentEditProductId);
            if (error) throw error;
            alert("Товар успішно оновлено!");
        } else {
            const { error } = await supabaseClient
                .from('products')
                .insert([{ category_id: categoryId, title, description, price, main_image, features: featuresJSON }]);
            if (error) throw error;
            alert("Товар успішно додано на вітрину!");
        }

        closeAddProductModal();
        
        // Розумне оновлення екрану
        if (document.getElementById('is-homepage')) {
            loadProducts('popular'); // Оновлюємо головну
        } else {
            loadProducts(categoryId); // Оновлюємо сторінку категорії
        }
        
    } catch (error) {
        alert("Помилка бази: " + error.message);
    }
}
// --- ЗАВАНТАЖЕННЯ ТА ВІДОБРАЖЕННЯ ТОВАРІВ ---
async function loadProducts(categoryId) {
    const container = document.getElementById('category-products-container');
    if (!container) return;

    // НОВА ПЕРЕВІРКА АДМІНА:
    const isAdmin = await isAdminUser();

    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('category_id', categoryId);
        // ... ДАЛІ ВЕСЬ ТВІЙ СТАРИЙ КОД ЦІЄЇ ФУНКЦІЇ ...

        if (error) throw error;

        loadedProducts = products || []; // Зберігаємо в пам'ять для редагування

        if (loadedProducts.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Товарів у цій категорії поки немає.</p>';
            return;
        }

        container.innerHTML = loadedProducts.map(prod => {
            // Генеруємо панель адміна тільки якщо це ти
            const adminPanel = isAdmin ? `
                <div style="display:flex; justify-content:space-between; margin-top:12px; border-top:1px solid #eee; padding-top:12px;">
                    <button onclick="event.stopPropagation(); editProduct('${prod.id}')" style="background:#f39c12; color:white; border:none; border-radius:5px; padding:6px 12px; cursor:pointer; font-weight:bold; font-size:0.8rem; width:48%;">✏️ Редагувати</button>
                    <button onclick="event.stopPropagation(); deleteProduct('${prod.id}')" style="background:#e74c3c; color:white; border:none; border-radius:5px; padding:6px 12px; cursor:pointer; font-weight:bold; font-size:0.8rem; width:48%;">🗑️ Видалити</button>
                </div>
            ` : '';

            return `
            <div class="product-card" onclick="window.location.href='product.html?id=${prod.id}'" style="cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; background: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: transform 0.2s;">
                <div>
                    <img src="${prod.main_image}" alt="${prod.title}" onerror="this.src='default.jpg'" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="font-size: 1.1rem; margin: 0 0 10px 0; color: #000; text-align: center;">${prod.title}</h3>
                    <p style="font-size: 0.85rem; color: #666; text-align: center; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${prod.description}</p>
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 1.2rem; text-align: center; color: #8b4513; margin-bottom: 15px;">${prod.price} грн</div>
                    <button onclick="event.stopPropagation(); window.location.href='product.html?id=${prod.id}'" style="width: 100%; background: #8b4513; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        Хочу
                    </button>
                    ${adminPanel} 
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">Помилка завантаження.</p>';
    }
}
// --- СИСТЕМА АВТОРИЗАЦІЇ SUPABASE ---
async function submitAdminAuth() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!email || !password) {
        alert("Заповни всі поля.");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        
        alert("Броню пробито. Ти авторизований.");
        document.getElementById('adminAuthModal').style.display = 'none';
        
        // Перезавантажуємо сторінку, щоб всі скрипти побачили токен і намалювали кнопки редагування
        window.location.reload(); 
    } catch (err) {
        console.error("Помилка входу:", err);
        alert("Помилка доступу: " + err.message);
    }
}
// ==========================================
// ДИНАМІЧНИЙ РЕНДЕР СТОРІНКИ ТОВАРУ (product.html)
// ==========================================

// Словники для перекладу системних значень у візуал
const dictColors = {
    'cognac': { hex: '#8b4513', name: 'Коньяк' },
    'black': { hex: '#222222', name: 'Чорний' },
    'red': { hex: '#8b0000', name: 'Червоний' },
    'green': { hex: '#006400', name: 'Зелений' },
    'chocolate': { hex: '#3b2818', name: 'Шоколад' },
    'yellow': { hex: '#e5b73b', name: 'Жовтий' },
    'lightblue': { hex: '#5b92e5', name: 'Голубий' },
    'cappuccino': { hex: '#9c7e65', name: 'Капучино' },
    'caramel': { hex: '#c07c40', name: 'Карамель' },
    'olive': { hex: '#4b5320', name: 'Олива' },
    'navy': { hex: '#1c2e4a', name: 'Темно-синій' },
    'burgundy': { hex: '#4a0e17', name: 'Бордовий' }
};

const dictHardware = {
    'silver': 'Срібло (Нікель)',
    'brass': 'Антик (Латунь)',
    'gold': 'Золото'
};

async function initSingleProductPage() {
    const titleEl = document.getElementById('prod-title');
    if (!titleEl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        titleEl.innerText = "Товар не знайдено";
        return;
    }

    try {
        const { data: prod, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        const features = prod.features || {};

        // 1. Заповнюємо базову інфу
        titleEl.innerText = prod.title;
        // Якщо є детальний опис - показуємо його. Якщо немає - показуємо короткий.
        document.getElementById('prod-desc').innerText = features.detailedDescription ? features.detailedDescription : prod.description;
        document.getElementById('prod-price').innerText = `${prod.price} грн`;
        document.getElementById('prod-img').src = prod.main_image;
        // --- РЕНДЕР ГАЛЕРЕЇ (КАРУСЕЛІ) ---
        const thumbnailsContainer = document.getElementById('prod-thumbnails');
        if (features.gallery && features.gallery.length > 0) {
            // Об'єднуємо головне фото + всі додаткові з галереї
            const allImages = [prod.main_image, ...features.gallery];
            
            thumbnailsContainer.innerHTML = allImages.map(imgUrl => `
                <img src="${imgUrl}" 
                     onclick="document.getElementById('prod-img').src='${imgUrl}'" 
                     style="min-width: 60px; width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #ccc;"
                     onmouseover="this.style.border='2px solid #8b4513'" 
                     onmouseout="this.style.border='1px solid #ccc'">
            `).join('');
        } else {
            thumbnailsContainer.innerHTML = ''; // Якщо додаткових фото немає - нічого не малюємо
        }

        // --- РЕНДЕР КОЛЬОРІВ ---
        if (features.colors && features.colors.length > 0) {
            document.getElementById('section-colors').style.display = 'block';
            const container = document.getElementById('render-colors');
            container.innerHTML = features.colors.map((colorKey, index) => {
                const c = dictColors[colorKey];
                if(!c) return '';
                const isActive = index === 0 ? 'border: 3px solid #000; transform: scale(1.1);' : 'border: 1px solid #ccc;';
                if(index === 0) document.getElementById('selectedColorValue').value = c.name;

                return `<div onclick="selectDynamicColor(this, '${c.name}')" class="dyn-color-circle" style="width: 30px; height: 30px; border-radius: 50%; background-color: ${c.hex}; cursor: pointer; transition: 0.2s; ${isActive}" title="${c.name}"></div>`;
            }).join('');
        }

        // --- РЕНДЕР ФУРНІТУРИ ---
        if (features.hardware && features.hardware.length > 0) {
            document.getElementById('section-hardware').style.display = 'block';
            const container = document.getElementById('render-hardware');
            container.innerHTML = features.hardware.map((hwKey, index) => {
                const name = dictHardware[hwKey];
                if(!name) return '';
                const isChecked = index === 0 ? 'checked' : '';
                if(index === 0) document.getElementById('selectedHardwareValue').value = name;

                return `<label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="hw_radio" value="${name}" ${isChecked} onchange="document.getElementById('selectedHardwareValue').value = this.value"> ${name}
                        </label>`;
            }).join('');
        }

        // --- РЕНДЕР ТЕКСТОВИХ ПОЛІВ ---
        let textsHtml = '';
        if (features.hasEngraving) {
            textsHtml += `
                <strong style="display:block; margin-bottom: 5px;">Текст гравіювання:</strong>
                <input type="text" id="input-engraving" class="levkovo-input" placeholder="Напишіть текст..." style="margin-bottom: 15px; width: 100%; box-sizing: border-box;">
            `;
        }
        if (features.hasEmbossing) {
            textsHtml += `
                <strong style="display:block; margin-bottom: 5px;">Текст тиснення:</strong>
                <input type="text" id="input-embossing" class="levkovo-input" placeholder="Ініціали або коротке слово..." style="margin-bottom: 15px; width: 100%; box-sizing: border-box;">
            `;
        }
        // ДОДАЛИ НОВЕ ПОЛЕ КОМЕНТАРЯ
        if (features.hasComment) {
            textsHtml += `
                <strong style="display:block; margin-bottom: 5px;">Коментар до товару:</strong>
                <textarea id="input-comment" class="levkovo-input" placeholder="Ваші побажання до замовлення..." rows="2" style="margin-bottom: 15px; width: 100%; box-sizing: border-box;"></textarea>
            `;
        }
        document.getElementById('section-texts').innerHTML = textsHtml;

        // --- РЕНДЕР ЗАВАНТАЖЕННЯ ФОТО ---
        if (features.hasLogo) {
            document.getElementById('section-photo').style.display = 'block';
        }

    } catch (e) {
        console.error("Помилка завантаження сторінки товару:", e);
        titleEl.innerText = "Помилка завантаження";
    }
}

// Функція для перемикання кольорів (візуал + приховане поле)
function selectDynamicColor(element, colorName) {
    document.querySelectorAll('.dyn-color-circle').forEach(el => {
        el.style.border = '1px solid #ccc';
        el.style.transform = 'scale(1)';
    });
    element.style.border = '3px solid #000';
    element.style.transform = 'scale(1.1)';
    document.getElementById('selectedColorValue').value = colorName;
}
// Єдиний запуск усіх систем при завантаженні
window.addEventListener('DOMContentLoaded', () => {
    // Даємо браузеру 100мс "продихатися", щоб він точно побачив усі ID в HTML
    setTimeout(() => {
        updateProfileUI();    
        if (typeof updateCartCount === "function") updateCartCount();   
        // 4. Запуск всіх товарів для головної сторінки
    if (typeof loadAllProducts === "function") loadAllProducts();
    // Запуск рендеру для головної сторінки (Популярні товари)
    if (document.getElementById('is-homepage')) {
        loadProducts('popular');
        checkAdminForProducts(); // Показує кнопку "Додати товар" для адміна
    }
        // Перевірка на автоматичне відкриття кошика (Твій код)
        if (window.location.hash === '#cart') {
            history.replaceState(null, null, window.location.pathname);
            if (typeof openCart === "function") openCart(); 
        }
    }, 100);
});
// ==========================================
// ЗБИРАННЯ ДИНАМІЧНОГО ТОВАРУ В КОШИК
// ==========================================
async function addDynamicProductToCart() {
    // 1. Базові дані
    const titleEl = document.getElementById('prod-title');
    const priceEl = document.getElementById('prod-price');
    const imgEl = document.getElementById('prod-img');
    
    if (!titleEl || titleEl.innerText === "Завантаження...") return;

    const baseName = titleEl.innerText;
    const basePrice = parseInt(priceEl.innerText.replace(/\D/g, ''));
    const imgSrc = imgEl.src;

    // 2. Збираємо всі вибрані опції в один масив
    let options = [];
    
    // Колір
    const colorVal = document.getElementById('selectedColorValue')?.value;
    if (colorVal && document.getElementById('section-colors').style.display !== 'none') {
        options.push(`Колір: ${colorVal}`);
    }

    // Фурнітура
    const hwVal = document.getElementById('selectedHardwareValue')?.value;
    if (hwVal && document.getElementById('section-hardware').style.display !== 'none') {
        options.push(`Фурнітура: ${hwVal}`);
    }

    // Гравіювання
    const engVal = document.getElementById('input-engraving')?.value.trim();
    if (engVal) options.push(`Гравіювання: "${engVal}"`);

    // Тиснення
    const embVal = document.getElementById('input-embossing')?.value.trim();
    if (embVal) options.push(`Тиснення: "${embVal}"`);

    // Коментар
    const comVal = document.getElementById('input-comment')?.value.trim();
    if (comVal) options.push(`Коментар: "${comVal}"`);

    // 3. Формуємо фінальну назву (База + [Опції])
    const finalName = options.length > 0 ? `${baseName} [${options.join(' | ')}]` : baseName;

    // 4. Обробка фото/логотипу
    const fileInput = document.getElementById('logo-photo');
    let hasFile = false;
    
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 2000000) {
            alert("Файл занадто великий для кошика. Ми візьмемо його безпосередньо при оформленні!");
        } else {
            hasFile = true;
            const fileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            localStorage.setItem('pendingFileBase64', fileData);
        }
    }

    // 5. Безпосереднє додавання в пам'ять кошика
    try {
        const existing = cart.find(item => item.name === finalName);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ 
                name: finalName, 
                price: basePrice, 
                img: imgSrc, 
                qty: 1, 
                selected: true,
                hasFile: hasFile
            });
        }
        
        saveCart(); // Зберігаємо локально і оновлюємо циферку
        alert('Товар додано до кошика! 🐂'); 
        openCart(); // Миттєво відкриваємо кошик перед клієнтом
        renderCart();
    } catch (error) {
        console.error("Помилка додавання в кошик:", error);
        alert("Сталася помилка при додаванні.");
    }
}

