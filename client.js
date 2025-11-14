const socket = io(); // connects automatically to the backend server

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
const API_URL = window.location.origin; // dynamic backend URL

// --- Join room
joinBtn.onclick = async () => {
  currentRoom = roomInput.value || 'lobby';
  socket.emit('join-room', currentRoom);

  // Load previous messages
  const resText = await fetch(`${API_URL}/api/text/list?room=${currentRoom}`);
  const texts = await resText.json();
  messagesDiv.innerHTML = '';
  texts.reverse().forEach(t => addMessage(t.sender, t.content));

  // Load files
  const resFiles = await fetch(`${API_URL}/api/files`);
  const files = await resFiles.json();
  fileList.innerHTML = '';
  files.forEach(f => addFile(f.originalName, `${API_URL}${f.url}`));
};

// --- Send text
sendBtn.onclick = async () => {
  const sender = nameInput.value || 'Anonymous';
  const content = messageInput.value.trim();
  if (!content) return;

  socket.emit('chat-message', { room: currentRoom, sender, message: content });
  addMessage('You', content);

  await fetch(`${API_URL}/api/text/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, room: currentRoom, sender })
  });

  messageInput.value = '';
};

// --- Receive text
socket.on('chat-message', data => {
  addMessage(data.sender, data.message);
});

// --- Upload file
uploadBtn.onclick = async () => {
  if (!fileInput.files.length) return alert('Select a file');
  const form = new FormData();
  form.append('file', fileInput.files[0]);
  form.append('room', currentRoom);

  const res = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    body: form
  });

  const fileMeta = await res.json();
  socket.emit('file-shared', { room: currentRoom, ...fileMeta });
  addFile(fileMeta.originalName, `${API_URL}${fileMeta.url}`);
  fileInput.value = '';
};

// --- Receive file
socket.on('file-shared', file => {
  addFile(file.originalName, `${API_URL}${file.url}`);
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
  a.download = name;
  li.appendChild(a);
  fileList.prepend(li);
}
