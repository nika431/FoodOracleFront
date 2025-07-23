const API_BASE_URL = "https://localhost:7249/api/food";
let fp;
let currentSearchQuery = "";
let currentPage = 1;
let pageSize = 5;
let totalPages = 1;
let currentSortBy = "date";
const TOKEN_KEY = "jwtToken";
const token = localStorage.getItem(TOKEN_KEY);

document.addEventListener("DOMContentLoaded", function () {
  fp = flatpickr("#expiryDate", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "F j, Y",
  });

  setupEventListeners();
  if (localStorage.getItem(TOKEN_KEY)) {
    loadItems();
  }
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
      },
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
      .catch((err) => showToast("Error adding item: " + err.message, "error"));
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

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadItems();
    }
  });

  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadItems();
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    updateUI();
    showToast("Logged out successfully!");
  });

  document.getElementById("registerBtn").addEventListener("click", () => {
    document.getElementById("registerForm").style.display = "block";
    document.getElementById("loginForm").style.display = "none";

    const registerBtn = document.getElementById("registerBtn");
    const loginBtn = document.getElementById("loginBtn");

    registerBtn.classList.add("active");
    registerBtn.classList.remove("nonActive");

    loginBtn.classList.add("nonActive");
    loginBtn.classList.remove("active");
  });

  document.getElementById("loginBtn").addEventListener("click", () => {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";

    const registerBtn = document.getElementById("registerBtn");
    const loginBtn = document.getElementById("loginBtn");

    loginBtn.classList.add("active");
    loginBtn.classList.remove("nonActive");

    registerBtn.classList.add("nonActive");
    registerBtn.classList.remove("active");
  });

  document
    .getElementById("submitRegister")
    .addEventListener("click", async () => {
      const usernameInput = document.getElementById("regUsername");
      const passwordInput = document.getElementById("regPassword");

      const username = usernameInput.value;
      const password = passwordInput.value;

      await fetch("https://localhost:7249/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, Password: password }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("This username is already taken.");
          showToast("Registered successfully! Now log in.");
          document.getElementById("registerForm").style.display = "none";
        })
        .catch((err) => {
          showToast(err.message, "error");
        })
        .finally(() => {
          usernameInput.value = "";
          passwordInput.value = "";
        });
    });

  document.getElementById("submitLogin").addEventListener("click", async () => {
    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const res = await fetch("https://localhost:7249/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, Password: password }),
      });
      if (!res.ok) {
        const errorData = await res.json();

        if (res.status === 401) {
          showToast("Incorrect username or password (type better 😑)", "error");
        } else if (res.status === 400) {
          showToast(
            "User not registered (how are you trying to log in without registering?). Please register first.",
            "error"
          );
        } else {
          showToast(errorData.error || "Unknown error occurred", "error");
        }
        return;
      }
      const data = await res.json();

      if (!data.token) throw new Error("Login failed");

      localStorage.setItem(TOKEN_KEY, data.token);

      const loginForm = document.getElementById("loginForm");
      if (loginForm) {
        loginForm.style.display = "none";

        updateUI();
        showToast("Login successful!");
        document.getElementById("logout")?.classList.add("visible-btn");
      }
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      usernameInput.value = "";
      passwordInput.value = "";
    }
  });
}

function handleSearch() {
  currentSearchQuery = document.getElementById("SearchBar").value.trim();
  loadItems();
}

async function loadItems() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      showToast("Please log in to view items.", "error");
      return;
    }

    const url = `${API_BASE_URL}?sortBy=${currentSortBy}&searchQuery=${encodeURIComponent(
      currentSearchQuery
    )}&pageNumber=${currentPage}&pageSize=${pageSize}`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    totalPages = Math.ceil(data.totalCount / pageSize);
    const items = data.items;
    const list = document.getElementById("item-list");
    list.innerHTML = "";

    items.forEach((item) => {
      const itemDiv = document.createElement("div");
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

    document.getElementById(
      "pageIndicator"
    ).textContent = `Page ${currentPage}`;
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;

    prevBtn.classList.toggle("disabled-btn", currentPage === 1);
    nextBtn.classList.toggle("disabled-btn", currentPage >= totalPages);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    showToast(`Failed to load items: ${message}`, "error");
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    },
    body: JSON.stringify(updatedItem),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to update item.");
      showToast("Item updated successfully!");
      loadItems();
    })
    .catch((err) => showToast("Error updating item: " + err.message, "error"));
}

function deleteItem(id) {
  fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete item.");
      showToast("Item deleted!");
      loadItems();
    })
    .catch((err) => showToast("Error deleting item: " + err.message, "error"));
}

function updateUI() {
  const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  document
    .querySelector(".container")
    ?.style.setProperty("display", isLoggedIn ? "block" : "none");
  document
    .getElementById("logoutBtn")
    ?.style.setProperty("display", isLoggedIn ? "inline-block" : "none");
  document
    .getElementById("loginBtn")
    ?.style.setProperty("display", isLoggedIn ? "none" : "inline-block");
  document
    .getElementById("registerBtn")
    ?.style.setProperty("display", isLoggedIn ? "none" : "inline-block");
  document
    .getElementById("authButtons")
    .style.setProperty("display", isLoggedIn ? "none" : "block");
}
