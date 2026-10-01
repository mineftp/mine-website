document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE ---
    let cart = [];
    const SHIPPING_RATE_PER_KG = 15000; // IDR 15,000 equivalent per kg (or simplified to $/kg)
    // Let's use $ for consistency with the HTML. $10 per 1000g (1kg) for J&T.
    const SHIPPING_RATE_PER_GRAM = 0.01; 
    let currentShippingCost = 0;
    let selectedPaymentMethod = '';

    // --- ELEMENTS ---
    const gateScreen = document.getElementById('gate-screen');
    const stepEmail = document.getElementById('step-email');
    const stepPassword = document.getElementById('step-password');
    const emailForm = document.getElementById('email-form');
    const passwordForm = document.getElementById('password-form');
    const mainContent = document.getElementById('main-content');
    const errorMsg = document.getElementById('error-msg');

    const cartNavBtn = document.getElementById('cart-nav-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartDrawer = document.getElementById('cart-drawer');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const btnCheckout = document.getElementById('btn-checkout');

    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutBtn = document.getElementById('close-checkout');
    const checkoutStep1 = document.getElementById('checkout-step-1');
    const checkoutStep2 = document.getElementById('checkout-step-2');
    const checkoutStep3 = document.getElementById('checkout-step-3');
    const addressForm = document.getElementById('address-form');
    
    const totalWeightDisplay = document.getElementById('total-weight-display');
    const shippingBox = document.getElementById('shipping-box');
    const grandTotalPrice = document.getElementById('grand-total-price');
    const payBtns = document.querySelectorAll('.pay-btn');
    const paymentInstructionBox = document.getElementById('payment-instruction-box');
    const btnFinishOrder = document.getElementById('btn-finish-order');

    const emailModal = document.getElementById('email-modal');
    const closeEmailBtn = document.getElementById('close-email');


    // --- GATE LOGIC ---
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        stepEmail.classList.remove('active');
        stepPassword.classList.add('active');
    });

    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('password-input').value;
        if (pwd === 'MINE2026') {
            gateScreen.classList.add('inactive');
            setTimeout(() => {
                gateScreen.classList.add('hidden');
                mainContent.classList.remove('hidden');
            }, 800);
        } else {
            errorMsg.style.display = 'block';
        }
    });

    // --- CART LOGIC ---
    const updateCartUI = () => {
        cartNavBtn.textContent = `CART (${cart.reduce((sum, item) => sum + item.qty, 0)})`;
        cartItemsContainer.innerHTML = '';
        
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<p class="empty-cart-msg">Your cart is empty.</p>`;
        } else {
            cart.forEach(item => {
                total += item.price * item.qty;
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <img src="${item.img}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div>
                            <div class="cart-item-title">${item.name}</div>
                            <div class="cart-item-price">$${item.price}</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="qty-controls">
                                <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                                <span>${item.qty}</span>
                                <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                            </div>
                            <button class="remove-btn" onclick="removeItem(${item.id})">REMOVE</button>
                        </div>
                    </div>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }
        cartTotalPrice.textContent = `$${total}`;
    };

    // --- DYNAMIC PRODUCT FETCHING ---
    const productGrid = document.getElementById('product-grid');
    
    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            renderProducts(products);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            // Fallback for static viewing (without server)
            setupProductHover(); 
        }
    }

    function renderProducts(products) {
        productGrid.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.category = p.category;
            card.innerHTML = `
                <div class="image-wrapper">
                    <img src="${p.img}" alt="${p.name}">
                    <div class="hover-add" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.img}" data-weight="${p.weight}" data-stock="${p.stock}">QUICK ADD</div>
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

    function setupProductHover() {
        document.querySelectorAll('.hover-add').forEach(btn => {
            // Remove old listeners to avoid duplicates if re-rendered
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                const id = e.target.dataset.id; // Keep as string for MongoDB
                const name = e.target.dataset.name;
                const price = parseInt(e.target.dataset.price);
                const img = e.target.dataset.img;
                const weight = parseInt(e.target.dataset.weight);
                const stock = parseInt(e.target.dataset.stock || 100);

                const existing = cart.find(i => i.id === id);
                if (existing) {
                    if (existing.qty < stock) {
                        existing.qty += 1;
                        showBtnFeedback(newBtn, 'ADDED');
                    } else {
                        showBtnFeedback(newBtn, 'MAX STOCK');
                    }
                } else {
                    if (stock > 0) {
                        cart.push({ id, name, price, img, weight, qty: 1, maxStock: stock });
                        showBtnFeedback(newBtn, 'ADDED');
                    } else {
                        showBtnFeedback(newBtn, 'OUT OF STOCK');
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

    // Load products on start
    loadProducts();

    const openCart = (e) => {
        e?.preventDefault();
        cartOverlay.classList.add('active');
        cartDrawer.classList.add('active');
    };

    const closeCart = () => {
        cartOverlay.classList.remove('active');
        cartDrawer.classList.remove('active');
    };

    cartNavBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);


    // --- CHECKOUT LOGIC ---
    btnCheckout.addEventListener('click', () => {
        if (cart.length === 0) return alert('Cart is empty.');
        closeCart();
        checkoutModal.classList.remove('hidden');
        checkoutStep1.classList.add('active');
        checkoutStep2.classList.remove('active');
        checkoutStep3.classList.remove('active');
    });

    closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.classList.add('hidden');
    });

    addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Calculate total weight
        const totalWeight = cart.reduce((sum, item) => sum + (item.weight * item.qty), 0);
        totalWeightDisplay.textContent = totalWeight;
        
        // Calculate shipping (minimum 1kg/1000g equivalent)
        const chargeableWeight = Math.max(1000, totalWeight);
        currentShippingCost = Math.ceil(chargeableWeight * SHIPPING_RATE_PER_GRAM);

        setTimeout(() => {
            shippingBox.innerHTML = `
                <div class="shipping-option">
                    <div>
                        <div>J&T Express (Regular)</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); font-weight:normal;">Weight: ${totalWeight}g</div>
                    </div>
                    <div class="shipping-price">$${currentShippingCost}</div>
                </div>
            `;
            
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            grandTotalPrice.textContent = `$${subtotal + currentShippingCost}`;
        }, 800);

        checkoutStep1.classList.remove('active');
        checkoutStep2.classList.add('active');
    });

    payBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            payBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPaymentMethod = btn.dataset.method;
            
            // Move to step 3
            setTimeout(() => {
                checkoutStep2.classList.remove('active');
                checkoutStep3.classList.add('active');
                
                if (selectedPaymentMethod === 'QRIS' || selectedPaymentMethod === 'ShopeePay') {
                    paymentInstructionBox.innerHTML = `
                        <p>Scan the QR Code below using your mobile banking or e-wallet app.</p>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MINE-PAYMENT" alt="QR Code" style="margin: 20px auto; display: block; border-radius: 8px;">
                        <p>Total: <strong>${grandTotalPrice.textContent}</strong></p>
                    `;
                } else {
                    const randomVA = Math.floor(1000000000000 + Math.random() * 9000000000000);
                    paymentInstructionBox.innerHTML = `
                        <p>Transfer to the following Virtual Account:</p>
                        <div class="va-number">${selectedPaymentMethod} ${randomVA}</div>
                        <p>Total: <strong>${grandTotalPrice.textContent}</strong></p>
                    `;
                }
            }, 300);
        });
    });

    // --- EMAIL SIMULATION ---
    btnFinishOrder.addEventListener('click', () => {
        checkoutModal.classList.add('hidden');
        emailModal.classList.remove('hidden');

        // Populate email data
        const orderId = 'MNE-' + Math.floor(100000 + Math.random() * 900000);
        const awb = 'JT' + Math.floor(1000000000 + Math.random() * 9000000000);
        
        document.getElementById('email-order-id').textContent = orderId;
        document.getElementById('email-awb').textContent = awb;

        const emailItemList = document.getElementById('email-item-list');
        emailItemList.innerHTML = '';
        
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.price * item.qty;
            emailItemList.innerHTML += `
                <div class="email-item">
                    <span>${item.qty}x ${item.name}</span>
                    <span>$${item.price * item.qty}</span>
                </div>
            `;
        });

        document.getElementById('email-subtotal').textContent = `$${subtotal}`;
        document.getElementById('email-shipping').textContent = `$${currentShippingCost}`;
        document.getElementById('email-grandtotal').textContent = `$${subtotal + currentShippingCost}`;
        
        // Clear cart
        cart = [];
        updateCartUI();
    });

    // --- FILTER LOGIC ---
    window.setupFilterLogic = function() {
        const catItems = document.querySelectorAll('.cat-item');
        const productCards = document.querySelectorAll('.product-card');

        // Remove old event listeners by cloning
        catItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
                newItem.classList.add('active');

                const filter = newItem.dataset.filter;
                
                productCards.forEach(card => {
                    if (filter === 'all') {
                        card.style.display = 'block';
                    } else {
                        const categories = (card.dataset.category || "").split(',');
                        if (categories.includes(filter)) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    }
                });
                
                // Scroll to collection section smoothly
                const collection = document.getElementById('collection');
                if (collection) collection.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };

    const closeEmailBtn = document.getElementById('close-email');
    if (closeEmailBtn) {
        closeEmailBtn.addEventListener('click', () => {
            const emailModal = document.getElementById('email-modal');
            if(emailModal) emailModal.classList.add('hidden');
        });
    }

});
