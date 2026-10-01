const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
        await initializeAdmin();
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
    }
};

// --- SCHEMAS (STRUKTUR DATABASE) ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    weight: { type: Number, required: true },
    category: { type: String, required: true },
    img: { type: String, required: true },
    stock: { type: Number, default: 0 }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

productSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// --- PEMBUATAN AKUN ADMIN OTOMATIS ---
async function initializeAdmin() {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
        const hash = await bcrypt.hash('adminpassword', 10);
        await User.create({ username: 'admin', password: hash });
        console.log('Default admin user created.');
    }
}

module.exports = { connectDB, User, Product };
