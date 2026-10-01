document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GATE SCREEN (PINTU MASUK) ---
    const emailForm = document.getElementById('email-form');
    const passwordForm = document.getElementById('password-form');
    const stepEmail = document.getElementById('step-email');
    const stepPassword = document.getElementById('step-password');
    const gateScreen = document.getElementById('gate-screen');
    const mainContent = document.getElementById('main-content'); // Ini yang kemarin terlupa!

    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            stepEmail.classList.remove('active');
            stepPassword.classList.add('active');
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pwd = document.getElementById('password-input').value;
            if (pwd === 'MINE2026') {
                gateScreen.style.opacity = '0';
                setTimeout(() => { 
                    gateScreen.style.display = 'none'; 
                    mainContent.classList.remove('hidden'); // Ini perintah memunculkan toko!
                }, 500);
            } else {
                alert('Password Salah!');
            }
        });
    }

    // --- 2. MENGAMBIL DATA DARI DATABASE ---
    let cart = [];
    const productGrid = document.getElementById('product-grid');

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            renderProducts(products);
        } catch (error) {
            console.error("Error memuat produk:", error);
        }
    }

    function renderProducts(products) {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.category = p.category;
            card.innerHTML = `
                <div class="image-wrapper">
                    <img src="${p.img}" alt="${p.name}">
                    <div class="hover-add" data-id="${p._id || p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.img}" data-stock="${p.stock}">QUICK ADD</div>
                </div>
                <div class="product-info">
                    <span class="product-name">${p.name}</span>
                    <span class="product-price">$${p.price}</span>
                </div>
            `;
            productGrid.appendChild(card);
        });
        setupProductHover();
        setupFilterLogic();
    }

    // --- 3. LOGIKA KERANJANG BELANJA ---
    function setupProductHover() {
        document.querySelectorAll('.hover-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const name = e.target.dataset.name;
                const price = parseInt(e.target.dataset.price);
                const img = e.target.dataset.img;
                const stock = parseInt(e.target.dataset.stock || 10);

                const existing = cart.find(i => i.id === id);
                if (existing) {
                    if (existing.qty < stock) {
                        existing.qty += 1;
                        showBtnFeedback(btn, 'ADDED');
                    } else {
                        showBtnFeedback(btn, 'MAX STOCK');
                    }
                } else {
                    if (stock > 0) {
                        cart.push({ id, name, price, img, qty: 1, maxStock: stock });
                        showBtnFeedback(btn, 'ADDED');
                    } else {
                        showBtnFeedback(btn, 'OUT OF STOCK');
                    }
                }
                updateCartUI();
            });
        });
    }

    function showBtnFeedback(btn, text) {
        const originalText = 'QUICK ADD';
        btn.textContent = text;
        setTimeout(() => { btn.textContent = originalText; }, 1000);
    }

    window.updateQty = (id, delta) => {
        const item = cart.find(i => i.id === id);
        if (item) {
            const newQty = item.qty + delta;
            if (newQty > 0 && newQty <= item.maxStock) {
                item.qty = newQty;
            } else if (newQty <= 0) {
                cart = cart.filter(i => i.id !== id);
            }
            updateCartUI();
        }
    };

    window.removeItem = (id) => {
        cart = cart.filter(i => i.id !== id);
        updateCartUI();
    };

    const updateCartUI = () => {
        const cartCount = document.getElementById('cart-count');
        const cartItems = document.getElementById('cart-items');
        const cartTotalPrice = document.getElementById('cart-total-price');

        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }

        if (!cartItems) return;
        cartItems.innerHTML = '';
        let total = 0;

        cart.forEach(item => {
            total += item.price * item.qty;
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <img src="${item.img}" alt="${item.name}">
                <div class="cart-item-details">
                    <div>${item.name}</div>
                    <div style="color: var(--text-secondary)">$${item.price}</div>
                    <div class="qty-controls">
                        <button onclick="updateQty('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button onclick="updateQty('${item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeItem('${item.id}')">X</button>
            `;
            cartItems.appendChild(row);
        });
        if (cartTotalPrice) cartTotalPrice.textContent = `$${total}`;
    };

    // --- 4. BUKA/TUTUP KERANJANG ---
    const cartModal = document.getElementById('cart-modal');
    const cartIcon = document.getElementById('cart-icon');
    const closeCartBtn = document.getElementById('close-cart');
    
    if (cartIcon) cartIcon.addEventListener('click', (e) => { e.preventDefault(); if (cartModal) cartModal.classList.remove('hidden'); });
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => { if (cartModal) cartModal.classList.add('hidden'); });

    // --- 5. FILTER KATEGORI ---
    function setupFilterLogic() {
        const catItems = document.querySelectorAll('.cat-item');
        const productCards = document.querySelectorAll('.product-card');

        catItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', () => {
                document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
                newItem.classList.add('active');
                const filter = newItem.dataset.filter;
                productCards.forEach(card => {
                    if (filter === 'all' || (card.dataset.category && card.dataset.category.includes(filter))) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    loadProducts();
});
