// ========== GLOBALS ==========
const display = document.getElementById("display");
const historyList = document.getElementById("historyList");
let degreeMode = true;
let memory = 0;
let lastAns = 0;
let expression = "";

// ========== HELPERS ==========
if (!Math.log10) Math.log10 = x => Math.log(x) / Math.LN10; // fallback log10

function safeAppendExpr(val) {
    expression += String(val);
}

function sanitizeBeforeEval(expr) {
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    expr = expr.replace(/%/g, '/100');
    expr = expr.replace(/\^/g, '**');

    // Close missing brackets
    let open = (expr.match(/\(/g) || []).length;
    let close = (expr.match(/\)/g) || []).length;
    while (close < open) { expr += ')'; close++; }

    return expr;
}

// ========== INPUT FUNCTIONS ==========
function appendValue(value) {
    display.value += value;
    safeAppendExpr(value);
}

function appendSymbol(displaySymbol, evalValue) {
    display.value += displaySymbol;
    safeAppendExpr(evalValue);
}

function deleteLast() {
    display.value = display.value.slice(0, -1);
    expression = expression.slice(0, -1);
}

function clearDisplay() {
    display.value = "";
    expression = "";
}

// ========== TRIG ==========
function appendTrig(fn) {
    display.value += fn + " ";
    expression += `Math.${fn}(`;
}

// Degree / Radian toggle
function toggleDegRad() {
    degreeMode = !degreeMode;
    const btn = document.getElementById("toggleDegRad");
    btn.textContent = degreeMode ? "DEG" : "RAD";
}

// ========== LOG / LN ==========
function appendLogarithmic(fn) {
    if (fn === 'log') {
        display.value += "log";
        expression += "Math.log10(";
    } else {
        display.value += "ln";
        expression += "Math.log(";
    }
}

// ========== ROOTS ==========
function appendSqrt() {
    display.value += "√";
    expression += "Math.sqrt(";
}

// nth root: x√y (input format: x,y)
function xRoot() {
    try {
        let [x, y] = display.value.split(',').map(Number);
        if (isNaN(x) || isNaN(y)) throw Error();
        const result = Math.pow(y, 1/x);
        display.value = result;
        expression = result.toString();
        addToHistory(`${x}√${y}`, result);
    } catch {
        display.value = "Error";
    }
}

// ========== EXP ==========
function appendExp() {
    display.value += "e^";
    expression += "Math.exp(";
}

// ========== POWER ==========
function appendPower() {
    display.value += "^";
    expression += "^";
}

function square() {
    const e = expression;
    const d = display.value;
    display.value = `${d}²`;
    expression = `(${e})**2`;
}

// reciprocal
function reciprocal() {
    try {
        const n = eval(expression);
        const r = 1 / n;
        display.value = r;
        expression = r.toString();
        addToHistory(`1/(${n})`, r);
    } catch {
        display.value = "Error";
    }
}

// ========== FACTORIAL / PERM / COMB ==========
function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw "Bad input";
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
}

function appendFactorial() {
    display.value += "!";
    expression += "!";
}

function calculateFactorialButton() {
    try {
        const n = eval(expression);
        const res = factorial(n);
        display.value = res;
        expression = res.toString();
        addToHistory(`${n}!`, res);
    } catch {
        display.value = "Error";
    }
}

function nPr(n, r) {
    return factorial(n) / factorial(n - r);
}

function nCr(n, r) {
    return factorial(n) / (factorial(r) * factorial(n - r));
}

function appendPermutation() {
    display.value += "P";
    expression += "P";
}

function appendCombination() {
    display.value += "C";
    expression += "C";
}

// ========== SCI CALC ENGINE ==========
function calculateResult() {
    try {
        const userExp = display.value.trim();
        let expr = sanitizeBeforeEval(expression);

        expr = expr.replace(/(\d+)!/g, (m, n) => `factorial(${n})`);
        expr = expr.replace(/(\d+)P(\d+)/g, (_, n, r) => `nPr(${n},${r})`);
        expr = expr.replace(/(\d+)C(\d+)/g, (_, n, r) => `nCr(${n},${r})`);

        if (degreeMode) {
            expr = expr.replace(/Math\.(sin|cos|tan)\(/g, 'Math.$1(Math.PI/180*');
        }

        let result = eval(expr);

        result = Math.round(result * 1e10) / 1e10;
        if (Math.abs(result) < 1e-10) result = 0;

        lastAns = result;
        addToHistory(userExp, result);

        display.value = result;
        expression = result.toString();
    } catch (e) {
        console.error(e);
        display.value = "Error";
        expression = "";
    }
}

// ========== MEMORY ==========
function memoryAdd() { memory += Number(display.value) || 0; }
function memorySubtract() { memory -= Number(display.value) || 0; }
function memoryRecall() { appendValue(memory); }
function memoryClear() { memory = 0; }

// ========== HISTORY ==========
function addToHistory(exp, result) {
    const entry = `${exp} = ${result}`;

    // Add to screen
    const p = document.createElement("p");
    p.textContent = entry;
    historyList.appendChild(p);
    historyList.scrollTop = historyList.scrollHeight;

    // Save to localStorage
    let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
    history.push(entry);
    localStorage.setItem("calcHistory", JSON.stringify(history));
}

function clearHistory() {
    historyList.innerHTML = "";
    localStorage.removeItem("calcHistory");
}

window.addEventListener("load", () => {
    let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
    history.forEach(entry => {
        const p = document.createElement("p");
        p.textContent = entry;
        historyList.appendChild(p);
    });
});

// ========== KEYBOARD ==========
document.addEventListener("keydown", e => {
    const k = e.key;
    if (/[\d+\-*/().]/.test(k)) appendValue(k);
    else if (k === "Enter") calculateResult();
    else if (k === "Backspace") deleteLast();
    else if (k.toLowerCase() === "c") clearDisplay();
});

// ========== UI PANEL ==========
const historyPanel = document.getElementById("historyPanel");
const calculator = document.querySelector(".calculator");

historyPanel.addEventListener("click", () => {
    historyPanel.classList.add("active");
    calculator.classList.add("behind");
});

calculator.addEventListener("click", () => {
    historyPanel.classList.remove("active");
    calculator.classList.remove("behind");
});

// Theme
const toggleBtn = document.getElementById("toggleBtn");
toggleBtn.addEventListener("click", () => {
    if (document.body.classList.contains("neon")) {
        document.body.classList.replace("neon", "dark");
        toggleBtn.textContent = "🔘";
    } else {
        document.body.classList.replace("dark", "neon");
        toggleBtn.textContent = "⚫";
    }
});
