// Replace this with your backend URL deployed on Render
const BACKEND_URL = "https://pacis-link.onrender.com";

const socket = io(BACKEND_URL);

let currentRoom = null;
let username = null;

// Elements
const roomInput = document.getElementById("room");
const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("joinRoomBtn");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

const messagesDiv = document.getElementById("messages");
const fileListDiv = document.getElementById("fileList");
const shareLinkP = document.getElementById("shareLink");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const generateQRBtn = document.getElementById("generateQRBtn");

const qrModal = document.getElementById("qrModal");
const qrBox = document.getElementById("qrcode");

// FIX DOUBLE MESSAGE — only listen once
socket.removeAllListeners("chat-message");
socket.removeAllListeners("file-shared");

// ---------------------- JOIN ROOM ----------------------
joinBtn.addEventListener("click", () => {
  const room = roomInput.value.trim();
  const usr = usernameInput.value.trim();

  if (!room || !usr) return alert("Enter room and name");

  currentRoom = room;
  username = usr;

  socket.emit("join-room", room);

  messageInput.disabled = false;
  sendBtn.disabled = false;
  fileInput.disabled = false;
  uploadBtn.disabled = false;
  generateLinkBtn.disabled = false;
  generateQRBtn.disabled = false;

  messagesDiv.innerHTML = "";
  appendMessage("You joined room: " + room, true);

  fetchFiles();
});

// ---------------------- SEND MESSAGE ----------------------
sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const data = { room: currentRoom, username, message: text };

  socket.emit("chat-message", data);
  appendMessage(username + ": " + text, true);

  messageInput.value = "";
});

// ---------------------- RECEIVE MESSAGE ----------------------
socket.on("chat-message", (data) => {
  if (data.username === username) return; // Prevent duplicates
  appendMessage(`${data.username}: ${data.message}`, false);
});

// ---------------------- FILE UPLOAD ----------------------
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("room", currentRoom);

  try {
    const res = await fetch(`${BACKEND_URL}/api/files/upload`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      appendFile(result.filename, result.fileId);

      socket.emit("file-shared", {
        room: currentRoom,
        filename: result.filename,
        fileId: result.fileId
      });
    } else {
      alert("Upload failed");
    }
  } catch (err) {
    console.error(err);
  }
});

// ---------------------- RECEIVE FILE ----------------------
socket.on("file-shared", (data) => {
  appendFile(data.filename, data.fileId);
});

// ---------------------- FETCH FILES ----------------------
async function fetchFiles() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/files/room/${currentRoom}`);
    const files = await res.json();

    fileListDiv.innerHTML = "";

    files.forEach(f => appendFile(f.filename, f._id));
  } catch (err) {
    console.error(err);
  }
}

// ---------------------- APPEND MESSAGE ----------------------
function appendMessage(text, self = false) {
  const div = document.createElement("div");
  div.classList.add("message");

  if (self) div.classList.add("self");
  else div.classList.add("other");

  div.textContent = text;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ---------------------- APPEND FILE ----------------------
function appendFile(name, id) {
  const link = document.createElement("a");
  link.href = `${BACKEND_URL}/api/files/download/${id}`;
  link.textContent = name;
  link.download = name;
  fileListDiv.appendChild(link);
}

// ---------------------- GENERATE LINK ----------------------
generateLinkBtn.addEventListener("click", () => {
  const url = `${window.location.origin}?room=${currentRoom}`;
  shareLinkP.textContent = "Share this link: " + url;
});

// ---------------------- GENERATE QR ----------------------
generateQRBtn.addEventListener("click", () => {
  const url = `${window.location.origin}?room=${currentRoom}`;

  qrModal.style.display = "flex";
  qrBox.innerHTML = ""; // clear previous QR

  new QRCode(qrBox, {
    text: url,
    width: 220,
    height: 220
  });
});
// ---------------------- AUTO JOIN IF LINK HAS ?room=XYZ ----------------------
window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const autoRoom = params.get("room");

  if (autoRoom) {
    roomInput.value = autoRoom;

    // Pre-fill message area
    appendMessage("Room detected from link: " + autoRoom);
    appendMessage("Enter your name and click JOIN to enter automatically.");

    // Auto scroll
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Optionally auto join fully if username already stored
    const savedName = localStorage.getItem("saved_username");
    if (savedName) {
      usernameInput.value = savedName;
      joinRoomAutomatically(autoRoom, savedName);
    }
  }
});

// Optional helper for auto join
function joinRoomAutomatically(room, usr) {
  currentRoom = room;
  username = usr;

  socket.emit("join-room", room);

  messageInput.disabled = false;
  sendBtn.disabled = false;
  fileInput.disabled = false;
  uploadBtn.disabled = false;
  generateLinkBtn.disabled = false;
  generateQRBtn.disabled = false;

  messagesDiv.innerHTML = "";
  appendMessage("Auto-joined room: " + room);
  fetchFiles();
}

