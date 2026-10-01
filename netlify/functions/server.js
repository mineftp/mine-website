require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const cloudinary = require('cloudinary').v2;
const { connectDB, User, Product } = require('./db');

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'mine_super_secret_key';

connectDB();

app.use(cors());
// Mengizinkan pengiriman foto dalam bentuk teks (Base64) hingga 10MB
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { name, price, weight, category, stock, imageBase64 } = req.body;
        
        let imgUrl = 'images/placeholder.jpg';
        // Upload Base64 ke Cloudinary
        if (imageBase64) {
            const uploadRes = await cloudinary.uploader.upload(imageBase64, { folder: 'mine_products' });
            imgUrl = uploadRes.secure_url;
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

module.exports.handler = serverless(app);
