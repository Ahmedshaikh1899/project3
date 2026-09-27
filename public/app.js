const ordersBody = document.getElementById("orders-body");
const totalOrders = document.getElementById("total-orders");
const confirmedOrders = document.getElementById("confirmed-orders");
const shippedOrders = document.getElementById("shipped-orders");
const newOrders = document.getElementById("new-orders");

const modal = document.getElementById("order-modal");
const openOrderBtn = document.getElementById("open-order-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const orderForm = document.getElementById("order-form");
const formError = document.getElementById("form-error");
const refreshBtn = document.getElementById("refresh-btn");
const message = document.getElementById("message");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusClass(status) {
  return `status status-${String(status).toLowerCase()}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

async function loadOrders() {
  ordersBody.innerHTML = '<tr><td colspan="6" class="empty">Loading orders...</td></tr>';

  try {
    const response = await fetch("/orders");
    if (!response.ok) throw new Error("Unable to load orders");

    const orders = await response.json();

    totalOrders.textContent = orders.length;
    confirmedOrders.textContent = orders.filter(o => o.status === "CONFIRMED").length;
    shippedOrders.textContent = orders.filter(o => o.status === "SHIPPED").length;
    newOrders.textContent = orders.filter(o => o.status === "NEW").length;

    if (orders.length === 0) {
      ordersBody.innerHTML = '<tr><td colspan="6" class="empty">No orders found.</td></tr>';
      return;
    }

    ordersBody.innerHTML = orders.map(order => `
      <tr>
        <td>#${escapeHtml(order.id)}</td>
        <td>${escapeHtml(order.customer_name)}</td>
        <td>${escapeHtml(order.product_name)}</td>
        <td>${escapeHtml(order.quantity)}</td>
        <td><span class="${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
        <td>${escapeHtml(formatDate(order.created_at))}</td>
      </tr>
    `).join("");
  } catch (error) {
    ordersBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

openOrderBtn.addEventListener("click", () => {
  formError.classList.add("hidden");
  modal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.classList.add("hidden");
});

refreshBtn.addEventListener("click", loadOrders);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.classList.add("hidden");

  const payload = {
    customer_name: document.getElementById("customer_name").value.trim(),
    product_name: document.getElementById("product_name").value.trim(),
    quantity: Number(document.getElementById("quantity").value)
  };

  try {
    const response = await fetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to create order");
    }

    orderForm.reset();
    modal.classList.add("hidden");

    message.textContent = `Order #${data.id} created successfully.`;
    message.classList.remove("hidden");

    await loadOrders();

    setTimeout(() => message.classList.add("hidden"), 3000);
  } catch (error) {
    formError.textContent = error.message;
    formError.classList.remove("hidden");
  }
});

loadOrders();
