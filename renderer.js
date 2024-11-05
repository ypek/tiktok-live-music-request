const { ipcRenderer } = require('electron');

// Função para limitar o tamanho do nome da música
function truncateSongTitle(title, maxLength = 25) {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

// Evento para se conectar ao TikTok Live quando o botão é clicado
document.getElementById('connectButton').addEventListener('click', () => {
    const username = document.getElementById('tiktokUsername').value.trim();
    if (username) {
        ipcRenderer.send('connectStreamer', username);
    }
});

// Evento para adicionar uma música manualmente
document.getElementById('addManualSongButton').addEventListener('click', () => {
    const songTitle = document.getElementById('manualSongTitle').value.trim();
    if (songTitle) {
        ipcRenderer.send('addManualSong', songTitle);
        document.getElementById('manualSongTitle').value = ''; // Limpar o campo de entrada
    }
});

// Atualiza a fila de músicas na interface
ipcRenderer.on('updateQueue', (event, songs) => {
    const queueElement = document.getElementById('songQueue');
    queueElement.innerHTML = ''; // Limpar a lista

    songs.forEach((song, index) => {
        const truncatedTitle = truncateSongTitle(song.title); // Limitar o tamanho do nome da música

        const li = document.createElement('li');
        li.className = 'song';
        li.innerHTML = `
            <img src="${song.coverUrl}" alt="Capa da Música">
            <span>${index + 1}. ${truncatedTitle}</span>
            <a href="#" onclick="openLink('${song.youtubeKaraokeLink}')">Karaokê</a>
            <button onclick="removeSong(${index})">Remover</button>
            <button onclick="moveSong(${index}, 'up')">↑</button>
            <button onclick="moveSong(${index}, 'down')">↓</button>
        `;
        queueElement.appendChild(li);
    });
});

// Notificações de conexão
ipcRenderer.on('connectionSuccess', (event, message) => {
    document.getElementById('status').innerText = message;
    document.getElementById('overlayLink').style.display = 'block';
});

ipcRenderer.on('connectionError', (event, message) => {
    document.getElementById('status').innerText = message;
});

// Remover músicas da fila
function removeSong(index) {
    ipcRenderer.send('removeSong', index);
}

// Mover músicas na fila
function moveSong(index, direction) {
    ipcRenderer.send('moveSong', { index, direction });
}

// Copiar link da overlay
document.getElementById('copyOverlayLink').addEventListener('click', () => {
    const link = 'http://localhost:3000/overlay';
    navigator.clipboard.writeText(link).then(() => {
        document.getElementById('copyNotification').style.display = 'block';
        setTimeout(() => {
            document.getElementById('copyNotification').style.display = 'none';
        }, 2000);
    });
});

// Abrir link no navegador padrão
function openLink(url) {
    ipcRenderer.send('openExternal', url);
}
