require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

// Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// DB Setup
const { connectDB, User, Product } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'mine_super_secret_key';

// Initialize MongoDB
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend locally

// --- CLOUDINARY CONFIG ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mine_products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

// Fallback to memory storage if Cloudinary is not configured (prevents crashing if testing locally without keys)
const upload = process.env.CLOUDINARY_CLOUD_NAME 
    ? multer({ storage }) 
    : multer({ storage: multer.memoryStorage() });

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// --- AUTH ENDPOINTS ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: '2h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- PRODUCT ENDPOINTS ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, price, weight, category, stock } = req.body;
        
        // If Cloudinary is configured, file.path contains the cloud URL. 
        // If not configured, we just use a placeholder for now.
        let imgUrl = 'images/placeholder.jpg';
        if (req.file && req.file.path) {
            imgUrl = req.file.path;
        }

        const product = await Product.create({
            name, price, weight, category, img: imgUrl, stock
        });
        
        res.json({ id: product._id, message: 'Product added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { price, stock } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { price, stock });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start local server if not running in serverless environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for serverless platforms (Vercel/Netlify)
module.exports = app;
module.exports.handler = serverless(app);
