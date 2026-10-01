document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    
    const adminProductList = document.getElementById('admin-product-list');
    const btnShowAddForm = document.getElementById('btn-show-add-form');
    const btnCancelAdd = document.getElementById('btn-cancel-add');
    const addProductForm = document.getElementById('add-product-form');
    const productForm = document.getElementById('product-form');

    let token = localStorage.getItem('mine_admin_token');

    // --- INIT ---
    if (token) {
        showDashboard();
    }

    // --- LOGIN ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                token = data.token;
                localStorage.setItem('mine_admin_token', token);
                showDashboard();
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('mine_admin_token');
        token = null;
        dashboardSection.classList.add('hidden');
        loginSection.style.display = 'flex';
    });

    function showDashboard() {
        loginSection.style.display = 'none';
        dashboardSection.classList.remove('hidden');
        fetchProducts();
    }

    // --- PRODUCT MANAGEMENT ---
    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            renderAdminProducts(products);
        } catch (err) {
            console.error(err);
        }
    }

    function renderAdminProducts(products) {
        adminProductList.innerHTML = '';
        products.forEach(p => {
            const imgSrc = p.img.startsWith('http') ? p.img : `/${p.img}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${imgSrc}" class="admin-img" alt="IMG"></td>
                <td>${p.name}</td>
                <td>
                    $<input type="number" value="${p.price}" id="price-${p.id}" style="width: 60px; background:#222; color:white; border:none; padding:5px;">
                </td>
                <td>
                    <input type="number" value="${p.stock}" id="stock-${p.id}" style="width: 60px; background:#222; color:white; border:none; padding:5px;">
                </td>
                <td>${p.category}</td>
                <td>
                    <button class="action-btn" onclick="updateProduct('${p.id}')">SAVE</button>
                    <button class="action-btn delete" onclick="deleteProduct('${p.id}')">DELETE</button>
                </td>
            `;
            adminProductList.appendChild(tr);
        });
    }

    btnShowAddForm.addEventListener('click', () => {
        addProductForm.classList.add('active');
    });

    btnCancelAdd.addEventListener('click', () => {
        addProductForm.classList.remove('active');
        productForm.reset();
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('prod-name').value);
        formData.append('price', document.getElementById('prod-price').value);
        formData.append('stock', document.getElementById('prod-stock').value);
        formData.append('weight', document.getElementById('prod-weight').value);
        formData.append('category', document.getElementById('prod-category').value);
        formData.append('image', document.getElementById('prod-image').files[0]);

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                addProductForm.classList.remove('active');
                productForm.reset();
                fetchProducts();
            } else {
                alert('Error adding product');
            }
        } catch (err) {
            console.error(err);
        }
    });

    window.updateProduct = async (id) => {
        const price = document.getElementById(`price-${id}`).value;
        const stock = document.getElementById(`stock-${id}`).value;

        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ price, stock })
            });
            if (res.ok) {
                alert('Updated successfully');
                fetchProducts();
            } else {
                alert('Update failed (unauthorized?)');
            }
        } catch (err) {
            console.error(err);
        }
    };

    window.deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchProducts();
            } else {
                alert('Delete failed');
            }
        } catch (err) {
            console.error(err);
        }
    };

});
