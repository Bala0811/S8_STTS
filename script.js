// ===============================
// AUTH CHECK
// ===============================

if (!localStorage.getItem("currentUser")) {
    window.location.href = "auth.html";
}

const currentUser = localStorage.getItem("currentUser");
const historyKey = "history_" + currentUser;

// ===============================
// ELEMENTS
// ===============================

let recognition;
let listening = false;

const micBtn = document.getElementById("mic-btn");
const btnText = document.getElementById("btn-text");
const statusText = document.getElementById("status");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const langSelect = document.getElementById("lang-select");
const speakBtn = document.getElementById("speak-btn");
const historyList = document.getElementById("historyList");
const logoutBtn = document.getElementById("logoutBtn");

// ===============================
// LOGOUT
// ===============================

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("currentUser");
        window.location.href = "auth.html";
    });
}

// ===============================
// SPEECH RECOGNITION
// ===============================

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        listening = true;
        micBtn.classList.add("active");
        btnText.innerText = "Listening...";
        statusText.classList.add("active");
    };

    recognition.onresult = async (event) => {

        const transcript = event.results[0][0].transcript;
        inputText.value = transcript;

        try {
            const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(transcript)}`
            );

            const data = await response.json();
            const translatedText = data[0][0][0];
            outputText.value = translatedText;

            saveToHistory(transcript, translatedText);

        } catch {
            outputText.value = "Translation failed.";
        }
    };

    recognition.onend = () => stopListening();
    recognition.onerror = () => stopListening();

} else {
    alert("Speech Recognition not supported. Use Chrome.");
}

// ===============================
// MIC BUTTON
// ===============================

micBtn.addEventListener("click", () => {

    if (!recognition) return;

    if (!listening) {
        recognition.lang = langSelect.value;
        recognition.start();
    } else {
        stopListening();
    }
});

function stopListening() {
    listening = false;
    micBtn.classList.remove("active");
    btnText.innerText = "Start Listening";
    statusText.classList.remove("active");
    if (recognition) recognition.stop();
}

// ===============================
// TEXT TO SPEECH (ENGLISH)
// ===============================

if ('speechSynthesis' in window) {

    speakBtn.addEventListener("click", () => {

        const text = outputText.value;

        if (!text) {
            alert("No translated text to speak.");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    });
}

// ===============================
// HISTORY SYSTEM (CHATGPT STYLE)
// ===============================

function saveToHistory(original, translated) {

    let history = JSON.parse(localStorage.getItem(historyKey)) || [];

    history.unshift({
        original: original,
        translated: translated,
        timestamp: Date.now()
    });

    localStorage.setItem(historyKey, JSON.stringify(history));

    renderHistory();
}

function renderHistory() {

    if (!historyList) return;

    let history = JSON.parse(localStorage.getItem(historyKey)) || [];

    historyList.innerHTML = "";

    const grouped = groupByDate(history);

    Object.keys(grouped).forEach(section => {

        const header = document.createElement("h4");
        header.classList.add("history-section");
        header.innerText = section;
        historyList.appendChild(header);

        grouped[section].forEach(item => {

            const div = document.createElement("div");
            div.classList.add("history-item");

            div.innerHTML = `
                <strong>${truncate(item.original)}</strong>
                <small>${item.translated}</small>
            `;

            div.addEventListener("click", () => {
                inputText.value = item.original;
                outputText.value = item.translated;
            });

            historyList.appendChild(div);
        });
    });
}

// ===============================
// GROUPING LOGIC
// ===============================

function groupByDate(history) {

    const groups = {};
    const now = new Date();

    history.forEach(item => {

        const itemDate = new Date(item.timestamp);
        const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

        let label;

        if (diffDays === 0) {
            label = "Today";
        } else if (diffDays === 1) {
            label = "Yesterday";
        } else if (diffDays <= 7) {
            label = "Previous 7 Days";
        } else {
            label = "Older";
        }

        if (!groups[label]) {
            groups[label] = [];
        }

        groups[label].push(item);
    });

    return groups;
}

// ===============================
// UTIL
// ===============================

function truncate(text) {
    return text.length > 40 ? text.substring(0, 40) + "..." : text;
}

// ===============================
// LOAD HISTORY
// ===============================

renderHistory();