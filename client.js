// Frontend config
const CONFIG = {
  SERVER_URL: 'https://pacis-link.onrender.com' // <-- Change to your Render backend URL
};

const socket = io(`${CONFIG.SERVER_URL}`);

const roomInput = document.getElementById('room');
const joinBtn = document.getElementById('joinBtn');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('sendBtn');
const nameInput = document.getElementById('name');
const messageInput = document.getElementById('message');

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileList = document.getElementById('files');

let currentRoom = 'lobby';

// --- Join Room
joinBtn.addEventListener('click', async () => {
  currentRoom = roomInput.value || 'lobby';
  socket.emit('join-room', currentRoom);

  // Load chat messages
  const resText = await fetch(`${CONFIG.SERVER_URL}/api/text/list?room=${currentRoom}`);
  const texts = await resText.json();
  messagesDiv.innerHTML = '';
  texts.reverse().forEach(t => addMessage(t.sender, t.content));

  // Load files
  const resFiles = await fetch(`${CONFIG.SERVER_URL}/api/files`);
  const files = await resFiles.json();
  fileList.innerHTML = '';
  files.forEach(f => addFile(f.originalName, `${CONFIG.SERVER_URL}${f.url}`));
});

// --- Send Message
sendBtn.addEventListener('click', async () => {
  const sender = nameInput.value || 'Anonymous';
  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit('chat-message', { room: currentRoom, sender, message });
  addMessage('You', message);
  messageInput.value = '';

  await fetch(`${CONFIG.SERVER_URL}/api/text/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, content: message, room: currentRoom })
  });
});

// --- Receive message
socket.on('chat-message', data => addMessage(data.sender, data.message));

// --- Upload File
uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) return alert('Select a file');
  const form = new FormData();
  form.append('file', fileInput.files[0]);

  const res = await fetch(`${CONFIG.SERVER_URL}/api/files/upload`, {
    method: 'POST',
    body: form
  });

  const fileMeta = await res.json();
  socket.emit('file-shared', { room: currentRoom, ...fileMeta });
  addFile(fileMeta.originalName, `${CONFIG.SERVER_URL}${fileMeta.url}`);
  fileInput.value = '';
});

// --- Receive file
socket.on('file-shared', file => {
  addFile(file.originalName, `${CONFIG.SERVER_URL}${file.url}`);
});

// --- Helper Functions
function addMessage(sender, message) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${message}`;
  messagesDiv.prepend(div);
}

function addFile(name, url) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = url;
  a.textContent = name;
  a.download = name;
  li.appendChild(a);
  fileList.prepend(li);
}
