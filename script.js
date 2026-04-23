// ==========================================
// Ініціалізація Supabase
// ==========================================
const SUPABASE_URL = 'https://gbcjezzvioayompuqojx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YSAGI0OwC12XkBCVmkBMsw_0TVpkgjW';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DATABASE_URL = "https://script.google.com/macros/s/AKfycbwb60vHMeNOckDntRgobBn2Q7ULD3q8Xfer3Cj3dxKrbQTkzQl3u-eRwyWiUpBP3k398Q/exec";

// ==========================================
// ГЛОБАЛЬНА ПЕРЕВІРКА СТАТУСУ КОРИСТУВАЧА
// ==========================================
function isWholesaleUser() {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) return false;
    try {
        const user = JSON.parse(userRaw);
        return user.isWholesale === 'yes';
    } catch (e) { return false; }
}

// ==========================================
// 1. АВТОРИЗАЦІЯ ТА ПРОФІЛЬ
// ==========================================
async function isAdminUser() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session !== null;
    } catch (e) { return false; }
}

async function submitAdminAuth() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    if (!email || !password) return alert("Заповни всі поля.");
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert("Броню пробито. Ти авторизований.");
        document.getElementById('adminAuthModal').style.display = 'none';
        window.location.reload(); 
    } catch (err) { alert("Помилка доступу: " + err.message); }
}

let isWholesaleMode = false;

function toggleWholesaleUI() {
    isWholesaleMode = !isWholesaleMode;
    const fields = document.getElementById('wholesaleFields');
    const btn = document.getElementById('ws-toggle-btn');
    
    if (isWholesaleMode) {
        fields.style.display = 'block';
        btn.innerText = "💼 Партнерський доступ увімкнено";
        btn.style.color = "#8b4513";
        btn.style.fontWeight = "bold";
        btn.style.borderBottom = "none";
    } else {
        fields.style.display = 'none';
        btn.innerText = "Є секретний код партнера?";
        btn.style.color = "#888";
        btn.style.fontWeight = "normal";
        btn.style.borderBottom = "1px dashed #888";
        document.getElementById('wsPinCode').value = '';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const phoneInput = document.getElementById('regPhone');
    const nameInput = document.getElementById('regName');
    const passwordInput = document.getElementById('regPassword');
    const cityInput = document.getElementById('regCity');
    const submitBtn = document.getElementById('regSubmitBtn');

    if (!validatePhone(phoneInput)) return alert("Введіть коректний номер (10 цифр)");

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim(); 
    const password = passwordInput.value.trim();
    const city = cityInput?.value.trim() || "Не вказано";
    
    if(password.length < 4) return alert("Пароль має бути не коротшим за 4 символи.");

    submitBtn.innerText = "Перевірка...";
    submitBtn.disabled = true;

    if (isWholesaleMode) {
        const pin = document.getElementById('wsPinCode').value.trim();
        if (!pin) {
            alert("Введіть PIN-код партнера!");
            submitBtn.innerText = "Зареєструватися"; submitBtn.disabled = false;
            return;
        }
        
        try {
            const pinCheck = await fetch(DATABASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "verifyPin", pin: pin })
            });
            const pinResult = await pinCheck.json();
            if (!pinResult.valid) {
                alert("❌ Невірний PIN-код! Спробуйте ще раз або зверніться до менеджера.");
                document.getElementById('wsPinCode').value = ''; 
                submitBtn.innerText = "Зареєструватися"; submitBtn.disabled = false;
                return; 
            }
        } catch(e) {
            alert("Помилка з'єднання з сервером перевірки.");
            submitBtn.innerText = "Зареєструватися"; submitBtn.disabled = false;
            return;
        }
    }

    const isWholesaleStr = isWholesaleMode ? 'yes' : 'no';
    const userData = { action: "", name, phone: phone, isWholesale: isWholesaleStr, city, password }; 

    try {
        const response = await fetch(DATABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(userData)
        });
        const result = await response.json();

        if (result.result === "exists") {
            alert(`Ви вже зареєстровані! Входьте за номером телефону та паролем.`);
            showLogin();
        } else if (result.result === "success") {
            const message = `👤 **НОВА РЕЄСТРАЦІЯ: LEVKOVO**\n-------------------------\n📝 **Ім'я:** ${name}\n📞 **Тел:** ${phone}\n🏢 **Тип:** ${isWholesaleMode ? 'ОПТОВИЙ ПАРТНЕР 💼' : 'Роздрібний'}\n📍 **Місто:** ${city}`;
            await fetch(DATABASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "sendTelegram", message: message }) });

            localStorage.setItem('currentUser', JSON.stringify({ name, phone, isWholesale: isWholesaleStr, city }));
            alert(`Вітаємо, ${name}! Акаунт успішно створено.`);
            closeAuth();
            location.reload(); 
        }
    } catch (e) { 
        console.warn(e); alert("Сталася помилка при реєстрації."); 
    } finally {
        submitBtn.innerText = "Зареєструватися"; submitBtn.disabled = false;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const phoneInput = document.getElementById('loginPhone');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!phoneInput || !passwordInput) {
        alert("Помилка форми! Не знайдено поле телефону або пароля.");
        return;
    }

    const phone = phoneInput.value.trim(); 
    const password = passwordInput.value.trim();
    
    if (phone === "0000000000" || phone === "0689721598") {
        closeAuth(); document.getElementById('adminAuthModal').style.display = 'flex'; return; 
    }

    try {
        const response = await fetch(`${DATABASE_URL}?phone=${phone}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (data.exists) {
            localStorage.setItem('currentUser', JSON.stringify({ name: data.name, phone: phone, isWholesale: data.isWholesale }));
            alert(`Вітаємо назад, ${data.name}!`);
            closeAuth();
            location.reload();
        } else if (data.error === "wrong_password") {
            alert("❌ Неправильний пароль!");
        } else { 
            alert("❌ Користувача з таким номером не знайдено."); 
        }
    } catch (e) { alert("Помилка підключення до бази."); }
}

async function logout() {
    if(confirm("Ви дійсно хочете вийти?")) {
        localStorage.removeItem('currentUser');
        await supabaseClient.auth.signOut();
        location.reload(); 
    }
}

async function updateProfileUI() {
    const userRaw = localStorage.getItem('currentUser');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const profileLi = document.getElementById('profile-link-li'); 
    if (!profileLi) return;

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
        if (isAdmin) { userName = "Бос (Адмін)"; isWholesale = true; }
        
        let wholesaleButton = "";
        if (isWholesale) wholesaleButton = `<div style="margin-top: 10px;"><button onclick="window.location.href='wholesale-catalog.html'" style="background: #ffd700; color: #000; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">💼 Оптовий кабінет</button></div>`;
        if (isAdmin) wholesaleButton += `<div style="margin-top: 8px;"><button onclick="window.open('https://docs.google.com/spreadsheets/d/1Ff8LoN3nCJGKgPTaTxFLbvX76pUteDnfU0MaRqI59q0/edit?usp=sharing', '_blank')" style="background: #217346; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">📊 База клієнтів</button></div>`;
            
        profileLi.innerHTML = `
            <div style="color: #8b4513; font-weight: bold; margin-bottom: 5px;">Привіт, ${userName}</div>
            <div style="margin: 8px 0;"><a href="my-orders.html" style="text-decoration: none; color: #000; display: flex; align-items: center; gap: 8px; font-size: 0.95rem;">📦 Мої замовлення <span id="sql-orders-count"></span></a></div>
            <a href="#" onclick="logout()" style="font-size: 0.8rem; color: #ff4d4d; text-decoration: underline; cursor: pointer;">Вийти з акаунта</a>
            ${wholesaleButton}
        `;
        if (userPhone && !isAdmin) updateOrdersCountInUI(userPhone);
    } else {
        if (navAuthBtn) navAuthBtn.style.display = 'block';
        profileLi.innerHTML = '<a href="#" onclick="login(); return false;">Мій Профіль / Реєстрація</a>';
    }
}

async function updateOrdersCountInUI(phone) {
    try {
        const { count, error } = await supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('phone', phone);
        if (!error && count > 0) {
            const badge = document.getElementById('sql-orders-count');
            if (badge) badge.innerHTML = `<span style="background: #ffd700; color: #000; border-radius: 50%; padding: 2px 7px; font-size: 0.7rem; font-weight: bold; border: 1px solid #8b4513;">${count}</span>`;
        }
    } catch (e) { console.log("Поки немає замовлень"); }
}

function renderWholesaleBanner() {
    const userRaw = localStorage.getItem('currentUser');
    const container = document.getElementById('wholesale-banner-container');
    if (!container || !userRaw) return; 

    const user = JSON.parse(userRaw);
    if (user.isWholesale === 'yes' || user.phone.replace(/\D/g, '') === "0000000000") {
        container.innerHTML = `<div class="wholesale-banner" onclick="window.location.href='wholesale-catalog.html'"><div class="banner-content"><span class="banner-icon">💼</span><div class="banner-text"><strong>Оптовий кабінет</strong><p>Спеціальні ціни та замовлення партіями</p></div></div><div class="banner-arrow">→</div></div>`;
    } else { container.innerHTML = ''; }
}

// ==========================================
// 2. ДВИГУН КАТЕГОРІЙ (РОЗДРІБ ТА ОПТ)
// ==========================================
let loadedCategories = []; 
let currentEditCategoryId = null;

async function loadCategories() {
    const container = document.getElementById('category-grid-container');
    if (!container) return;
    const isAdmin = await isAdminUser(); 
    try {
        const { data: categories, error } = await supabaseClient.from('categories').select('*').not('id', 'like', 'ws_%'); 
        if (error) throw error;
        loadedCategories = categories || [];
        if (loadedCategories.length === 0) return container.innerHTML = '<p style="text-align:center; width:100%; color: #666; padding: 20px;">Категорій поки немає.</p>';

        container.innerHTML = loadedCategories.map(cat => {
            const adminPanel = isAdmin ? `<div style="display:flex; justify-content:space-between; margin-top:8px;"><button onclick="event.stopPropagation(); editCategory('${cat.id}')" style="background:#f39c12; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">✏️ Редаг.</button><button onclick="event.stopPropagation(); deleteCategory('${cat.id}')" style="background:#e74c3c; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">🗑️ Видал.</button></div>` : '';
            return `<div style="display: flex; flex-direction: column;"><div class="category-card" onclick="window.location.href='category.html?type=${cat.id}'"><img src="${cat.image_url}" alt="${cat.title}" onerror="this.src='default.jpg'"><span>${cat.title}</span></div>${adminPanel}</div>`;
        }).join('');
    } catch (error) { console.error("Помилка:", error); }
}

async function loadWholesaleCategories() {
    const container = document.getElementById('ws-category-container');
    if (!container) return;
    const isAdmin = await isAdminUser(); 
    try {
        const { data: categories, error } = await supabaseClient.from('categories').select('*').like('id', 'ws_%'); 
        if (error) throw error;
        loadedCategories = categories || [];
        if (loadedCategories.length === 0) return container.innerHTML = '<p style="text-align:center; width:100%; color: #666; padding: 20px;">Оптових категорій поки немає. Адмін має їх додати.</p>';

        container.innerHTML = loadedCategories.map(cat => {
            const adminPanel = isAdmin ? `<div style="display:flex; justify-content:space-between; margin-top:8px;"><button onclick="event.stopPropagation(); editCategory('${cat.id}')" style="background:#f39c12; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">✏️ Редаг.</button><button onclick="event.stopPropagation(); deleteCategory('${cat.id}')" style="background:#e74c3c; color:white; border:none; border-radius:5px; padding:5px; cursor:pointer; font-weight:bold; font-size:0.75rem; width:48%;">🗑️ Видал.</button></div>` : '';
            
            const targetLink = cat.id === 'ws_avto' ? 'wholesale.html' : `wholesale-dynamic.html?type=${cat.id}`;

            return `<div style="display: flex; flex-direction: column;"><div class="category-card" onclick="window.location.href='${targetLink}'"><img src="${cat.image_url}" alt="${cat.title}" onerror="this.src='default.jpg'"><span>${cat.title}</span></div>${adminPanel}</div>`;
        }).join('');
    } catch (error) { console.error("Помилка:", error); }
}
async function checkAdminForCategories() {
    const controls = document.getElementById('admin-category-controls');
    if (!controls) return;
    controls.style.display = (await isAdminUser()) ? 'block' : 'none';
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

function closeAddCategoryModal() { document.getElementById('addCategoryModal').style.display = 'none'; }

function editCategory(id) {
    const cat = loadedCategories.find(c => c.id === id);
    if (!cat) return;
    currentEditCategoryId = id; 
    document.getElementById('newCatId').value = cat.id;
    document.getElementById('newCatId').disabled = true; 
    document.getElementById('newCatTitle').value = cat.title;
    document.getElementById('newCatImage').value = cat.image_url;
    document.querySelector('#addCategoryModal h2').innerText = "Редагувати категорію";
    document.getElementById('addCategoryModal').style.display = 'flex';
}

async function deleteCategory(id) {
    if (!confirm("Видалити цю категорію?")) return;
    try {
        const { error } = await supabaseClient.from('categories').delete().eq('id', id);
        if (error) throw error;
        document.getElementById('ws-category-container') ? loadWholesaleCategories() : loadCategories();
    } catch (error) { alert("Помилка: " + error.message); }
}

async function saveNewCategory() {
    const id = document.getElementById('newCatId').value.trim();
    const title = document.getElementById('newCatTitle').value.trim();
    const image_url = document.getElementById('newCatImage').value.trim();
    if (!id || !title || !image_url) return alert("Заповніть всі поля.");

    try {
        if (currentEditCategoryId) {
            const { error } = await supabaseClient.from('categories').update({ title, image_url }).eq('id', currentEditCategoryId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('categories').insert([{ id, title, image_url }]);
            if (error) throw error;
        }
        closeAddCategoryModal();
        document.getElementById('ws-category-container') ? loadWholesaleCategories() : loadCategories();
    } catch (error) { alert("Помилка: " + error.message); }
}

// ==========================================
// 3. ДВИГУН ТОВАРІВ (CRUD)
// ==========================================
let loadedProducts = [];
let currentEditProductId = null; 

async function checkAdminForProducts() {
    const controls = document.getElementById('admin-product-controls');
    if (!controls) return;
    controls.style.display = (await isAdminUser()) ? 'block' : 'none';
}

async function initCategoryPage() {
    const titleElement = document.getElementById('dynamic-category-title');
    if (!titleElement) return;
    const categoryId = new URLSearchParams(window.location.search).get('type');
    if (!categoryId) return titleElement.innerText = "Категорію не знайдено";
    try {
        const { data, error } = await supabaseClient.from('categories').select('title').eq('id', categoryId).single();
        if (error) throw error;
        titleElement.innerText = data.title;
    } catch (e) { titleElement.innerText = "Категорія"; }
    checkAdminForProducts();
    loadProducts(categoryId);
}

async function loadProducts(categoryId) {
    const container = document.getElementById('category-products-container');
    if (!container) return; 
    
    const isAdmin = await isAdminUser();

    try {
        let query = supabaseClient.from('products').select('*').order('id', { ascending: false });
        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        loadedProducts = (data || []).filter(prod => !prod.title.startsWith('[SYSTEM_'));

        if (loadedProducts.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:gray; width:100%; padding: 40px 0;">Товарів поки немає.</p>';
            return;
        }

        container.innerHTML = ''; 
        
        const isWholesale = isWholesaleUser();

       // Рендеримо кожен товар (ВИПРАВЛЕНІ ЛАПКИ ДЛЯ ID)
        loadedProducts.forEach(product => {
            const priceHtml = isWholesale
                ? `<div class="price" style="color:#111;">${Math.round(product.price * 0.6)} грн <span style="text-decoration:line-through; color:#999; font-size:0.8rem;">${product.price} грн</span></div>`
                : `<div class="price" style="color:#111;">${product.price} грн</div>`;

            const adminControls = isAdmin ? `
                <div class="admin-controls" style="display: flex; gap: 5px; margin-top: 10px;">
                    <button onclick="editProduct('${product.id}')" style="flex: 1; background: #ffcc00; border: none; padding: 8px; cursor: pointer; border-radius: 4px; font-weight:bold;">✏️ Редагувати</button>
                    <button onclick="deleteProduct('${product.id}')" style="flex: 1; background: #ff4d4d; color: white; border: none; padding: 8px; cursor: pointer; border-radius: 4px; font-weight:bold;">🗑️ Видалити</button>
                </div>
            ` : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            // ТУТ ТЕЖ ДОДАНО ЛАПКИ '${product.id}'
            card.innerHTML = `
                <img src="${product.main_image}" alt="${product.title}" onclick="goToProduct('${product.id}')" style="cursor:pointer; width:100%; border-radius:8px; object-fit:cover; aspect-ratio:4/3; transition:0.3s;">
               <h3 onclick="goToProduct('${product.id}')" style="cursor:pointer; font-size:1.1rem; margin:10px 0 5px 0;">${product.title}</h3>
<p style="font-size: 0.85rem; color: #666; margin: 0 0 10px 0; line-height: 1.3;">${product.description || ''}</p>
                ${priceHtml}
                ${adminControls}
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Помилка БД:", error);
        container.innerHTML = '<p style="text-align:center; color:red; width:100%; padding: 40px 0;">Сталася помилка при завантаженні товарів.</p>';
    }
}

function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

function openAddProductModal() { 
    currentEditProductId = null;
    ['newProdTitle', 'newProdDesc', 'newProdDetailedDesc', 'newProdPrice', 'newProdImage', 'newProdGallery'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    document.querySelector('#addProductModal h2').innerText = "Новий товар";
    document.getElementById('addProductModal').style.display = 'flex'; 
    document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}

function closeAddProductModal() { document.getElementById('addProductModal').style.display = 'none'; }

function editProduct(id) {
    const prod = loadedProducts.find(p => p.id === id);
    if (!prod) return;
    currentEditProductId = id; 
    document.getElementById('newProdTitle').value = prod.title;
    document.getElementById('newProdDesc').value = prod.description;
    document.getElementById('newProdPrice').value = prod.price;
    document.getElementById('newProdImage').value = prod.main_image;
    
    const features = prod.features || {};
    if(document.getElementById('newProdGallery')) document.getElementById('newProdGallery').value = features.gallery ? features.gallery.join('\n') : "";
    if(document.getElementById('newProdDetailedDesc')) document.getElementById('newProdDetailedDesc').value = features.detailedDescription || "";

    const colors = features.colors || [];
    document.querySelectorAll('.prod-color').forEach(cb => cb.checked = colors.includes(cb.value));
    const hardware = features.hardware || [];
    document.querySelectorAll('.prod-hardware').forEach(cb => cb.checked = hardware.includes(cb.value));

    ['optEngraving', 'optEmbossing', 'optComment', 'optLogo'].forEach(id => {
        const el = document.getElementById(id);
        const key = 'has' + id.replace('opt', '');
        if(el) el.checked = !!features[key];
    });

    document.querySelector('#addProductModal h2').innerText = "Редагувати товар";
    document.getElementById('addProductModal').style.display = 'flex';
}

async function deleteProduct(id) {
    if (!confirm("Видалити цей товар?")) return;
    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        document.getElementById('is-homepage') ? loadProducts('popular') : loadProducts(new URLSearchParams(window.location.search).get('type'));
    } catch (error) { alert("Помилка: " + error.message); }
}

async function saveNewProduct() {
    let categoryId = new URLSearchParams(window.location.search).get('type');
    if (document.getElementById('is-homepage')) categoryId = 'popular';
    if (!categoryId && !currentEditProductId) return alert("Помилка категорії.");

    const title = document.getElementById('newProdTitle').value.trim();
    const description = document.getElementById('newProdDesc').value.trim();
    const detailedDescription = document.getElementById('newProdDetailedDesc')?.value.trim() || ""; 
    const price = parseInt(document.getElementById('newProdPrice').value.trim());
    const main_image = document.getElementById('newProdImage').value.trim();

    if (!title || !price || !main_image) return alert("Заповніть базові дані!");

    const selectedColors = Array.from(document.querySelectorAll('.prod-color:checked')).map(cb => cb.value);
    const selectedHardware = Array.from(document.querySelectorAll('.prod-hardware:checked')).map(cb => cb.value);
    const galleryRaw = document.getElementById('newProdGallery')?.value.trim() || "";
    const galleryUrls = galleryRaw ? galleryRaw.split('\n').map(s => s.trim()).filter(s => s !== '') : [];

    const featuresJSON = {
        gallery: galleryUrls,
        colors: selectedColors,
        hardware: selectedHardware,
        detailedDescription: detailedDescription,
        hasEngraving: document.getElementById('optEngraving')?.checked || false,
        hasEmbossing: document.getElementById('optEmbossing')?.checked || false,
        hasComment: document.getElementById('optComment')?.checked || false,
        hasLogo: document.getElementById('optLogo')?.checked || false
    };

    try {
        if (currentEditProductId) {
            const { error } = await supabaseClient.from('products').update({ title, description, price, main_image, features: featuresJSON }).eq('id', currentEditProductId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('products').insert([{ category_id: categoryId, title, description, price, main_image, features: featuresJSON }]);
            if (error) throw error;
        }
        closeAddProductModal();
        document.getElementById('is-homepage') ? loadProducts('popular') : loadProducts(categoryId);
    } catch (error) { alert("Помилка бази: " + error.message); }
}

// ==========================================
// 4. СТОРІНКА ОДНОГО ТОВАРУ ТА КОНСТРУКТОР
// ==========================================
const dictColors = {
    'cognac': { hex: '#8b4513', name: 'Коньяк' }, 'black': { hex: '#222222', name: 'Чорний' },
    'red': { hex: '#8b0000', name: 'Червоний' }, 'green': { hex: '#234923', name: 'Зелений' },
    'chocolate': { hex: '#3b2818', name: 'Шоколад' }, 'yellow': { hex: '#d8b659', name: 'Жовтий' },
    'lightblue': { hex: '#5b92e5', name: 'Голубий' }, 'cappuccino': { hex: '#9c7e65', name: 'Капучино' },
    'caramel': { hex: '#c07c40', name: 'Карамель' }, 'olive': { hex: '#4b5320', name: 'Олива' },
    'navy': { hex: '#1c2e4a', name: 'Темно-синій' }, 'burgundy': { hex: '#4a0e17', name: 'Бордовий' }
};
const dictHardware = { 'silver': 'Срібло (Нікель)', 'brass': 'Антик (Латунь)', 'gold': 'Золото' };

async function initSingleProductPage() {
    const titleEl = document.getElementById('prod-title');
    if (!titleEl) return;
    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) return titleEl.innerText = "Товар не знайдено";

    try {
        const { data: prod, error } = await supabaseClient.from('products').select('*').eq('id', productId).single();
        if (error) throw error;
        const features = prod.features || {};

    titleEl.innerText = prod.title;
        
        // --- ВЖИВЛЕННЯ КОРОТКОГО ОПИСУ ПІД ЦІНУ ---
        const shortDescElement = document.getElementById('prod-short-desc');
        if (shortDescElement) {
            shortDescElement.innerText = prod.description || "";
        }
        // -----------------------------------------

        document.getElementById('prod-desc').innerText = features.detailedDescription ? features.detailedDescription : prod.description;
        document.getElementById('prod-price').innerText = `${prod.price} грн`;
        document.getElementById('prod-img').src = prod.main_image;

       const thumbnailsContainer = document.getElementById('prod-thumbnails');
        if (thumbnailsContainer) {
            if (features.gallery && features.gallery.length > 0) {
                const allImages = [prod.main_image, ...features.gallery];
                
                // СКОПІЮЙ ЦЕЙ РЯДОК ДУЖЕ ОБЕРЕЖНО, ТУТ ВАЖЛИВІ ЗВОРОТНІ АПОСТРОФИ ( ` )
                thumbnailsContainer.innerHTML = allImages.map(imgUrl => `<img src="${imgUrl}" onclick="document.getElementById('prod-img').src='${imgUrl}'" style="flex-shrink: 0; width: 65px; height: 65px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e0e0e0; transition: 0.2s;" onmouseover="this.style.borderColor='#8b4513'; this.style.transform='scale(1.05)';" onmouseout="this.style.borderColor='#e0e0e0'; this.style.transform='scale(1)';">`).join('');
                
            } else { 
                thumbnailsContainer.innerHTML = ''; 
            }
        }

        if (features.colors && features.colors.length > 0) {
            document.getElementById('section-colors').style.display = 'block';
            document.getElementById('render-colors').innerHTML = features.colors.map((colorKey, index) => {
                const c = dictColors[colorKey];
                if(!c) return '';
                const isActive = index === 0 ? 'border: 3px solid #000; transform: scale(1.1);' : 'border: 1px solid #ccc;';
               if(index === 0) {
            document.getElementById('selectedColorValue').value = c.name;
            const displaySpan = document.getElementById('color-display-text');
            if(displaySpan) displaySpan.innerText = c.name;
        }
                return `<div onclick="selectDynamicColor(this, '${c.name}')" class="dyn-color-circle" style="width: 30px; height: 30px; border-radius: 50%; background-color: ${c.hex}; cursor: pointer; transition: 0.2s; ${isActive}" title="${c.name}"></div>`;
            }).join('');
        }

        if (features.hardware && features.hardware.length > 0) {
            document.getElementById('section-hardware').style.display = 'block';
            document.getElementById('render-hardware').innerHTML = features.hardware.map((hwKey, index) => {
                const name = dictHardware[hwKey];
                if(!name) return '';
                const isChecked = index === 0 ? 'checked' : '';
                if(index === 0) document.getElementById('selectedHardwareValue').value = name;
                return `<label style="cursor: pointer; display: flex; align-items: center; gap: 5px;"><input type="radio" name="hw_radio" value="${name}" ${isChecked} onchange="document.getElementById('selectedHardwareValue').value = this.value"> ${name}</label>`;
            }).join('');
        }

        let textsHtml = '';
        if (features.hasEngraving) textsHtml += `<strong style="display:block; margin-bottom: 5px;">Текст гравіювання:</strong><input type="text" id="input-engraving" class="levkovo-input" placeholder="Напишіть текст..." style="margin-bottom: 15px; width: 100%; box-sizing: border-box;">`;
        if (features.hasEmbossing) textsHtml += `<strong style="display:block; margin-bottom: 5px;">Текст тиснення:</strong><input type="text" id="input-embossing" class="levkovo-input" placeholder="Ініціали або коротке слово..." style="margin-bottom: 15px; width: 100%; box-sizing: border-box;">`;
        if (features.hasComment) textsHtml += `<strong style="display:block; margin-bottom: 5px;">Коментар до товару:</strong><textarea id="input-comment" class="levkovo-input" placeholder="Ваші побажання..." rows="2" style="margin-bottom: 15px; width: 100%; box-sizing: border-box;"></textarea>`;
        document.getElementById('section-texts').innerHTML = textsHtml;

        if (features.hasLogo) document.getElementById('section-photo').style.display = 'block';

    } catch (e) { titleEl.innerText = "Помилка завантаження"; }
}

// ==========================================
// ВИБІР КОЛЬОРУ (ОБ'ЄДНАНА ФУНКЦІЯ: ТЕКСТ + ФОТО + ВИДІЛЕННЯ)
// ==========================================
function selectDynamicColor(element, colorName) {
    // 1. Оновлюємо візуальне виділення кружечків
    document.querySelectorAll('.dyn-color-circle').forEach(el => { 
        el.style.border = '1px solid #ccc'; 
        el.style.transform = 'scale(1)'; 
    });
    element.style.border = '3px solid #000'; // або '#ffd700', як було в твоїй версії
    element.style.transform = 'scale(1.15)';
    
    // 2. Записуємо значення для кошика
    document.getElementById('selectedColorValue').value = colorName;

    // 3. ЗМІНЮЄМО ТЕКСТ БІЛЯ ЗАГОЛОВКА
    const displaySpan = document.getElementById('color-display-text');
    if(displaySpan) {
        displaySpan.innerText = colorName;
    }

    // 4. МІНЯЄМО ВЕЛИКУ ФОТОГРАФІЮ (Якщо вона є в галереї)
    let engColorKey = null;
    for (const [key, value] of Object.entries(dictColors)) {
        if (value.name === colorName) {
            engColorKey = key;
            break;
        }
    }
    
    if (engColorKey) {
        // Ми шукаємо фотку не просто по назві "cognac.jpg", а по ключу, щоб працювало з будь-яким форматом (jpg/png)
        const thumbnailsContainer = document.getElementById('prod-thumbnails');
        if (thumbnailsContainer) {
            const thumbnails = thumbnailsContainer.getElementsByTagName('img');
            for (let i = 0; i < thumbnails.length; i++) {
                // Якщо посилання на фото містить ключ кольору (напр. .../cognac.jpg або .../cognac_1.png)
                if (thumbnails[i].src.toLowerCase().includes(engColorKey.toLowerCase())) {
                    document.getElementById('prod-img').src = thumbnails[i].src;
                    break;
                }
            }
        }
    }
}

async function addDynamicProductToCart() {
    const titleEl = document.getElementById('prod-title');
    if (!titleEl || titleEl.innerText === "Завантаження...") return;
    const baseName = titleEl.innerText;
    const basePrice = parseInt(document.getElementById('prod-price').innerText.replace(/\D/g, ''));
    const imgSrc = document.getElementById('prod-img').src;

    let options = [];
    const colorVal = document.getElementById('selectedColorValue')?.value;
    if (colorVal && document.getElementById('section-colors').style.display !== 'none') options.push(`Колір: ${colorVal}`);
    const hwVal = document.getElementById('selectedHardwareValue')?.value;
    if (hwVal && document.getElementById('section-hardware').style.display !== 'none') options.push(`Фурнітура: ${hwVal}`);
    const engVal = document.getElementById('input-engraving')?.value.trim();
    if (engVal) options.push(`Гравіювання: "${engVal}"`);
    const embVal = document.getElementById('input-embossing')?.value.trim();
    if (embVal) options.push(`Тиснення: "${embVal}"`);
    const comVal = document.getElementById('input-comment')?.value.trim();
    if (comVal) options.push(`Коментар: "${comVal}"`);

    const finalName = options.length > 0 ? `${baseName} [${options.join(' | ')}]` : baseName;
    const fileInput = document.getElementById('logo-photo');
    let hasFile = false;
    
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        hasFile = true;
        try {
            // Стискаємо фото перед збереженням
            const compressedBase64 = await compressImage(file);
            localStorage.setItem('pendingFileBase64', compressedBase64);
        } catch (e) {
            alert("Помилка обробки фото. Можливо, файл пошкоджено.");
            hasFile = false; 
        }
    }

    try {
        const existing = cart.find(item => item.name === finalName);
        if (existing) existing.qty++;
        else cart.push({ name: finalName, price: basePrice, img: imgSrc, qty: 1, selected: true, hasFile: hasFile });
        
        saveCart(); 
        alert('Товар додано до кошика! 🐂'); 
        openCart(); 
        renderCart();
    } catch (error) { alert("Сталася помилка при додаванні."); }
}

// ==========================================
// 5. КОШИК ТА ОФОРМЛЕННЯ (ІНТЕГРОВАНО)
// ==========================================
const isWholesaleCabinet = window.location.pathname.includes('wholesale');
const CART_STORAGE_KEY = isWholesaleCabinet ? 'levkovo_ws_cart' : 'levkovo_cart';

let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

function saveCart() { 
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); 
    updateCartCount(); 
    updateWholesaleCartCount();
}

function updateWholesaleCartCount() {
    const wsCountElement = document.getElementById('wholesale-cart-count');
    if (wsCountElement) {
        wsCountElement.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
    }
}

function openWholesaleCart() {
    openCart(); 
}

function getPrice(basePrice, quantity) { return basePrice; }

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const currentPrice = getPrice(item.price, item.qty);
        if (item.selected) total += currentPrice * item.qty;
        
        const step = item.step || 1;

        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #eee; padding: 10px 0;">
                <input type="checkbox" ${item.selected ? 'checked' : ''} onclick="toggleSelect(${index})">
                <img src="${item.img}" class="cart-img" style="width: 50px; height: 50px; object-fit: cover;">
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${item.name}</div>
                    <div style="font-size: 0.85rem;"><span style="color: #8b4513; font-weight: bold;">${currentPrice} грн/шт</span></div>
                    <div style="display:flex; gap:5px; align-items:center; margin-top:5px;">
                        <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                        <input type="number" value="${item.qty}" min="${step}" step="${step}" style="width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 4px;" onchange="updateQtyInput(${index}, this.value)">
                        <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="runaway-delete" onclick="handleDelete(${index})" style="cursor:pointer; padding: 0 10px; font-weight: bold; color: red;">✕</div>
            </div>
        `;
    });
    const totalElement = document.getElementById('cart-total');
    if (totalElement) totalElement.innerText = `Разом: ${total} грн`;
    if (document.getElementById('checkout-total')) renderCheckoutSummary();
}

function openCart() { document.getElementById('cartModal').style.display = 'flex'; renderCart(); }
function closeCart() { document.getElementById('cartModal').style.display = 'none'; }
function updateCartCount() { const countElement = document.getElementById('cart-count'); if (countElement) countElement.innerText = cart.reduce((sum, item) => sum + item.qty, 0); }
function handleDelete(index) { cart.splice(index, 1); saveCart(); renderCart(); }
function changeQty(index, delta) { 
    const step = cart[index].step || 1;
    const newQty = cart[index].qty + (delta * step);
    if (newQty > 0) { 
        cart[index].qty = newQty; 
        saveCart(); 
        renderCart(); 
    } 
}
function toggleSelect(index) { cart[index].selected = !cart[index].selected; saveCart(); renderCart(); }

function openCheckout() { closeCart(); document.getElementById('checkoutModal').style.display = 'flex'; renderCheckoutSummary(); autofillCheckoutData(); }
function closeCheckout() { document.getElementById('checkoutModal').style.display = 'none'; }

function renderCheckoutSummary() {
    const container = document.getElementById('checkout-items');
    let total = 0;
    container.innerHTML = '';
    cart.forEach(item => {
        if (item.selected) {
            const actualPrice = getPrice(item.price, item.qty);
            total += actualPrice * item.qty;
            container.innerHTML += `<div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom: 5px;"><span>${item.name} x${item.qty}</span><span>${actualPrice * item.qty} грн</span></div>`;
        }
    });

    let finalTotal = total;
    
    // Якщо є промокод - рахуємо знижку
    if (activePromo) {
        const discountAmount = Math.round((total * activePromo.discount) / 100);
        finalTotal = total - discountAmount;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-top: 10px; color: #28a745; font-weight: bold; padding-top: 10px; border-top: 1px dashed #ccc;">
                <span>Знижка "${activePromo.code}" (-${activePromo.discount}%):</span>
                <span>-${discountAmount} грн</span>
            </div>
        `;
    }

    document.getElementById('checkout-total').innerHTML = `До сплати: <span style="font-size: 1.2rem; color: #8b4513;">${finalTotal} грн</span>`;
    window.checkoutFinalTotal = finalTotal; // Зберігаємо глобально для відправки
}

async function autoRegisterGuest(name, phone) {
    const userRaw = localStorage.getItem('currentUser');
    if (userRaw) return; 
    try {
        const checkResponse = await fetch(`${DATABASE_URL}?phone=${phone}`);
        const checkData = await checkResponse.json();
        if (checkData.exists) {
            localStorage.setItem('currentUser', JSON.stringify({ name: checkData.name, phone: phone, isWholesale: checkData.isWholesale }));
            return;
        }
        const newUser = { name: name, phone: "'" + phone, isWholesale: "no", city: "Авто-реєстрація" };
        await fetch(DATABASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(newUser) });
        await fetch(DATABASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "sendTelegram", message: `🤖 **АВТО-РЕЄСТРАЦІЯ**\n📝 **Ім'я:** ${name}\n📞 **Тел:** ${phone}` }) });
        localStorage.setItem('currentUser', JSON.stringify({ name, phone, isWholesale: "no" }));
    } catch (e) { console.error("Помилка автореєстрації:", e); }
}

async function generateReceipt(event) {
    event.preventDefault();
// Блокування від подвійних кліків
    if (window.isOrderSubmitting) return; 
    window.isOrderSubmitting = true;
    
    // Візуальна зміна кнопки (щоб клієнт бачив, що процес пішов)
    const btn = event.target.tagName === 'BUTTON' ? event.target : event.target.querySelector('button');
    let originalBtnText = "Підтвердити";
    if (btn) {
        originalBtnText = btn.innerText;
        btn.innerText = "⏳ Обробка...";
        btn.style.opacity = "0.7";
    }
    const itemsForDB = cart.filter(i => i.selected);
    if (itemsForDB.length === 0) {
        alert("КРИТИЧНА ПОМИЛКА: Кошик порожній або товари не вибрані!");
        return;
    }

    const userRaw = localStorage.getItem('currentUser');
    const user = userRaw ? JSON.parse(userRaw) : null;

    const firstName = document.getElementById('orderFirstName')?.value.trim() || "";
    const middleName = document.getElementById('orderMiddleName')?.value.trim() || "";
    const lastName = document.getElementById('orderLastName')?.value.trim() || "";
    const clientName = `${lastName} ${firstName} ${middleName}`.trim();
    
    let userPhone = "";
    if (user) { 
        userPhone = user.phone.replace(/\D/g, ''); 
    } else {
        const phoneInput = document.getElementById('checkoutPhone');
        if (!validatePhone(phoneInput)) return alert("Будь ласка, введіть коректний номер телефону (10 цифр)");
        userPhone = phoneInput.value.replace(/\D/g, '');
    }
    
    await autoRegisterGuest(clientName, userPhone);

    const payMethod = document.getElementById('paymentMethod')?.value === 'card' ? "Картка" : "Післяплата";
    const callback = document.getElementById('callbackMethod')?.value === 'yes' ? "Дзвонити" : "Не дзвонити";
    const shipMethod = document.getElementById('shippingMethod')?.value;
    
    let addressInfo = "";
    if (shipMethod === 'nova') {
        const npCity = document.getElementById('npCity')?.value.trim();
        const npWarehouse = document.getElementById('npWarehouse')?.value.trim();
        if (!npCity || !npWarehouse) return alert("Оберіть місто та відділення Нової Пошти зі списку!");
        addressInfo = `Нова Пошта: м. ${npCity}, ${npWarehouse}`;
    } else if (shipMethod === 'ukr') {
        const ukrCity = document.getElementById('orderUkrCity')?.value.trim();
        const ukrIndex = document.getElementById('orderUkrIndex')?.value.trim();
        if (!ukrCity || !ukrIndex) return alert("Введіть місто та поштовий індекс Укрпошти!");
        addressInfo = `Укрпошта: м. ${ukrCity}, інд. ${ukrIndex}`;
    } else {
        return alert("Оберіть спосіб доставки!");
    }

    const baseComment = document.getElementById('orderComment')?.value.trim() || "немає";
const comment = "Промокод: " + (activePromo ? activePromo.code + " (-" + activePromo.discount + "%)" : "немає") + " | Клієнт: " + baseComment;

    let totalSum = 0;
    const finalItems = itemsForDB.map(i => {
        totalSum += (i.price * i.qty);
        return { name: i.name, qty: i.qty, price: i.price };
    });

    const message = `📦 **НОВЕ ЗАМОВЛЕННЯ (LEVKOVO)**\n\n👤 **Клієнт:** ${clientName}\n📞 **Тел:** +38 ${userPhone}\n🚚 **Доставка:** ${addressInfo}\n💳 **Оплата:** ${payMethod}\n📞 **Дзвінок:** ${callback}\n💬 **Коментар:** ${comment}\n\n🛒 **Товари:**\n${finalItems.map(i => `• ${i.name} [x${i.qty}]`).join('\n')}\n\n💰 **РАЗОМ: ${window.checkoutFinalTotal} грн**`;

    try {
        await supabaseClient.from('orders').insert([{ 
            client_name: clientName, 
            phone: userPhone, 
            address: addressInfo, 
            items: finalItems, 
           total_price: window.checkoutFinalTotal,
            status: 'В обробці', 
            comment: `Оплата: ${payMethod}, Дзвінок: ${callback}, Коментар: ${comment}` 
        }]);
        
        await fetch(DATABASE_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: "sendTelegram", message: message }) 
        });

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
        // Зберігаємо дані глобально, щоб чек міг їх завантажити
        window.currentReceiptData = { total: window.checkoutFinalTotal, items: finalItems, promo: activePromo }; 
        
        let promoText = activePromo ? `<br><span style="color:#28a745; font-size:0.85rem;">Знижка: -${activePromo.discount}%</span>` : '';
        renderReceiptOverlay(`${window.checkoutFinalTotal} грн ${promoText}`, finalItems.map(i => `• ${i.name} x${i.qty}`).join('<br>'));
   } catch (e) { 
        alert("Сталася помилка при відправці замовлення. Спробуйте ще раз."); 
        console.error("Checkout Error:", e);
    } finally {
        // Знімаємо блокування в будь-якому випадку (успіх або помилка)
        window.isOrderSubmitting = false;
        if (btn) {
            btn.innerText = originalBtnText;
            btn.style.opacity = "1";
        }
    }
}

function autofillCheckoutData() {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) return;
    const user = JSON.parse(userRaw);
    const nameParts = user.name ? user.name.trim().split(/\s+/) : [];
    if (document.getElementById('orderLastName')) document.getElementById('orderLastName').value = nameParts[0] || "";
    if (document.getElementById('orderFirstName')) document.getElementById('orderFirstName').value = nameParts[1] || "";
    if (document.getElementById('orderMiddleName')) document.getElementById('orderMiddleName').value = nameParts[2] || "";

    const elPhone = document.getElementById('checkoutPhone');
    if (elPhone && user.phone) {
        let cleanPhone = user.phone.replace('+38', '').replace(/\D/g, '');
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        elPhone.value = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;
        if (typeof validatePhone === "function") validatePhone(elPhone);
    }
    const elUkrCity = document.getElementById('orderUkrCity');
    if (elUkrCity && user.city && user.city !== "Не вказано") elUkrCity.value = user.city;
}

// ==========================================
// 6. ІНТЕРФЕЙС (ДОПОМІЖНІ ФУНКЦІЇ ТА БРОНЯ)
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // БРОНЯ ВІД КРАШУ: Якщо сайдбару немає в HTML - система скаже про це, а не вмре
    if (!sidebar) {
        alert("КРИТИЧНА ПОМИЛКА: У цьому HTML-файлі відсутній код сайдбару (<div id='sidebar'>). Скопіюй його сюди!");
        return;
    }
    
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'body-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');

    if(sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function login() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
    const modals = document.querySelectorAll('#authModal');
    if (modals.length > 0) {
        modals.forEach(m => { m.style.display = 'flex'; m.style.zIndex = '1000000'; m.style.background = 'rgba(255, 0, 0, 0.9)'; });
        showAuthChoice();
    } else { alert("ЖОДНОЇ МОДАЛКИ НЕ ЗНАЙДЕНО!"); }
}

function closeAuth() { document.getElementById('authModal').style.display = 'none'; }
function showAuthChoice() {
    if (document.getElementById('authChoice')) document.getElementById('authChoice').style.display = 'block';
    if (document.getElementById('registerForm')) document.getElementById('registerForm').style.display = 'none';
    if (document.getElementById('loginForm')) document.getElementById('loginForm').style.display = 'none';
}
function showRegister() { document.getElementById('authChoice').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; }
function showLogin() { document.getElementById('authChoice').style.display = 'none'; document.getElementById('loginForm').style.display = 'block'; }

function toggleWholesale(show) {
    const fields = document.getElementById('wholesaleFields');
    if (fields) { fields.style.display = show ? 'block' : 'none'; if (document.getElementById('regCity')) document.getElementById('regCity').required = show; }
}

function handleWsShippingChange() {
    const method = document.getElementById('wsShippingMethod').value;
    if (document.getElementById('wsNpOptions')) document.getElementById('wsNpOptions').style.display = method === 'nova' ? 'block' : 'none';
    if (document.getElementById('wsUkrOptions')) document.getElementById('wsUkrOptions').style.display = method === 'ukr' ? 'block' : 'none';
}

function handleNPTypeChange() {
    const method = document.getElementById('shippingMethod').value;
    if (document.getElementById('npOptions')) document.getElementById('npOptions').style.display = (method === 'nova') ? 'block' : 'none';
    if (document.getElementById('ukrOptions')) document.getElementById('ukrOptions').style.display = (method === 'ukr') ? 'block' : 'none';
}

function updateQtyInput(index, value) { 
    const step = cart[index].step || 1;
    let newQty = parseInt(value); 
    if (newQty > 0) {
        if (step > 1) newQty = Math.round(newQty / step) * step;
        if (newQty === 0) newQty = step;
        cart[index].qty = newQty; 
    } else {
        cart[index].qty = step;
    }
    saveCart();
    renderCart(); 
}

function openContacts() { const sidebar = document.getElementById('sidebar'); if (sidebar && sidebar.classList.contains('active')) toggleSidebar(); document.getElementById('contactsModal').style.display = 'flex'; }
function closeContacts() { document.getElementById('contactsModal').style.display = 'none'; }
window.onclick = function(event) { if (event.target == document.getElementById('contactsModal')) closeContacts(); }

function validatePhone(input) {
    let val = input.value.replace(/\D/g, ''); input.value = val;
    const container = input.parentElement;
    if (val.length === 10 && val.startsWith('0')) { container.style.borderColor = "#32CD32"; return true; } 
    else { container.style.borderColor = "#ff4d4d"; return false; }
}

// ==========================================
// ФІНАЛЬНИЙ ЕКРАН ТА ГЕНЕРАЦІЯ ЧЕКА
// ==========================================
function renderReceiptOverlay(totalHtml, itemsHtml) {
    const overlay = document.getElementById('receiptOverlay');
    const printBox = document.getElementById('receiptPrint');
    if (overlay && printBox) {
        printBox.innerHTML = `
            <h2 style="color: #8b4513; margin-top:0;">Дякуємо за замовлення!</h2>
            <p style="margin: 15px 0; color: #555;">Ми отримали ваш запит і скоро зв'яжемося.</p>
            <div style="text-align: left; background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px dashed #ccc;">
                <strong style="color: #111;">Ваші товари:</strong><br>
                <div style="color: #444; margin-top: 5px; line-height: 1.5;">${itemsHtml}</div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                <div style="font-weight: bold; font-size: 1.2rem; text-align: right; color: #111;">${totalHtml}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 25px;">
                <button style="background: #111; color: #ffd700; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onclick="downloadReceiptText()">📥 Завантажити чек</button>
                <button style="background: #eee; color: #333; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;" onclick="location.reload()">На головну</button>
            </div>
        `;
        overlay.style.display = 'flex';
    }
}

// Функція-генератор файлу чека
function downloadReceiptText() {
    if (!window.currentReceiptData) return;
    
    let text = "=== ІНТЕРНЕТ-МАЙСТЕРНЯ LEVKOVO ===\n";
    text += "ЧЕК ЗАМОВЛЕННЯ\n";
    text += "Дата: " + new Date().toLocaleString('uk-UA') + "\n\n";
    text += "ТОВАРИ:\n";
    window.currentReceiptData.items.forEach(i => { 
        text += `- ${i.name} (x${i.qty})\n`; 
    });
    text += "\n--------------------------------\n";
    
    if (window.currentReceiptData.promo) { 
        text += `Промокод: ${window.currentReceiptData.promo.code} (-${window.currentReceiptData.promo.discount}%)\n`; 
    }
    text += `ДО СПЛАТИ: ${window.currentReceiptData.total} грн\n`;
    text += "================================\n";
    text += "Дякуємо, що обираєте ручну роботу!";

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Check_LEVKOVO_${new Date().getTime()}.txt`;
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}

function handleFileChange(input) { document.getElementById('file-filename').innerText = input.files.length > 0 ? input.files[0].name : "Файл не вибрано"; }

// Мобільне меню товарів (Гармошка)
function toggleSubmenu() {
    const submenu = document.getElementById('mobile-categories-list');
    const arrow = document.getElementById('submenu-arrow');
    if (submenu.classList.contains('open')) {
        submenu.classList.remove('open');
        arrow.style.transform = 'rotate(0deg)';
    } else {
        submenu.classList.add('open');
        arrow.style.transform = 'rotate(180deg)';
        if (submenu.innerHTML.trim() === '') loadSidebarCategories();
    }
}

// Розумне завантаження категорій (ТІЛЬКИ РОЗДРІБ, як ти і просив)
async function loadSidebarCategories() {
    const container = document.getElementById('mobile-categories-list');
    if(!container) return;
    
    try {
        // Ми беремо з бази ВСІ категорії, відсортовані за алфавітом
        const { data, error } = await supabaseClient.from('categories').select('*').order('title');
        if (error) throw error;
        
        // ЖОРСТКИЙ ФІЛЬТР: Ми ігноруємо, хто користувач. 
        // Ми просто відкидаємо ВСЕ, що починається на 'ws_' або має '[WS]'
        const filteredCategories = (data || []).filter(cat => {
            const titleStr = cat.title ? cat.title.toUpperCase() : '';
            const idStr = cat.id ? String(cat.id).toLowerCase() : '';
            return !idStr.startsWith('ws_') && !titleStr.includes('[WS]');
        });
        
        // Вставляємо li тільки всередину нашої гармошки
        container.innerHTML = filteredCategories.map(cat => `
            <li><a href="category.html?type=${cat.id}" onclick="toggleSidebar();" style="font-size: 0.95rem; border: none; padding: 8px 0; color: #666;">• ${cat.title}</a></li>
        `).join('');
        
    } catch (err) {
        console.error("Помилка БД сайдбара:", err);
        container.innerHTML = '<li><span style="color:red;">Помилка завантаження</span></li>';
    }
}

// ==========================================
// 7. НОВА ПОШТА (JQUERY)
// ==========================================
if (typeof $ !== 'undefined') {
    $(document).ready(function() {
        $('#npCity').on('input', async function() {
            let val = $(this).val(); let listContainer = $(this).next('.autocomplete-list');
            if (val.length < 2) return listContainer.hide();
            try {
                const response = await fetch(DATABASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "novaPoshta", calledMethod: "getCities", methodProperties: { FindByString: val } }) });
                const res = await response.json();
                if(res.data && res.data.length > 0) {
                    let html = ''; res.data.forEach(city => { html += `<div class="list-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="selectCity('${city.Description}', '${city.Ref}')">${city.Description}</div>`; });
                    listContainer.html(html).show();
                } else { listContainer.hide(); }
            } catch (e) {}
        });
    });
}

function selectCity(name, ref) { $('#npCity').val(name); $('.autocomplete-list').hide(); $('#npWarehouse').prop('disabled', false).val('').focus(); setupWarehouseSearch(ref); }

function setupWarehouseSearch(cityRef) {
    $('#npWarehouse').off('input').on('input', async function() {
        let val = $(this).val(); let listContainer = $(this).next('.autocomplete-list');
        try {
            const response = await fetch(DATABASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "novaPoshta", calledMethod: "getWarehouses", methodProperties: { CityRef: cityRef, FindByString: val } }) });
            const res = await response.json();
            if(res.data) {
                let html = ''; res.data.forEach(w => { html += `<div class="list-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="selectWarehouse('${w.Description}')">${w.Description}</div>`; });
                listContainer.html(html).show();
            }
        } catch (e) {}
    });
}
function selectWarehouse(name) { $('#npWarehouse').val(name); $('.autocomplete-list').hide(); }

// ==========================================
// 8. СИСТЕМА ВІДГУКІВ (КАРУСЕЛЬ)
// ==========================================
let reviewImages = [];
let currentReviewIndex = 0;
let reviewsDbId = null;

async function loadReviewsFromDB() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').eq('title', '[SYSTEM_REVIEWS]').maybeSingle();
        if (data) { reviewsDbId = data.id; reviewImages = data.features?.gallery || []; }
    } catch(e) {}
}

async function openReviewsModal() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
    
    await loadReviewsFromDB();
    const isAdmin = await isAdminUser();
    
    document.getElementById('admin-add-review-btn').style.display = isAdmin ? 'block' : 'none';
    const display = document.getElementById('review-image-display');
    const noMsg = document.getElementById('no-reviews-msg');
    const delBtn = document.getElementById('admin-delete-review-btn');
    
    if (reviewImages.length > 0) {
        currentReviewIndex = 0;
        display.src = reviewImages[currentReviewIndex];
        display.style.display = 'block';
        noMsg.style.display = 'none';
        delBtn.style.display = isAdmin ? 'block' : 'none';
    } else {
        display.style.display = 'none';
        noMsg.style.display = 'block';
        delBtn.style.display = 'none';
    }
    document.getElementById('reviewsModal').style.display = 'flex';
}

function closeReviewsModal() { document.getElementById('reviewsModal').style.display = 'none'; }
function changeReview(step) {
    if (reviewImages.length === 0) return;
    currentReviewIndex += step;
    if (currentReviewIndex < 0) currentReviewIndex = reviewImages.length - 1;
    if (currentReviewIndex >= reviewImages.length) currentReviewIndex = 0;
    document.getElementById('review-image-display').src = reviewImages[currentReviewIndex];
}

async function syncReviewsToDB() {
    const payload = { category_id: 'popular', title: '[SYSTEM_REVIEWS]', main_image: 'system', price: 0, features: { gallery: reviewImages } };
    try {
        if (reviewsDbId) await supabaseClient.from('products').update(payload).eq('id', reviewsDbId);
        else {
            const { data } = await supabaseClient.from('products').insert([payload]).select();
            if(data && data.length > 0) reviewsDbId = data[0].id;
        }
    } catch(e) { alert("Помилка збереження бази відгуків!"); }
}

async function addReviewImage() {
    const url = prompt("Вставте пряме посилання на скріншот відгуку (jpg/png):");
    if (!url || !url.trim()) return;
    reviewImages.push(url.trim());
    await syncReviewsToDB();
    openReviewsModal();
}

async function deleteCurrentReview() {
    if (!confirm("Видалити цей скріншот відгуку?")) return;
    reviewImages.splice(currentReviewIndex, 1);
    await syncReviewsToDB();
    openReviewsModal();
}
// ==========================================
// УНІВЕРСАЛЬНЕ ВІДКРИТТЯ ЮРИДИЧНИХ ВІКОН
// ==========================================
function openLegalModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    } else {
        alert("КРИТИЧНА ПОМИЛКА: Вікно '" + modalId + "' не знайдено у цьому файлі HTML. Встав його код!");
    }
}
// ==========================================
// ЖОРСТКЕ СТИСНЕННЯ ЗОБРАЖЕНЬ (Захист від перевантаження)
// ==========================================
function compressImage(file, maxWidth = 800) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let ratio = maxWidth / img.width;
                if(ratio > 1) ratio = 1; 
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7); 
                resolve(base64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
// ==========================================
// 9. ЄДИНИЙ МАЙСТЕР-ЗАПУСК УСІХ СИСТЕМ
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    setTimeout(() => {
        updateProfileUI();    
        if (typeof updateCartCount === "function") updateCartCount();   
        if (typeof updateWholesaleCartCount === "function") updateWholesaleCartCount(); 
        
        if (window.location.hash === '#cart') {
            history.replaceState(null, null, window.location.pathname);
            if (isWholesaleCabinet) {
                if (typeof openWholesaleCart === "function") openWholesaleCart();
            } else {
                if (typeof openCart === "function") openCart(); 
            }
        }
    }, 100);

    if (document.getElementById('ws-category-container')) {
        loadWholesaleCategories();
        checkAdminForCategories();
    } else if (document.getElementById('category-grid-container')) {
        loadCategories();
        checkAdminForCategories();
    }

    if (document.getElementById('is-homepage')) {
        loadProducts('popular');
        checkAdminForProducts();
    }

    if (document.getElementById('dynamic-category-title')) {
        initCategoryPage();
    }

    if (document.getElementById('prod-title')) {
        initSingleProductPage(); 
    }

    setTimeout(renderWholesaleBanner, 150);
});
// ==========================================
// СИСТЕМА ПРОМОКОДІВ (LEBIGA ENGINE)
// ==========================================
let activePromo = null; // Зберігає застосований промокод
window.checkoutFinalTotal = 0; // Глобальна фінальна ціна

// 1. АДМІН: Додавання промокоду
async function adminAddPromo() {
    const code = document.getElementById('newPromoCode').value.trim().toUpperCase();
    const discount = parseInt(document.getElementById('newPromoDiscount').value);
    const hours = parseInt(document.getElementById('newPromoHours').value);

    if (!code || isNaN(discount) || isNaN(hours)) return alert("Заповніть всі поля коректно!");
    if (discount <= 0 || discount > 99) return alert("Знижка має бути від 1% до 99%");

    const expiresAt = new Date(new Date().getTime() + hours * 60 * 60 * 1000).toISOString();

    try {
        const { error } = await supabaseClient.from('promocodes').insert([{ code, discount, expires_at: expiresAt }]);
        if (error) throw error;
        alert(`Промокод ${code} на -${discount}% створено! Діє ${hours} год.`);
        document.getElementById('newPromoCode').value = '';
        document.getElementById('newPromoDiscount').value = '';
        document.getElementById('newPromoHours').value = '';
        adminLoadPromos();
    } catch (e) { alert("Помилка (можливо такий код вже є): " + e.message); }
}

// 2. АДМІН: Завантаження і видалення
async function adminLoadPromos() {
    const container = document.getElementById('promo-list-container');
    container.style.display = 'block';
    container.innerHTML = 'Завантаження...';
    try {
        const { data, error } = await supabaseClient.from('promocodes').select('*').order('expires_at', { ascending: false });
        if (error) throw error;
        if (data.length === 0) return container.innerHTML = 'Промокодів немає.';
        
        container.innerHTML = data.map(p => {
            const isExpired = new Date(p.expires_at) < new Date();
            const status = isExpired ? '<span style="color:red;">МЕРТВИЙ</span>' : '<span style="color:green;">АКТИВНИЙ</span>';
            return `<div style="background:#fff; padding:10px; border:1px solid #ddd; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <div><b>${p.code}</b> (-${p.discount}%) | До: ${new Date(p.expires_at).toLocaleString('uk-UA')} | ${status}</div>
                <button onclick="adminDeletePromo(${p.id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Видалити</button>
            </div>`;
        }).join('');
    } catch (e) { container.innerHTML = 'Помилка завантаження.'; }
}

async function adminDeletePromo(id) {
    if(!confirm("Точно видалити промокод?")) return;
    await supabaseClient.from('promocodes').delete().eq('id', id);
    adminLoadPromos();
}

// Перевірка адміна при завантаженні (для відображення блоку)
window.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        const panel = document.getElementById('admin-promo-controls');
        if (panel && await isAdminUser()) panel.style.display = 'block';
    }, 500);
});

// 3. КЛІЄНТ: Перевірка промокоду
async function checkPromoCode() {
    const input = document.getElementById('promoCodeInput');
    const msg = document.getElementById('promo-status-msg');
    const code = input.value.trim().toUpperCase();

    if(!code) { 
        activePromo = null; 
        input.style.borderColor = '#ccc'; input.style.color = '#111';
        msg.innerText = '';
        renderCheckoutSummary(); 
        return; 
    }

    input.disabled = true;
    msg.innerText = 'Перевірка...'; msg.style.color = '#888';

    try {
        const { data, error } = await supabaseClient.from('promocodes').select('*').eq('code', code).single();
        if (error || !data) throw new Error("Код не знайдено");
        
        if (new Date(data.expires_at) < new Date()) {
            throw new Error("Час дії промокоду вичерпано!");
        }

        // УСПІХ
        activePromo = { code: data.code, discount: data.discount };
        input.style.borderColor = '#28a745';
        input.style.color = '#28a745';
        msg.innerText = `✅ Промокод знайдено! Знижка -${data.discount}%`;
        msg.style.color = '#28a745';
        
    } catch (e) {
        // ПОМИЛКА
        activePromo = null;
        input.style.borderColor = '#ff4d4d';
        input.style.color = '#ff4d4d';
        msg.innerText = `❌ ${e.message === "Код не знайдено" ? "Такого коду не існує" : e.message}`;
        msg.style.color = '#ff4d4d';
    }
    input.disabled = false;
    renderCheckoutSummary(); // Перемальовуємо чек
}