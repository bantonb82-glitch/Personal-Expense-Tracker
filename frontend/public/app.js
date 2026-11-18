const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(n) || 0);
const dateInput = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = new Date();
const currentMonth = dateInput(today).slice(0,7);
let token = localStorage.getItem('pet_token') || '';
let transactions = [], budgets = [], isRegister = false, toastTimer;
$('monthFilter').value = currentMonth; $('budgetMonth').value = currentMonth; $('date').value = dateInput(today);
function toast(message, error = false) { const el = $('toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200); }
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
function setAuthView() { $('authScreen').classList.toggle('hidden', !!token); $('appScreen').classList.toggle('hidden', !token); if (token) loadAll(); }
$('toggleAuth').addEventListener('click', () => {
  isRegister = !isRegister; $('fullNameWrap').classList.toggle('hidden', !isRegister); $('authName').required = isRegister;
  $('authSubmit').textContent = isRegister ? 'Create account' : 'Sign in'; $('toggleAuth').textContent = isRegister ? 'I already have an account' : 'Create account';
  $('authPassword').autocomplete = isRegister ? 'new-password' : 'current-password'; $('authMessage').textContent = isRegister ? 'Use your name, a valid email and a password of at least 8 characters.' : '';
});
$('authForm').addEventListener('submit', async event => {
  event.preventDefault(); $('authSubmit').disabled = true;
  try {
    const payload = { email: $('authEmail').value.trim(), password: $('authPassword').value };
    if (isRegister) payload.fullName = $('authName').value.trim();
    const result = await api(`/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
    token = result.token; localStorage.setItem('pet_token', token); $('authMessage').textContent = ''; $('authForm').reset(); isRegister = false; $('fullNameWrap').classList.add('hidden'); $('authSubmit').textContent = 'Sign in'; $('toggleAuth').textContent = 'Create account'; setAuthView(); toast('Signed in successfully.');
  } catch (error) { $('authMessage').textContent = error.message; } finally { $('authSubmit').disabled = false; }
});
$('logoutBtn').addEventListener('click', () => { token = ''; localStorage.removeItem('pet_token'); transactions = []; budgets = []; setAuthView(); });
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
async function loadAll() {
  if (!token) return;
  const month = $('monthFilter').value || currentMonth; $('budgetMonth').value = month;
  const [summary, tx, budgetRows] = await Promise.all([
    api(`/api/summary?month=${encodeURIComponent(month)}`),
    api(`/api/transactions?from=${month}-01&to=${month}-${new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()}`),
    api(`/api/budgets?month=${encodeURIComponent(month)}`)
  ]);
  $('incomeTotal').textContent = money(summary.income); $('expenseTotal').textContent = money(summary.expense); $('balanceTotal').textContent = money(summary.balance);
  $('balanceTotal').className = `summary-value ${summary.balance < 0 ? 'expense' : 'income'}`; $('transactionCount').textContent = summary.transactions;
  transactions = tx; budgets = budgetRows; renderTransactions(); renderBudgets(); drawChart(summary.byCategory || []);
}
function handleLoadError(error) { toast(error.message, true); if (/sign in|session|expired/i.test(error.message)) $('logoutBtn').click(); }
function renderTransactions() {
  const type = $('typeFilter').value, term = $('searchInput').value.toLowerCase().trim();
  const list = transactions.filter(t => (!type || t.type === type) && [t.title, t.category, t.notes || '', t.paymentMethod || ''].some(v => String(v).toLowerCase().includes(term)));
  $('transactionsBody').innerHTML = list.length ? list.map(t => `<tr><td><div class="transaction-title">${escapeHtml(t.title)}</div>${t.notes ? `<div class="transaction-note">${escapeHtml(t.notes)}</div>` : ''}</td><td><span class="pill">${escapeHtml(t.category)}</span></td><td>${new Date(t.date).toLocaleDateString('en-GB')}</td><td>${escapeHtml(t.paymentMethod || 'Cash')}</td><td class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</td><td><div class="actions"><button class="action-edit" data-edit="${t._id}">Edit</button><button class="danger" data-delete="${t._id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="6" class="empty">No transactions found for this month.</td></tr>';
}
function renderBudgets() {
  $('budgetsList').innerHTML = budgets.length ? budgets.map(b => { const percent = b.limit > 0 ? Math.round(b.spent / b.limit * 100) : 0; const width = Math.min(100, Math.max(0, percent)); return `<article class="budget-item"><div class="budget-top"><span class="budget-name">${escapeHtml(b.category)}</span><button class="action-edit" data-budget-edit="${b._id}">Edit</button></div><div class="budget-numbers">Spent ${money(b.spent)} of ${money(b.limit)}</div><div class="progress"><span class="${percent > 100 ? 'over' : ''}" style="width:${width}%"></span></div><div class="budget-bottom"><span>${percent}% used · ${b.remaining < 0 ? money(-b.remaining) + ' over budget' : money(b.remaining) + ' remaining'}</span><button data-budget-delete="${b._id}">Delete</button></div></article>`; }).join('') : '<p class="empty">No budgets for this month yet.</p>';
}
function drawChart(rows) {
  const canvas = $('categoryChart'), ctx = canvas.getContext('2d'), width = canvas.clientWidth || 600, height = 220, ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio; canvas.height = height * ratio; ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
  if (!rows.length) { ctx.fillStyle = '#718078'; ctx.font = '13px sans-serif'; ctx.fillText('No expense data for this month yet.', 12, 30); return; }
  const max = Math.max(...rows.map(row => row.total), 1), barWidth = Math.max(12, (width - 150) / rows.length - 12);
  rows.forEach((row,index) => { const x = 130 + index * (barWidth + 12), barHeight = row.total / max * 145; ctx.fillStyle = '#56856b'; ctx.fillRect(x,height-35-barHeight,barWidth,barHeight); ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.fillText(String(row.category).slice(0,14),x,height-15); });
}
function openTransaction(item) {
  $('transactionForm').classList.remove('hidden'); $('transactionId').value = item?._id || ''; $('title').value = item?.title || ''; $('amount').value = item?.amount || ''; $('type').value = item?.type || 'expense'; $('category').value = item?.category || 'Food';
  $('date').value = item ? dateInput(new Date(item.date)) : dateInput(new Date()); $('paymentMethod').value = item?.paymentMethod || 'Cash'; $('notes').value = item?.notes || ''; $('saveBtn').textContent = item ? 'Update transaction' : 'Save transaction'; $('transactionPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeTransaction() { $('transactionForm').classList.add('hidden'); $('transactionForm').reset(); $('transactionId').value = ''; $('date').value = dateInput(new Date()); $('saveBtn').textContent = 'Save transaction'; }
$('newTransactionBtn').addEventListener('click', () => openTransaction()); $('cancelBtn').addEventListener('click', closeTransaction);
$('typeFilter').addEventListener('change', renderTransactions); $('searchInput').addEventListener('input', renderTransactions); $('monthFilter').addEventListener('change', () => loadAll().catch(handleLoadError));
$('transactionForm').addEventListener('submit', async event => {
  event.preventDefault(); const id = $('transactionId').value, payload = { title: $('title').value, amount: Number($('amount').value), type: $('type').value, category: $('category').value, date: $('date').value, paymentMethod: $('paymentMethod').value, notes: $('notes').value };
  try { await api(id ? `/api/transactions/${id}` : '/api/transactions', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); toast(id ? 'Transaction updated.' : 'Transaction saved to MongoDB.'); closeTransaction(); $('monthFilter').value = payload.date.slice(0,7); await loadAll(); } catch (error) { toast(error.message, true); }
});
$('transactionsBody').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (edit) { const item = transactions.find(t => t._id === edit.dataset.edit); if (item) openTransaction(item); }
  if (remove && confirm('Permanently delete this transaction?')) { try { await api(`/api/transactions/${remove.dataset.delete}`, { method: 'DELETE' }); toast('Transaction deleted.'); await loadAll(); } catch (error) { toast(error.message, true); } }
});
$('toggleBudgetBtn').addEventListener('click', () => { $('budgetForm').classList.toggle('hidden'); $('budgetId').value = ''; $('budgetMonth').value = $('monthFilter').value; $('saveBudgetBtn').textContent = 'Save budget'; });
$('cancelBudgetBtn').addEventListener('click', () => { $('budgetForm').classList.add('hidden'); $('budgetForm').reset(); });
$('budgetForm').addEventListener('submit', async event => {
  event.preventDefault(); const id = $('budgetId').value, payload = { category: $('budgetCategory').value, limit: Number($('budgetLimit').value), month: $('budgetMonth').value };
  try { await api(id ? `/api/budgets/${id}` : '/api/budgets', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); toast('Budget saved to MongoDB.'); $('budgetForm').classList.add('hidden'); $('monthFilter').value = payload.month; await loadAll(); } catch (error) { toast(error.message, true); }
});
$('budgetsList').addEventListener('click', async event => {
  const edit = event.target.closest('[data-budget-edit]'), remove = event.target.closest('[data-budget-delete]');
  if (edit) { const budget = budgets.find(b => b._id === edit.dataset.budgetEdit); if (budget) { $('budgetForm').classList.remove('hidden'); $('budgetId').value = budget._id; $('budgetCategory').value = budget.category; $('budgetLimit').value = budget.limit; $('budgetMonth').value = budget.month; $('saveBudgetBtn').textContent = 'Update budget'; } }
  if (remove && confirm('Delete this budget?')) { try { await api(`/api/budgets/${remove.dataset.budgetDelete}`, { method: 'DELETE' }); toast('Budget deleted.'); await loadAll(); } catch (error) { toast(error.message, true); } }
});
setAuthView();
  
