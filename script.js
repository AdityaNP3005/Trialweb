const client = mqtt.connect('wss://8801cabbd9864acb9de120c5d22bc144.s1.eu.hivemq.cloud:8884/mqtt', {
    clientId: 'kontolodon',
    username: 'kontolodon',
    password: 'Gj12345678',
    keepalive: 30,
    clean: true
});

const connectionStatusDiv = document.getElementById('connection-status');
const messagesDiv = document.getElementById('messages');
const topic = 'adit/webdemo';

function updateConnectionStatus(message, className = '') {
    connectionStatusDiv.textContent = message;
    connectionStatusDiv.className = className;
    console.log("[Status]", message);
}

function logMessage(msg, isReconnect = false) {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    const p = document.createElement('p');
    p.innerText = `[${timestamp}] ${msg}`;
    if (isReconnect) {
        p.classList.add('reconnect-log');
    }
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

updateConnectionStatus("Mencoba menghubungkan...", "reconnecting");

client.on('connect', () => {
    updateConnectionStatus(`Terhubung ke broker. Berlangganan ke topik: ${topic}`, "connected");
    // logMessage('✅ Terhubung ke broker HiveMQ Cloud!', true);
    // logMessage(`📡 Berlangganan ke topik: ${topic}`, true);
    client.subscribe(topic, (err) => {
        if (err) {
            logMessage('❌ Gagal subscribe: ' + err.message);
        }
    });
});

client.on('disconnect', () => {
    updateConnectionStatus("Terputus dari broker.", "disconnected");
    logMessage('⚠️ Terputus dari broker.');
});

client.on('reconnect', () => {
    updateConnectionStatus("Mencoba menghubungkan kembali...", "reconnecting");
    logMessage('🔄 Mencoba menghubungkan kembali ke broker...', true);
    const reconnectLogs = messagesDiv.querySelectorAll('.reconnect-log');
    reconnectLogs.forEach(log => {
        messagesDiv.removeChild(log);
    });
});

client.on('connectionLost', (responseObject) => {
    if (responseObject.errorCode !== 0) {
        updateConnectionStatus(`Koneksi terputus: ${responseObject.errorMessage}. Mencoba menghubungkan kembali...`, "disconnected");
        logMessage("❌ Koneksi ke MQTT terputus: " + responseObject.errorMessage);
    }
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

        document.getElementById('suhuValue').innerText = `${suhu}°C`;
        document.getElementById('humValue').innerText = `${hum}%`;
        document.getElementById('airValue').innerText = `${air}cm`;

        logMessage(`📥 Suhu: ${suhu}°C, Hum: ${hum}%, Air: ${air}cm`);

        const warningsDiv = document.getElementById('warnings');
        warningsDiv.innerHTML = '';
        const activeWarnings = [];

        if (suhu > 30) activeWarnings.push(`⚠️ Suhu tinggi (${suhu}°C)`);
        if (hum < 40) activeWarnings.push(`⚠️ Kelembaban rendah (${hum}%)`);
        if (hum > 80) activeWarnings.push(`⚠️ Kelembaban tinggi (${hum}%)`);
        if (air < 10) activeWarnings.push(`⚠️ Ketinggian air rendah (${air}cm)`);
        if (air > 90) activeWarnings.push(`⚠️ Ketinggian air tinggi (${air}cm)`);

        if (activeWarnings.length > 0) {
            activeWarnings.forEach(warningText => {
                const warning = document.createElement('p');
                warning.textContent = warningText;
                warningsDiv.appendChild(warning);
            });
        } else {
            const noWarning = document.createElement('p');
            noWarning.textContent = "Tidak ada peringatan";
            warningsDiv.appendChild(noWarning);
        }

        // Kirim pesan "ok" kembali ke MQTT setelah menerima dan memproses data
        const ackTopic = 'fakyu';
        const ackMessage = 'ok';
        client.publish(ackTopic, ackMessage);
        logMessage(`📤 Mengirim ACK ke topik: ${ackTopic} dengan pesan: ${ackMessage}`);

    } catch (err) {
        logMessage('❌ JSON tidak valid: ' + message.toString());
    }
});