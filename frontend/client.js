// ===============================
// BACKEND URL (Render)
// ===============================
const BACKEND_URL = "https://pacis-link.onrender.com";

const socket = io(BACKEND_URL);

let currentRoom = null;
let username = null;

// ===============================
// ELEMENTS
// ===============================
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

// Prevent duplicate events
socket.removeAllListeners("chat-message");
socket.removeAllListeners("file-shared");

// ===============================
// JOIN ROOM
// ===============================
function completeRoomJoin(room, usr) {
  currentRoom = room;
  username = usr;

  localStorage.setItem("saved_username", usr);

  socket.emit("join-room", room);

  // Enable UI
  messageInput.disabled = false;
  sendBtn.disabled = false;
  fileInput.disabled = false;
  uploadBtn.disabled = false;
  generateLinkBtn.disabled = false;
  generateQRBtn.disabled = false;

  messagesDiv.innerHTML = "";
  appendMessage(`Joined room: ${room}`, true);

  fetchFiles();
}

// Manual join button
joinBtn.addEventListener("click", () => {
  const room = roomInput.value.trim();
  const usr = usernameInput.value.trim();

  if (!room || !usr) return alert("Enter room and name");

  completeRoomJoin(room, usr);
});

// ===============================
// AUTO-JOIN IF LINK HAS ?room=ID
// ===============================
window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const autoRoom = params.get("room");

  if (!autoRoom) return;

  roomInput.value = autoRoom;

  let savedName = localStorage.getItem("saved_username");

  if (!savedName) {
    appendMessage("Room detected: " + autoRoom);
    appendMessage("Enter your name to auto-join.");
    return;
  }

  usernameInput.value = savedName;

  // AUTO JOIN instantly
  completeRoomJoin(autoRoom, savedName);
});

// ===============================
// SEND MESSAGE
// ===============================
sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat-message", {
    room: currentRoom,
    username,
    message: text
  });

  appendMessage(`${username}: ${text}`, true);
  messageInput.value = "";
});

// Receive messages
socket.on("chat-message", (data) => {
  if (data.username === username) return; // prevent double
  appendMessage(`${data.username}: ${data.message}`);
});

// ===============================
// FILE UPLOAD
// ===============================
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("room", currentRoom);

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
  }
});

// Receive shared file
socket.on("file-shared", (data) => {
  appendFile(data.filename, data.fileId);
});

// ===============================
// FETCH FILES
// ===============================
async function fetchFiles() {
  const res = await fetch(`${BACKEND_URL}/api/files/room/${currentRoom}`);
  const files = await res.json();

  fileListDiv.innerHTML = "";
  files.forEach((f) => appendFile(f.filename, f._id));
}

// ===============================
// HELPERS
// ===============================
function appendMessage(text, self = false) {
  const div = document.createElement("div");
  div.classList.add("message", self ? "self" : "other");
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendFile(name, id) {
  const link = document.createElement("a");
  link.href = `${BACKEND_URL}/api/files/download/${id}`;
  link.textContent = name;
  link.download = name;
  fileListDiv.appendChild(link);
}

// ===============================
// SHARE LINK
// ===============================
generateLinkBtn.addEventListener("click", () => {
  const url = `${window.location.origin}?room=${currentRoom}`;
  shareLinkP.textContent = "Share this link: " + url;
});

// ===============================
// QR CODE
// ===============================
generateQRBtn.addEventListener("click", () => {
  const url = `${window.location.origin}?room=${currentRoom}`;
  qrModal.style.display = "flex";

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: url,
    width: 220,
    height: 220
  });
});
