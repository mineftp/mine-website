document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GATE SCREEN (PINTU MASUK) ---
    const emailForm = document.getElementById('email-form');
    const passwordForm = document.getElementById('password-form');
    const stepEmail = document.getElementById('step-email');
    const stepPassword = document.getElementById('step-password');
    const gateScreen = document.getElementById('gate-screen');
    const mainContent = document.getElementById('main-content');

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
                    mainContent.classList.remove('hidden'); 
                }, 500);
            } else {
                alert('Password Salah!');
            }
        });
    }

    // --- FITUR BARU: INJEKSI HALAMAN DETAIL & AKUN ---
    const productModalHTML = `
    <div id="product-modal" class="checkout-modal hidden" style="align-items: center; justify-content: center; display: flex; z-index: 9999;">
        <div class="checkout-content" style="max-width: 800px; display: flex; gap: 2rem; background: #0a0a0a; border: 1px solid #333; flex-wrap: wrap;">
            <button id="close-product-modal" class="close-checkout-btn" style="position: absolute; right: 20px; top: 20px;">&times;</button>
            <div style="flex: 1; min-width: 250px;">
                <img id="pm-img" src="" style="width: 100%; border: 1px solid #333; object-fit: cover;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 250px;">
                <h2 id="pm-name" style="margin-top: 0; font-family: 'Anton', sans-serif; font-size: 2.5rem; letter-spacing: 2px;">NAME</h2>
                <p id="pm-price" style="font-size: 1.5rem; color: #fff; margin-bottom: 1rem;">$0</p>
                <p id="pm-category" style="color: #888; margin-bottom: 2rem; font-family: 'Inter', sans-serif;">Category</p>
                <button id="pm-add-btn" class="btn" style="width: 100%;">ADD TO CART</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', productModalHTML);

    const accountModalHTML = `
    <div id="account-modal" class="checkout-modal hidden" style="align-items: center; justify-content: center; display: flex; z-index: 9999;">
        <div class="checkout-content" style="background: #0a0a0a; border: 1px solid #333;">
            <button id="close-account-modal" class="close-checkout-btn">&times;</button>
            <h2 style="font-family: 'Anton', sans-serif;">MY ACCOUNT</h2>
            <p style="color:#888; font-size:0.9rem; margin-bottom:1rem; font-family: 'Inter', sans-serif;">Simpan data pengiriman Anda untuk checkout lebih cepat.</p>
            <form id="account-form" style="display:flex; flex-direction:column; gap:15px; font-family: 'Inter', sans-serif;">
                <input type="text" id="acc-name" placeholder="Full Name" required style="padding:15px; background:#000; color:#fff; border:1px solid #333; font-family:'Inter',sans-serif;">
                <input type="text" id="acc-address" placeholder="Full Address / Province" required style="padding:15px; background:#000; color:#fff; border:1px solid #333; font-family:'Inter',sans-serif;">
                <input type="text" id="acc-phone" placeholder="Phone Number" required style="padding:15px; background:#000; color:#fff; border:1px solid #333; font-family:'Inter',sans-serif;">
                <button type="submit" class="btn">SAVE DATA</button>
            </form>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', accountModalHTML);

    // --- 2. MENGAMBIL DATA DARI DATABASE ---
    let cart = [];
    const productGrid = document.getElementById('product-grid');
    let allProductsData = [];

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            allProductsData = products;
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
                <div class="image-wrapper" style="cursor: pointer;" onclick="openProductModal('${p._id || p.id}')">
                    <img src="${p.img}" alt="${p.name}">
                    <div class="hover-add" onclick="event.stopPropagation(); quickAdd('${p._id || p.id}')" data-id="${p._id || p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.img}" data-stock="${p.stock}">QUICK ADD</div>
                </div>
                <div class="product-info">
                    <span class="product-name">${p.name}</span>
                    <span class="product-price">$${p.price}</span>
                </div>
            `;
            productGrid.appendChild(card);
        });
        setupFilterLogic();
    }

    // --- FUNGSI HALAMAN DETAIL PRODUK ---
    const productModal = document.getElementById('product-modal');
    window.openProductModal = (id) => {
        const p = allProductsData.find(item => (item._id === id || item.id === id));
        if(!p) return;
        document.getElementById('pm-img').src = p.img;
        document.getElementById('pm-name').textContent = p.name;
        document.getElementById('pm-price').textContent = '$' + p.price;
        document.getElementById('pm-category').textContent = 'Categories: ' + p.category.toUpperCase();
        
        const addBtn = document.getElementById('pm-add-btn');
        addBtn.onclick = () => {
            quickAdd(id);
            addBtn.textContent = "ADDED!";
            setTimeout(() => addBtn.textContent = "ADD TO CART", 1000);
        };
        productModal.classList.remove('hidden');
    };
    document.getElementById('close-product-modal').onclick = () => productModal.classList.add('hidden');

    // --- 3. LOGIKA KERANJANG BELANJA ---
    window.quickAdd = (id) => {
        const p = allProductsData.find(item => (item._id === id || item.id === id));
        if(!p) return;
        const stock = p.stock || 10;
        const existing = cart.find(i => i.id === id);
        if (existing) {
            if (existing.qty < stock) {
                existing.qty += 1;
            } else {
                alert('Maksimal stok tercapai!');
            }
        } else {
            if (stock > 0) {
                cart.push({ id: p._id || p.id, name: p.name, price: p.price, img: p.img, qty: 1, maxStock: stock });
            } else {
                alert('Stok habis!');
            }
        }
        updateCartUI();
        
        // Membuka laci otomatis saat ditambah
        const cartDrawer = document.getElementById('cart-drawer');
        const cartOverlay = document.getElementById('cart-overlay');
        if (cartDrawer) cartDrawer.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('active');
    };

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
        const cartNavBtn = document.getElementById('cart-nav-btn');
        const cartItems = document.getElementById('cart-items');
        const cartTotalPrice = document.getElementById('cart-total-price');

        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        
        if (cartNavBtn) cartNavBtn.textContent = \`CART (\${totalItems})\`;

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
        if (cartTotalPrice) cartTotalPrice.textContent = \`$\${total}\`;
    };

    // --- 4. SISTEM KLIK LACI KERANJANG ---
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartNavBtn = document.getElementById('cart-nav-btn');
    const closeCartBtn = document.getElementById('close-cart');
    
    if (cartNavBtn) {
        cartNavBtn.addEventListener('click', (e) => { 
            e.preventDefault(); 
            if (cartDrawer) cartDrawer.classList.add('open'); 
            if (cartOverlay) cartOverlay.classList.add('active'); 
        });
    }
    const closeDrawer = () => { 
        if (cartDrawer) cartDrawer.classList.remove('open'); 
        if (cartOverlay) cartOverlay.classList.remove('active'); 
    };
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeDrawer);

    // --- 5. MENU AKUN & PENGISIAN CHECKOUT OTOMATIS ---
    const accountModal = document.getElementById('account-modal');
    document.querySelectorAll('.nav-right a').forEach(a => {
        if(a.textContent.includes('ACCOUNT')) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                accountModal.classList.remove('hidden');
                
                // Isi formulir dari data yang tersimpan sebelumnya
                document.getElementById('acc-name').value = localStorage.getItem('mine_acc_name') || '';
                document.getElementById('acc-address').value = localStorage.getItem('mine_acc_addr') || '';
                document.getElementById('acc-phone').value = localStorage.getItem('mine_acc_phone') || '';
            });
        }
    });

    document.getElementById('close-account-modal').onclick = () => accountModal.classList.add('hidden');

    document.getElementById('account-form').addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('mine_acc_name', document.getElementById('acc-name').value);
        localStorage.setItem('mine_acc_addr', document.getElementById('acc-address').value);
        localStorage.setItem('mine_acc_phone', document.getElementById('acc-phone').value);
        alert('Data berhasil disimpan! Sistem akan otomatis mengisi form pengiriman Anda saat Checkout.');
        accountModal.classList.add('hidden');
    });

    // Menangani tombol Checkout
    const btnCheckout = document.getElementById('btn-checkout');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckout = document.getElementById('close-checkout');

    if (btnCheckout && checkoutModal) {
        btnCheckout.addEventListener('click', () => {
            if (cart.length === 0) return alert('Keranjang masih kosong!');
            
            // Pengisian otomatis
            const checkoutInputs = checkoutModal.querySelectorAll('input');
            if(checkoutInputs.length > 0) {
                if(checkoutInputs[0]) checkoutInputs[0].value = localStorage.getItem('mine_acc_name') || '';
                if(checkoutInputs.length > 1) checkoutInputs[1].value = localStorage.getItem('mine_acc_addr') || '';
            }

            closeDrawer();
            checkoutModal.classList.remove('hidden');
        });
    }
    if (closeCheckout) {
        closeCheckout.addEventListener('click', () => checkoutModal.classList.add('hidden'));
    }

    // --- 6. FILTER KATEGORI ---
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

    // Mulai Muat Produk
    loadProducts();
});
