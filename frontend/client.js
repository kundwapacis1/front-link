// --- Auto-detect backend URL (Render will provide the host)
const BACKEND_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:5000'
  : 'https://pacis-link.onrender.com'; // replace with your Render URL

// --- Socket.io setup
const socket = io(BACKEND_URL);

// --- DOM elements
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

// --- Join room
joinBtn.addEventListener('click', async () => {
  currentRoom = roomInput.value || 'lobby';
  socket.emit('join-room', currentRoom);

  // Load previous messages
  const resText = await fetch(`${BACKEND_URL}/api/text/list?room=${currentRoom}`);
  const texts = await resText.json();
  messagesDiv.innerHTML = '';
  texts.reverse().forEach(t => addMessage(t.sender, t.content));

  // Load files
  const resFiles = await fetch(`${BACKEND_URL}/api/files`);
  const files = await resFiles.json();
  fileList.innerHTML = '';
  files.forEach(f => addFile(f.originalName, `${BACKEND_URL}${f.url}`));
});

// --- Send text
sendBtn.addEventListener('click', async () => {
  const sender = nameInput.value || 'Anonymous';
  const content = messageInput.value.trim();
  if (!content) return;

  // Emit socket message
  socket.emit('chat-message', { room: currentRoom, sender, message: content });

  // Show locally
  addMessage('You', content);
  messageInput.value = '';

  // Save to backend
  await fetch(`${BACKEND_URL}/api/text/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: currentRoom, sender, content })
  });
});

// --- Receive text
socket.on('chat-message', data => {
  addMessage(data.sender, data.message);
});

// --- Upload file
uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) return alert('Select a file');
  
  const form = new FormData();
  form.append('file', fileInput.files[0]);

  const res = await fetch(`${BACKEND_URL}/api/files/upload`, {
    method: 'POST',
    body: form
  });

  const fileMeta = await res.json();

  // Emit socket event
  socket.emit('file-shared', { room: currentRoom, ...fileMeta });

  // Show in UI
  addFile(fileMeta.originalName, `${BACKEND_URL}${fileMeta.url}`);
  fileInput.value = '';
});

// --- Receive file
socket.on('file-shared', file => {
  addFile(file.originalName, `${BACKEND_URL}${file.url}`);
});

// --- Helper functions
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
  a.download = name; // force download when clicked
  li.appendChild(a);
  fileList.prepend(li);
}
