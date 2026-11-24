// StudentSpend — Expense Tracker (Local Storage, no backend)
const CATEGORY_META = {
    Food:      { icon: "🍔", cls: "food" },
    Transport: { icon: "🚌", cls: "travel" },
    Education: { icon: "📚", cls: "study" },
    Shopping:  { icon: "🛍️", cls: "shopping" },
    Other:     { icon: "💸", cls: "other" }
};

const DEFAULT_DATA = {
    budget: 5000,
    expenses: [
        { name: "Mobile Recharge", amount: 200, category: "Other",     date: "" },
        { name: "Textbooks",       amount: 450, category: "Education", date: "" },
        { name: "Auto Fare",       amount: 90,  category: "Transport", date: "" },
        { name: "Snacks",          amount: 110, category: "Food",      date: "" },
        { name: "Stationery",      amount: 140, category: "Education", date: "" },
        { name: "Coffee",          amount: 130, category: "Food",      date: "" },
        { name: "Movie Ticket",    amount: 110, category: "Other",     date: "" },
        { name: "Charger Cable",   amount: 100, category: "Shopping",  date: "" },
        { name: "Lunch",    amount: 100, category: "Food",      date: "" },
        { name: "Bus Fare", amount: 50,  category: "Transport", date: "" },
        { name: "Notebook", amount: 120, category: "Education", date: "" },
        { name: "Shopping", amount: 250, category: "Shopping",  date: "" }
    ],
    dark: false
};

let data = loadData();

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem("studentspend_data"));
        if (saved && typeof saved.budget === "number" && Array.isArray(saved.expenses)) return saved;
    } catch (e) { /* fall through to defaults */ }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function saveData() { localStorage.setItem("studentspend_data", JSON.stringify(data)); }

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const totalSpent = () => data.expenses.reduce((s, e) => s + Number(e.amount), 0);

// ---------- Navigation ----------
const VIEW_TITLES = { dashboard: "Dashboard", add: "Add Expense", transactions: "Transactions", analytics: "Analytics", settings: "Settings" };
function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + name).classList.remove("hidden");
    document.querySelectorAll(".sidebar nav a").forEach(a => a.classList.toggle("active", a.dataset.view === name));
    document.getElementById("viewTitle").textContent = VIEW_TITLES[name];
    render();
}
document.querySelectorAll(".sidebar nav a").forEach(a => {
    a.addEventListener("click", e => { e.preventDefault(); showView(a.dataset.view); });
});
document.getElementById("viewAllLink").addEventListener("click", e => { e.preventDefault(); showView("transactions"); });

// ---------- Rendering ----------
function transactionHTML(exp, index, showDelete) {
    const meta = CATEGORY_META[exp.category] || CATEGORY_META.Other;
    const dateTxt = exp.date ? " • " + exp.date : "";
    return `<div class="transaction">
        <div class="transaction-icon ${meta.cls}">${meta.icon}</div>
        <div class="transaction-details"><strong>${escapeHTML(exp.name)}</strong><small>${exp.category}${dateTxt}</small></div>
        <span class="amount">-${fmt(exp.amount)}</span>
        ${showDelete ? `<button class="delete-btn" data-del="${index}">Delete</button>` : ""}
    </div>`;
}
function escapeHTML(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function render() {
    const spent = totalSpent();
    const remaining = data.budget - spent;
    const pct = data.budget > 0 ? Math.min(100, Math.round(spent / data.budget * 100)) : 0;

    // Cards
    document.getElementById("statBudget").textContent = fmt(data.budget);
    document.getElementById("statSpent").textContent = fmt(spent);
    const remEl = document.getElementById("statRemaining");
    remEl.textContent = fmt(remaining);
    remEl.classList.toggle("red", remaining < 0);
    remEl.classList.toggle("green", remaining >= 0);
    document.getElementById("statCount").textContent = data.expenses.length;
    document.getElementById("currentBudgetLabel").textContent = fmt(data.budget);

    // Budget panel
    document.getElementById("monthLabel").textContent = new Date().toLocaleString("en-IN", { month: "long" });
    document.getElementById("budgetSpentLabel").textContent = fmt(spent) + " spent";
    document.getElementById("budgetTotalLabel").textContent = fmt(data.budget) + " budget";
    const fill = document.getElementById("progressFill");
    fill.style.width = pct + "%";
    fill.className = "progress-fill" + (remaining < 0 ? " over" : pct >= 80 ? " warn" : "");
    document.getElementById("budgetMessage").textContent = remaining < 0
        ? `⚠️ Budget cross ho gaya! ${fmt(-remaining)} extra kharch ho gaya hai.`
        : `You have ${fmt(remaining)} left for this month. (${pct}% used)`;
    document.getElementById("tipText").textContent = remaining < 0
        ? "Budget cross ho gaya hai — non-essential kharch rok do aur bache hue mahine ka plan banao."
        : "Small daily savings can make a big difference. Track every expense and try to save 10% of your monthly budget.";

    // Recent (last 4, newest first)
    const recent = data.expenses.slice(-4).reverse();
    document.getElementById("recentList").innerHTML = recent.length
        ? recent.map(e => transactionHTML(e, -1, false)).join("")
        : `<p class="empty-msg">No expenses yet. Add your first expense!</p>`;

    // All transactions (with search + filter)
    const q = (document.getElementById("searchInput").value || "").toLowerCase();
    const f = document.getElementById("filterCategory").value;
    const rows = data.expenses.map((e, i) => ({ e, i })).reverse()
        .filter(({ e }) => (f === "All" || e.category === f) && e.name.toLowerCase().includes(q));
    document.getElementById("allList").innerHTML = rows.length
        ? rows.map(({ e, i }) => transactionHTML(e, i, true)).join("")
        : `<p class="empty-msg">No transactions found.</p>`;
    document.getElementById("txnCountLabel").textContent = data.expenses.length + " total";
    document.querySelectorAll("[data-del]").forEach(btn => {
        btn.addEventListener("click", () => {
            data.expenses.splice(Number(btn.dataset.del), 1);
            saveData(); render();
        });
    });

    // Analytics
    const cats = Object.keys(CATEGORY_META);
    const sums = {}; cats.forEach(c => sums[c] = 0);
    data.expenses.forEach(e => { if (sums[e.category] !== undefined) sums[e.category] += Number(e.amount); });
    const maxSum = Math.max(1, ...Object.values(sums));
    document.getElementById("categoryBars").innerHTML = cats.map(c => `
        <div class="cat-row">
            <div class="cat-row-head"><span>${CATEGORY_META[c].icon} ${c}</span><strong>${fmt(sums[c])}</strong></div>
            <div class="cat-bar"><div class="cat-fill" style="width:${Math.round(sums[c] / maxSum * 100)}%"></div></div>
        </div>`).join("");
    document.getElementById("analyticsTotal").textContent = "Total: " + fmt(spent);
    const top = cats.reduce((a, b) => sums[b] > sums[a] ? b : a, cats[0]);
    document.getElementById("topCategory").textContent = spent ? `${top} (${fmt(sums[top])})` : "—";
    document.getElementById("usedPercent").textContent = pct + "%";
    document.getElementById("avgExpense").textContent = data.expenses.length ? fmt(Math.round(spent / data.expenses.length)) : "₹0";

    // Dark mode
    document.body.classList.toggle("dark", !!data.dark);
    document.getElementById("darkToggle").textContent = data.dark ? "☀️ Turn Off" : "🌙 Turn On";
}

// ---------- Forms ----------
document.getElementById("budgetForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = Number(document.getElementById("budgetInput").value);
    if (v > 0) { data.budget = v; saveData(); render(); document.getElementById("budgetInput").value = ""; }
});

document.getElementById("expenseForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("expName").value.trim();
    const amount = Number(document.getElementById("expAmount").value);
    const category = document.getElementById("expCategory").value;
    const date = document.getElementById("expDate").value;
    if (!name || !(amount > 0)) return;
    data.expenses.push({ name, amount, category, date });
    saveData(); render();
    e.target.reset();
    const msg = document.getElementById("addSuccess");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2500);
});

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("filterCategory").addEventListener("change", render);

document.getElementById("darkToggle").addEventListener("click", () => { data.dark = !data.dark; saveData(); render(); });
document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Pakka? Saare expenses aur budget reset ho jayega.")) {
        data = JSON.parse(JSON.stringify(DEFAULT_DATA)); saveData(); render();
    }
});

// First render
document.getElementById("expDate").value = new Date().toISOString().slice(0, 10);
render();
