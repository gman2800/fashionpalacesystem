const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/test-api', (req, res) => {
    res.json({ message: 'API is working' });
});

app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Get products error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

app.post('/products', (req, res) => {
    const { name, quantity, price } = req.body;

    console.log('Add product body:', req.body);

    if (!name || quantity === undefined || price === undefined) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    db.query(
        'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
        [name, quantity, price],
        (err, result) => {
            if (err) {
                console.error('Add product error:', err);
                return res.status(500).json({ message: 'Insert failed' });
            }
            res.json({ message: 'Product added successfully' });
        }
    );
});

app.delete('/products/:id', (req, res) => {
    const id = req.params.id;

    db.query(
        'DELETE FROM products WHERE id = ?',
        [id],
        (err, result) => {
            if (err) {
                console.error('Delete product error:', err);
                return res.status(500).json({ message: 'Delete failed' });
            }

            res.json({ message: 'Product deleted successfully' });
        }
    );
});

app.put('/sell/:id', (req, res) => {
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
app.get('/sales', (req, res) => {
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
app.put('/products/:id', (req, res) => {
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
