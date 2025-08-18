const API_BASE_URL = "https://localhost:7249/api/food";
let fp;
let currentSearchQuery = "";
let currentPage = 1;
let pageSize = 5;
let totalPages = 1;
let currentSortBy = "date";
const TOKEN_KEY = "jwtToken";
let currentUsername = "";
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
const token = getToken();

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
    const token = getToken();
    if (!name || !quantity || !date) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    const item = {
      Name: name,
      Quantity: parseInt(quantity),
      ExpiryDate: new Date(date).toISOString(),
    };
    fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
}
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
  document.querySelector(".usersList").style.display = "none";
  document.getElementById("showUsersBtn").textContent = "Show Users";
  updateUI();
  showToast("Logged out successfully!");
  document.getElementById("greeting").style.display = "none";
  document.querySelector(".inspectUsersInventory").style.display = "none";
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

    currentUsername = usernameInput.value;
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
        registerBtn.classList.add("nonActive");
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
    localStorage.setItem("customerId", data.customerId);
    localStorage.setItem("username", username);

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.style.display = "none";
      updateUI();
      loadItems();
      showToast("Login successful!");

      document.getElementById("logout")?.classList.add("visible-btn");
      document.getElementById("greeting").style.display = "block";
      document.getElementById("greeting").classList.add("h1Active");
      document.getElementById(
        "greeting"
      ).textContent = `Welcome back, ${username}!`;
      loginBtn.classList.add("nonActive");
    }
  } catch (err) {
    showToast(err.message || "Something went wrong", "error");
  } finally {
    usernameInput.value = "";
    passwordInput.value = "";
  }
});
document.getElementById("showUsersBtn").addEventListener("click", async () => {
  const showUsersBtn = document.getElementById("showUsersBtn");
  const usersList = document.querySelector(".usersList");
  const usersListUI = document.getElementById("userListItems");
  const token = getToken();

  if (showUsersBtn.textContent === "Show Users") {
    usersList.style.display = "block";
    showUsersBtn.textContent = "Hide Users";

    try {
      const res = await fetch("https://localhost:7249/api/user/all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch users.");

      const users = await res.json();
      usersListUI.innerHTML = "";

      const currentUserId = localStorage.getItem("customerId");

      const currentUser = users.find((u) => u.id == currentUserId);
      if (currentUser) {
        const li = document.createElement("li");
        li.classList.add("user-item", "current-user");
        li.textContent = "You";
        usersListUI.appendChild(li);
      }

      users
        .filter((u) => u.id != currentUserId)
        .forEach((user) => {
          const li = document.createElement("li");
          li.classList.add("user-item");

          const nameSpan = document.createElement("span");
          nameSpan.textContent = user.username;

          const inspectBtn = document.createElement("button");
          inspectBtn.textContent = "Inspect";
          inspectBtn.className = "inspectBtn";
          inspectBtn.dataset.username = user.username;

          li.appendChild(nameSpan);
          li.appendChild(inspectBtn);
          usersListUI.appendChild(li);

          attachInspectListener(inspectBtn, user.id, user.username);
        });
    } catch (err) {
      showToast("Error fetching users: " + err.message, "error");
    }
  } else {
    usersList.style.display = "none";
    showUsersBtn.textContent = "Show Users";
  }
});
function handleSearch() {
  currentSearchQuery = document.getElementById("SearchBar").value.trim();
  loadItems();
}

async function loadItems() {
  try {
    const token = getToken();
    if (!token || !isTokenValid(token)) {
      console.warn("No valid token — redirecting to login");
      window.location.href = "#/login";
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
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "#/login";
        return;
      }
      throw new Error(`Failed to load items. Status: ${res.status}`);
    }
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
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error(`Failed to fetch item ${id}. Status: ${res.status}`);
    return;
  }

  const item = await res.json();
  const itemDiv = document.getElementById(`item-${id}`);
  itemDiv.innerHTML = createItemHtml(item);
  feather.replace();
}

function saveEdit(id) {
  const updatedName = document.getElementById(`edit-name-${id}`).value;
  const updatedQuantity = document.getElementById(`edit-quantity-${id}`).value;
  const updatedExpiry = document.getElementById(`edit-expiry-${id}`).value;
  const token = getToken();

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
      Authorization: `Bearer ${token}`,
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
  const token = getToken();
  fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
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
  document
    .querySelector(".show-users")
    ?.style.setProperty("display", isLoggedIn ? "block" : "none");
}
function isTokenValid(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    const now = Date.now() / 1000;
    return payload.exp && payload.exp > now;
  } catch (err) {
    return false;
  }
}

function attachInspectListener(inspectBtn, userId, username) {
  inspectBtn.addEventListener("click", async () => {
    const inventoryContainer = document.querySelector(".inspectUsersInventory");
    const headerContainer = document.createElement("div");
    headerContainer.style.display = "flex";
    headerContainer.style.alignItems = "center";
    headerContainer.style.justifyContent = "space-between";

    const inspectUsersH3 = document.createElement("h3");
    inspectUsersH3.id = "inspectUsersBtn";
    inspectUsersH3.textContent = `${username}'s Inventory`;

    const quit = document.createElement("button");
    quit.textContent = "quit";
    quit.addEventListener("click", () => {
      inventoryContainer.style.display = "none";
      document.querySelector(".container").style.display = "block";
    });
    headerContainer.appendChild(inspectUsersH3);
    headerContainer.appendChild(quit);

    inventoryContainer.innerHTML = "";
    inventoryContainer.appendChild(headerContainer);
    inventoryContainer.style.display = "block";
    document.querySelector(".container").style.display = "none";
    const token = getToken();
    try {
      const res = await fetch("https://localhost:7249/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Username: username, UserId: userId }),
      });
      if (!res.ok) {
        showToast("Failed to fetch user's inventory.", "error");
        return;
      }
      const userArr = await res.json();
      const user = Array.isArray(userArr) ? userArr[0] : userArr;
      const inventory = user?.foodItems || [];
      let inspectUsersInventoryList = document.createElement("div");
      inspectUsersInventoryList.id = "inspectUsersInventoryList";
      inventoryContainer.appendChild(inspectUsersInventoryList);

      if (!inspectUsersInventoryList) {
        console.error("Element #inspectUsersInventoryList not found!");
        return;
      }

      inspectUsersInventoryList.innerHTML = "";
      inventory.forEach((item) => {
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
        itemDiv.classList.add(statusClass);

        const itemInfoDiv = document.createElement("div");
        itemInfoDiv.className = "item-info";
        const expiryDate = new Date(item.expiryDate).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
        itemInfoDiv.innerHTML = `
          <p class="item-name">${item.name}</p>
          <p><strong>Quantity:</strong> ${item.quantity}</p>
          <p><strong>Expiry Date:</strong> ${expiryDate}</p>
        `;
        itemDiv.appendChild(itemInfoDiv);
        inspectUsersInventoryList.appendChild(itemDiv);
      });
    } catch (err) {
      console.error(err);
      showToast("Error loading inventory", "error");
    }
  });
}
