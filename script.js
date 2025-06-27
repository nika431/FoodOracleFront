const API_BASE_URL = "https://localhost:7249/api/food";
let fp;
let currentSearchQuery = "";

let currentSortBy = "date";

document.addEventListener("DOMContentLoaded", function () {
  fp = flatpickr("#expiryDate", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "F j, Y",
  });

  setupEventListeners();
  loadItems();
});

function showToast(message, type = "success") {
  const successColor = "linear-gradient(to right, #00b09b, #96c93d)";
  const errorColor = "linear-gradient(to right, #e74c3c, #c0392b)";

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    style: {
      background: type === "success" ? successColor : errorColor,
    },
  }).showToast();
}

function setupEventListeners() {
  const form = document.getElementById("food-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("Name").value.trim();
    const quantity = document.getElementById("quantity").value.trim();
    const date = document.getElementById("expiryDate").value.trim();

    if (!name || !quantity || !date) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    const item = {
      name: name,
      quantity: parseInt(quantity),
      expiryDate: new Date(date).toISOString(),
    };

    fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save item.");
        return res.json();
      })
      .then(() => {
        showToast("Item added successfully!");
        loadItems();
        form.reset();
        fp.clear();
      })
      .catch((err) => console.error("Error adding item:", err));
  });

  document.getElementById("sort-by-date").addEventListener("click", () => {
    currentSortBy = "date";
    loadItems();
  });

  document.getElementById("sort-by-name").addEventListener("click", () => {
    currentSortBy = "name";
    loadItems();
  });

  document.getElementById("SearchBar").addEventListener("keyup", handleSearch);
}

function handleSearch() {
  currentSearchQuery = document.getElementById("SearchBar").value.trim();
  loadItems();
}

async function loadItems() {
  try {
    const params = new URLSearchParams();
    params.append("sortBy", currentSortBy);

    if (currentSearchQuery) {
      params.append("searchQuery", currentSearchQuery);
    }
    const url = `${API_BASE_URL}?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();

    const list = document.getElementById("item-list");
    list.innerHTML = "";

    data.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "item";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);

      const oneDay = 1000 * 60 * 60 * 24;
      const daysUntilExpiry = Math.ceil(
        (expiry.getTime() - today.getTime()) / oneDay
      );

      let statusClass = "status-fresh";
      if (daysUntilExpiry < 0) {
        statusClass = "status-expired";
      } else if (daysUntilExpiry <= 7) {
        statusClass = "status-expiring-soon";
      }

      itemDiv.className = `item ${statusClass}`;
      itemDiv.id = `item-${item.id}`;
      itemDiv.innerHTML = createItemHtml(item);
      list.appendChild(itemDiv);
    });

    feather.replace();
  } catch (err) {
    console.error("Error loading items:", err);
    showToast(`Failed to load items: ${err.message}`, "error");
  }
}

function createItemHtml(item) {
  const expiryDate = new Date(item.expiryDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
      <div class="item-info">
        <p class="item-name">${item.name}</p>
        <p><strong>Quantity:</strong> ${item.quantity}</p>
        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
      </div>
      <div class="item-buttons">
          <button class="btn-edit" onclick='editItem(${JSON.stringify(item)})'>
              <i data-feather="edit"></i>
          </button>
          <button class="btn-delete" onclick="deleteItem(${item.id})">
              <i data-feather="trash-2"></i>
          </button>
      </div>
    `;
}

function createEditFormHtml(item) {
  const expiryDate = new Date(item.expiryDate).toISOString().split("T")[0];

  return `
      <div class="item-info edit-form">
          <input type="text" id="edit-name-${item.id}" value="${item.name}" class="edit-input" placeholder="Name">
          <input type="number" id="edit-quantity-${item.id}" value="${item.quantity}" class="edit-input" placeholder="Quantity">
          <input type="date" id="edit-expiry-${item.id}" value="${expiryDate}" class="edit-input">
      </div>
      <div class="item-buttons">
          <button class="btn-cancel" onclick="cancelEdit(${item.id})">
              <i data-feather="x-circle"></i>
          </button>
          <button class="btn-save" onclick="saveEdit(${item.id})">
              <i data-feather="check-circle"></i>
          </button>
      </div>
    `;
}

function editItem(item) {
  const itemDiv = document.getElementById(`item-${item.id}`);
  itemDiv.innerHTML = createEditFormHtml(item);
  feather.replace();
}

async function cancelEdit(id) {
  const res = await fetch(`${API_BASE_URL}/${id}`);
  const item = await res.json();
  const itemDiv = document.getElementById(`item-${id}`);
  itemDiv.innerHTML = createItemHtml(item);
  feather.replace();
}

function saveEdit(id) {
  const updatedName = document.getElementById(`edit-name-${id}`).value;
  const updatedQuantity = document.getElementById(`edit-quantity-${id}`).value;
  const updatedExpiry = document.getElementById(`edit-expiry-${id}`).value;

  if (!updatedName || !updatedQuantity || !updatedExpiry) {
    showToast("Please fill all fields before saving.", "error");
    return;
  }

  const updatedItem = {
    id: id,
    name: updatedName,
    quantity: parseInt(updatedQuantity),
    expiryDate: new Date(updatedExpiry).toISOString(),
  };

  fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedItem),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to update item.");
      showToast("Item updated successfully!");
      loadItems();
    })
    .catch((err) => console.error("Error updating item:", err));
}

function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) {
    return;
  }

  fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete item.");
      showToast("Item deleted!");
      loadItems();
    })
    .catch((err) => console.error("Error deleting item:", err));
}
