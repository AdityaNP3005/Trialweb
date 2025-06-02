const client = mqtt.connect('wss://8801cabbd9864acb9de120c5d22bc144.s1.eu.hivemq.cloud:8884/mqtt', {
  clientId: 'kontolodon',
  username: 'kontolodon',
  password: 'Gj12345678'
});

client.on('connect', () => {
  logMessage('✅ Terhubung ke broker HiveMQ Cloud!');
  client.subscribe('adit/webdemo', (err) => {
    if (!err) {
      logMessage('📡 Subscribe topik adit/webdemo berhasil');
    } else {
      logMessage('❌ Gagal subscribe: ' + err.message);
    }
  });
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const suhu = parseFloat(data.S) || 0;
    const hum = parseFloat(data.H) || 0;
    const air = parseFloat(data.W) || 0;

    document.getElementById('suhuBar').value = suhu;
    document.getElementById('humBar').value = hum;
    document.getElementById('airBar').value = air;

    document.getElementById('suhuValue').innerText = `${suhu}%`;
    document.getElementById('humValue').innerText = `${hum}%`;
    document.getElementById('airValue').innerText = `${air}cm`;

    logMessage(`📥 Suhu: ${suhu}, Hum: ${hum}, Air: ${air}`);
  } catch (err) {
    logMessage('❌ JSON tidak valid: ' + message.toString());
  }
});

function logMessage(msg) {
  const p = document.createElement('p');
  p.innerText = msg;
  const messagesDiv = document.getElementById('messages');
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
