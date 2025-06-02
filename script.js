let client;
const statusEl = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const connectBtn = document.getElementById('connectBtn');
const subscribeBtn = document.getElementById('subscribeBtn');
const publishBtn = document.getElementById('publishBtn');
const topicInput = document.getElementById('topic');
const messageInput = document.getElementById('message');

// Ganti dengan data dari HiveMQ Cloud kamu
const brokerUrl = 'wss://8801cabbd9864acb9de120c5d22bc144.s1.eu.hivemq.cloud:8884/mqtt'; // ubah sesuai hostname-mu
const options = {
  username: 'kontolodon', // ganti dengan username HiveMQ Cloud kamu
  password: 'Gj12345678', // ganti dengan password HiveMQ Cloud kamu
  reconnectPeriod: 1000,
  clean: true
};

connectBtn.onclick = function() {
  client = mqtt.connect(brokerUrl, options);

  client.on('connect', function () {
    statusEl.innerText = 'Connected';
    statusEl.classList.add('connected');
    subscribeBtn.disabled = false;
    publishBtn.disabled = false;
    logMessage('Terhubung ke broker HiveMQ Cloud');
  });

  client.on('error', function (err) {
    logMessage('Error: ' + err.message);
  });

  client.on('close', function () {
    statusEl.innerText = 'Disconnected';
    statusEl.classList.remove('connected');
    subscribeBtn.disabled = true;
    publishBtn.disabled = true;
    logMessage('Koneksi terputus');
  });

  client.on('message', function (topic, message) {
    logMessage(`Pesan diterima [${topic}]: ${message.toString()}`);
  });
};

subscribeBtn.onclick = function() {
  const topic = topicInput.value;
  if (topic && client) {
    client.subscribe(topic, function (err) {
      if (!err) {
        logMessage('Subscribed ke topik: ' + topic);
      } else {
        logMessage('Gagal subscribe: ' + err.message);
      }
    });
  }
};

publishBtn.onclick = function() {
  const topic = topicInput.value;
  const message = messageInput.value;
  if (topic && message && client) {
    client.publish(topic, message);
    logMessage(`Pesan dikirim ke [${topic}]: ${message}`);
  }
};

function logMessage(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  messagesEl.appendChild(p);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
