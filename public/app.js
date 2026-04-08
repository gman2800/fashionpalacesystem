const API = "https://fashionpalacesystem-production.up.railway.app/";

// LOAD PRODUCTS
function loadProducts() {
    const searchInput = document.getElementById("search");
    const search = searchInput ? searchInput.value.toLowerCase() : "";

    fetch(API + "/products")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("productList");
            list.innerHTML = "";

            let totalInventoryValue = 0;
            let lowStockCount = 0;
            const totalProducts = data.length;

            data
                .filter(product => (product.name || "").toLowerCase().includes(search))
                .forEach(product => {
                    const price = Number(product.price) || 0;
                    const quantity = Number(product.quantity) || 0;

                    totalInventoryValue += price * quantity;

                    if (quantity < 5) {
                        lowStockCount++;
                    }

                    list.innerHTML += `
                        <li>
                            <span>
                                <strong style="color:${quantity < 5 ? 'red' : 'white'}">
                                    ${product.name}
                                </strong><br>
                                Stock: ${quantity} | $${price.toFixed(2)}
                                ${quantity < 5 ? "<br><small style='color:red'>Low Stock!</small>" : ""}
                            </span>
                            <div class="actions">
                            <button onclick="sellProduct(${product.id})">Sell</button>
                            <button onclick="editProduct(${product.id}, '${product.name}', ${quantity}, ${price})">Edit</button>
                            <button onclick="deleteProduct(${product.id})">Delete</button>
                            </div>
                        </li>
                    `;
                });

            const totalValueEl = document.getElementById("totalValue");
            if (totalValueEl) {
                totalValueEl.innerText = "Total Value: $" + totalInventoryValue.toFixed(2);
            }

            const totalProductsEl = document.getElementById("totalProducts");
            if (totalProductsEl) {
                totalProductsEl.innerText = totalProducts;
            }

            const lowStockEl = document.getElementById("lowStockCount");
            if (lowStockEl) {
                lowStockEl.innerText = lowStockCount;
            }
        })
        .catch(err => {
            console.error("Load products error:", err);
            alert("Could not load products");
        });
}

// LOAD SALES
function loadSales() {
    fetch(API + "/sales")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("salesList");
            list.innerHTML = "";

            let totalRevenue = 0;
            let totalUnitsSold = 0;

            data.forEach(sale => {
                const totalPrice = Number(sale.total_price) || 0;
                const quantitySold = Number(sale.quantity_sold) || 0;

                totalRevenue += totalPrice;
                totalUnitsSold += quantitySold;

                list.innerHTML += `
                    <li>
                        <span>
                            <strong>${sale.name}</strong><br>
                            Sold: ${quantitySold} | Total: $${totalPrice.toFixed(2)}<br>
                            Date: ${new Date(sale.sale_date).toLocaleString()}
                        </span>
                    </li>
                `;
            });

            const revenueEl = document.getElementById("totalRevenue");
            if (revenueEl) {
                revenueEl.innerText = "$" + totalRevenue.toFixed(2);
            }

            const unitsEl = document.getElementById("totalUnitsSold");
            if (unitsEl) {
                unitsEl.innerText = totalUnitsSold;
            }
        })
        .catch(err => {
            console.error("Load sales error:", err);
        });
}

// ADD PRODUCT
function addProduct() {
    const name = document.getElementById("name").value.trim();
    const quantity = document.getElementById("quantity").value;
    const price = document.getElementById("price").value;

    if (!name || !quantity || !price) {
        alert("Please fill in all fields");
        return;
    }

    fetch(API + "/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            quantity: parseInt(quantity),
            price: parseFloat(price)
        })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);

            document.getElementById("name").value = "";
            document.getElementById("quantity").value = "";
            document.getElementById("price").value = "";

            loadProducts();
        })
        .catch(err => {
            console.error("Add product error:", err);
            alert("Failed to add product");
        });
}

// DELETE PRODUCT
function deleteProduct(id) {
    fetch(API + "/products/" + id, {
        method: "DELETE"
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadProducts();
        })
        .catch(err => {
            console.error("Delete product error:", err);
            alert("Failed to delete product");
        });
}

// SELL PRODUCT
function sellProduct(id) {
    const qty = prompt("Enter quantity to sell:");

    if (!qty || parseInt(qty) <= 0) {
        alert("Enter a valid quantity");
        return;
    }

    fetch(API + "/sell/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            quantity: parseInt(qty)
        })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadProducts();
            loadSales();
        })
        .catch(err => {
            console.error("Sell request failed:", err);
            alert("Sell request failed");
        });
}
function editProduct(id, currentName, currentQuantity, currentPrice) {
    const newName = prompt("Enter new product name:", currentName);
    if (newName === null) return;

    const newQuantity = prompt("Enter new quantity:", currentQuantity);
    if (newQuantity === null) return;

    const newPrice = prompt("Enter new price:", currentPrice);
    if (newPrice === null) return;

    fetch(API + "/products/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: newName.trim(),
            quantity: parseInt(newQuantity),
            price: parseFloat(newPrice)
        })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadProducts();
        })
        .catch(err => {
            console.error("Edit product error:", err);
            alert("Failed to update product");
        });
}
// PAGE LOAD
window.onload = function () {
    loadProducts();
    loadSales();
};