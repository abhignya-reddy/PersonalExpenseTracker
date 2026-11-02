
const SUPABASE_URL = "https://vindffdesqojflckiiyx.supabase.co";
const SUPABASE_KEY = "sb_publishable_Sqtipxp9-l0z8SVnMwNuRg_MxV-pZal";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let expenses = [];
let isSignup = false;
let editingId = null;

document.addEventListener("DOMContentLoaded", async function () {

    const authForm = document.getElementById("authForm");
    const authHeading = document.getElementById("authHeading");
    const authButton = document.getElementById("authButton");
    const switchAuth = document.getElementById("switchAuth");
    const authMessage = document.getElementById("authMessage");

    const authSection = document.getElementById("authSection");
    const trackerSection = document.getElementById("trackerSection");
    const userEmail = document.getElementById("userEmail");
    const logoutButton = document.getElementById("logoutButton");

    const form = document.getElementById("expenseForm");
    const nameInput = document.getElementById("expenseName");
    const amountInput = document.getElementById("amount");
    const categoryInput = document.getElementById("category");
    const dateInput = document.getElementById("date");

    const expenseList = document.getElementById("expenseList");
    const totalDisplay = document.getElementById("total");
    const categoryFilter = document.getElementById("categoryFilter");
    const monthFilter = document.getElementById("monthFilter");
    const monthlyTotal = document.getElementById("monthlyTotal");

    const dashboardTotal = document.getElementById("dashboardTotal");
    const dashboardMonthly = document.getElementById("dashboardMonthly");
    const transactionCount = document.getElementById("transactionCount");

    const today = new Date();
    const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    monthFilter.value = todayString.slice(0, 7);
    dateInput.value = todayString;

    // Switch between login and signup
    switchAuth.addEventListener("click", function () {
        isSignup = !isSignup;

        authHeading.textContent = isSignup ? "Sign Up" : "Login";
        authButton.textContent = isSignup ? "Create Account" : "Login";

        switchAuth.textContent = isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Sign up";

        authMessage.textContent = "";
    });

    // Signup and login
    authForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        authButton.disabled = true;
        authMessage.textContent = "Please wait...";

        try {
            let result;

            if (isSignup) {
                result = await supabaseClient.auth.signUp({
                    email: email,
                    password: password
                });
            } else {
                result = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
            }

            if (result.error) {
                throw result.error;
            }

            if (isSignup && !result.data.session) {
                authMessage.textContent =
                    "Account created! Please verify your email, then log in.";
                return;
            }

            authMessage.textContent = "Login successful!";
            await showTracker(result.data.user);

        } catch (error) {
            authMessage.textContent = error.message;
        } finally {
            authButton.disabled = false;
        }
    });

    // Logout
    logoutButton.addEventListener("click", async function () {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert(error.message);
            return;
        }

        expenses = [];
        trackerSection.hidden = true;
        authSection.hidden = false;
        authForm.reset();
        authMessage.textContent = "You have logged out.";
    });

    async function showTracker(user) {
        authSection.hidden = true;
        trackerSection.hidden = false;
        userEmail.textContent = user.email;

        await loadExpenses();
    }

    // Load expenses belonging to the logged-in user
    async function loadExpenses() {
        const { data, error } = await supabaseClient
            .from("expenses")
            .select("*")
            .order("expense_date", { ascending: false });

        if (error) {
            alert("Could not load expenses: " + error.message);
            return;
        }

        expenses = data.map(function (item) {
            return {
                id: item.id,
                name: item.title,
                amount: Number(item.amount),
                category: item.category,
                date: item.expense_date
            };
        });

        refreshDisplay();
    }

    function updateMonthlyTotal() {
        const total = expenses
            .filter(expense => expense.date.startsWith(monthFilter.value))
            .reduce((sum, expense) => sum + expense.amount, 0);

        monthlyTotal.textContent = total.toFixed(2);
    }

    function updateDashboard() {
        const total = expenses.reduce(
            (sum, expense) => sum + expense.amount, 0
        );

        const monthly = expenses
            .filter(expense => expense.date.startsWith(monthFilter.value))
            .reduce((sum, expense) => sum + expense.amount, 0);

        dashboardTotal.textContent = total.toFixed(2);
        dashboardMonthly.textContent = monthly.toFixed(2);
        transactionCount.textContent = expenses.length;
    }

    function displayExpenses() {
        expenseList.innerHTML = "";

        let visibleTotal = 0;

        expenses.forEach(function (expense) {
            if (
                categoryFilter.value !== "All" &&
                expense.category !== categoryFilter.value
            ) {
                return;
            }

            const row = document.createElement("tr");

            [
                expense.name,
                expense.amount.toFixed(2),
                expense.category,
                expense.date
            ].forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", function () {
                nameInput.value = expense.name;
                amountInput.value = expense.amount;
                categoryInput.value = expense.category;
                dateInput.value = expense.date;

                editingId = expense.id;
                document.getElementById("expenseSubmit").textContent =
                    "Update Expense";

                form.scrollIntoView({ behavior: "smooth" });
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async function () {
                if (!confirm("Delete this expense?")) return;

                const { error } = await supabaseClient
                    .from("expenses")
                    .delete()
                    .eq("id", expense.id);

                if (error) {
                    alert(error.message);
                    return;
                }

                await loadExpenses();
            });

            actionCell.append(editButton, deleteButton);
            row.appendChild(actionCell);
            expenseList.appendChild(row);

            visibleTotal += expense.amount;
        });

        totalDisplay.textContent = visibleTotal.toFixed(2);
    }

    function refreshDisplay() {
        displayExpenses();
        updateMonthlyTotal();
        updateDashboard();
    }

    // Add or update expense
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = nameInput.value.trim();
        const amount = Number(amountInput.value);
        const category = categoryInput.value;
        const date = dateInput.value;

        if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
            alert("Please enter valid expense details.");
            return;
        }

        const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

if (userError || !userData.user) {
    alert("Please log in again.");
    return;
}

const expenseData = {
    user_id: userData.user.id,
    title: name,
    amount: amount,
    category: category,
    expense_date: date
};

        const submitButton = document.getElementById("expenseSubmit");
        submitButton.disabled = true;

        try {
            let result;

            if (editingId !== null) {
                result = await supabaseClient
                    .from("expenses")
                    .update(expenseData)
                    .eq("id", editingId);
            } else {
                result = await supabaseClient
                    .from("expenses")
                    .insert(expenseData);
            }

            if (result.error) throw result.error;

            editingId = null;
            form.reset();
            dateInput.value = todayString;
            submitButton.textContent = "Add Expense";

            await loadExpenses();

        } catch (error) {
            alert("Could not save expense: " + error.message);
        } finally {
            submitButton.disabled = false;
        }
    });

    categoryFilter.addEventListener("change", displayExpenses);

    monthFilter.addEventListener("change", function () {
        updateMonthlyTotal();
        updateDashboard();
    });

    // Restore an existing login session
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        authMessage.textContent = error.message;
    } else if (data.session) {
        await showTracker(data.session.user);
    }
});
