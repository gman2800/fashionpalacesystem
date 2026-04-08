const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

function requireAuth(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
}

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (username === adminUser && password === adminPass) {
        req.session.loggedIn = true;
        req.session.username = username;
        return res.json({ message: 'Login successful' });
    }

    return res.status(401).json({ message: 'Invalid username or password' });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/check-auth', (req, res) => {
    if (req.session && req.session.loggedIn) {
        return res.json({ loggedIn: true });
    }
    return res.status(401).json({ loggedIn: false });
});

app.get('/', (req, res) => {
    if (req.session && req.session.loggedIn) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    return res.redirect('/login');
});

app.get('/test-api', (req, res) => {
    res.json({ message: 'API is working' });
});

app.get('/products', requireAuth, (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Get products error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

app.post('/products', requireAuth, (req, res) => {
    const { name, quantity, price } = req.body;

    if (!name || quantity === undefined || price === undefined) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    db.query(
        'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
        [name, quantity, price],
        (err) => {
            if (err) {
                console.error('Add product error:', err);
                return res.status(500).json({ message: 'Insert failed' });
            }
            res.json({ message: 'Product added successfully' });
        }
    );
});

app.delete('/products/:id', requireAuth, (req, res) => {
    const id = req.params.id;

    db.query(
        'DELETE FROM products WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.error('Delete product error:', err);
                return res.status(500).json({ message: 'Delete failed' });
            }

            res.json({ message: 'Product deleted successfully' });
        }
    );
});

app.put('/sell/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    const qty = parseInt(req.body.quantity);

    if (!qty || qty <= 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
    }

    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Select error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const product = results[0];

        if (product.quantity < qty) {
            return res.status(400).json({ message: 'Not enough stock' });
        }

        const newQty = product.quantity - qty;
        const totalPrice = Number(product.price) * qty;

        db.query(
            'UPDATE products SET quantity = ? WHERE id = ?',
            [newQty, id],
            (err2) => {
                if (err2) {
                    console.error('Update error:', err2);
                    return res.status(500).json({ message: 'Update failed' });
                }

                db.query(
                    'INSERT INTO sales (product_id, quantity_sold, total_price) VALUES (?, ?, ?)',
                    [id, qty, totalPrice],
                    (err3) => {
                        if (err3) {
                            console.error('Insert sale error:', err3);
                            return res.status(500).json({ message: 'Sales record failed' });
                        }

                        res.json({
                            message: 'Sale completed successfully',
                            newQuantity: newQty
                        });
                    }
                );
            }
        );
    });
});

app.get('/sales', requireAuth, (req, res) => {
    const sql = `
        SELECT sales.id, products.name, sales.quantity_sold, sales.total_price, sales.sale_date
        FROM sales
        JOIN products ON sales.product_id = products.id
        ORDER BY sales.sale_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Get sales error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

app.put('/products/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    const { name, quantity, price } = req.body;

    if (!name || quantity === undefined || price === undefined) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    db.query(
        'UPDATE products SET name = ?, quantity = ?, price = ? WHERE id = ?',
        [name, quantity, price, id],
        (err, result) => {
            if (err) {
                console.error('Update product error:', err);
                return res.status(500).json({ message: 'Update failed' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json({ message: 'Product updated successfully' });
        }
    );
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});