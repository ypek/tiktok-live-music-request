const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron'); // Importando Menu
const path = require('path');
const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');
const express = require('express'); // Adicionando o servidor Express

let mainWindow;
let songQueue = [];
let client = null;

const serverApp = express(); // Iniciando o servidor Express
const port = 3000; // Porta padrão para o servidor

// Criando o servidor HTTP e integrando o Socket.io
const http = require('http').createServer(serverApp);
const io = require('socket.io')(http);

// Função para criar a janela do Electron
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets', 'logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');

    // Remover a barra de menu
    Menu.setApplicationMenu(null);
}

// Função para obter informações da música (API iTunes)
async function fetchSongInfo(songName) {
    try {
        const response = await axios.get('https://itunes.apple.com/search', {
            params: { term: songName, media: 'music', limit: 1 }
        });

        const song = response.data.results[0];
        if (song) {
            return {
                title: song.trackName || songName,
                coverUrl: song.artworkUrl100.replace('100x100', '300x300'), // Melhor resolução
                youtubeKaraokeLink: `https://www.youtube.com/results?search_query=${songName}+karaoke`, // Busca no YouTube
            };
        } else {
            return { title: songName, coverUrl: "default-image-url.jpg", youtubeKaraokeLink: "" }; // Imagem padrão caso não encontre
        }
    } catch (error) {
        console.error('Erro ao acessar a API do iTunes:', error);
        return { title: songName, coverUrl: "default-image-url.jpg", youtubeKaraokeLink: "" }; // Imagem padrão em caso de erro
    }
}

// Listener para conexão ao TikTok Live
ipcMain.on('connectStreamer', async (event, tiktokUsername) => {
    if (client) {
        client.disconnect(); // Desconectar se já houver um cliente conectado
    }

    client = new WebcastPushConnection(tiktokUsername);

    client.connect().then(() => {
        console.log(`Conectado ao chat de ${tiktokUsername}`);
        event.reply('connectionSuccess', `Conectado ao chat de ${tiktokUsername}`);
    }).catch((err) => {
        console.error('Erro ao conectar:', err);
        event.reply('connectionError', 'Erro ao conectar à live.');
    });

    // Listener para comandos no chat
    client.on('chat', async (data) => {
        if (data.comment) {
            if (data.comment.startsWith('!request')) {
                const songName = data.comment.replace('!request ', '').trim();
                console.log(`Pedido de música recebido: ${songName}`);

                try {
                    const songInfo = await fetchSongInfo(songName);
                    songQueue.push(songInfo);
                    updateQueue(); // Atualizar a GUI e a overlay
                } catch (error) {
                    console.error('Erro ao buscar informações da música:', error);
                }
            } else if (data.comment === '!proxima') {
                if (songQueue.length > 0) {
                    songQueue.shift(); // Remove a primeira música
                    updateQueue(); // Atualizar a GUI e a overlay
                    console.log("Passando para a próxima música...");
                }
            }
        }
    });
});

// Função para atualizar a fila de músicas na GUI e na overlay
function updateQueue() {
    if (mainWindow) {
        mainWindow.webContents.send('updateQueue', songQueue);
    }
    // Emitir atualização via Socket.io para a overlay
    io.emit('updateOverlay', songQueue);
}

// IPC para remover músicas da GUI
ipcMain.on('removeSong', (event, index) => {
    if (index >= 0 && index < songQueue.length) {
        songQueue.splice(index, 1);
        updateQueue(); // Atualizar a GUI e a overlay após a remoção
    }
});

// IPC para mover músicas na fila
ipcMain.on('moveSong', (event, { index, direction }) => {
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < songQueue.length - 1)) {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const [song] = songQueue.splice(index, 1);
        songQueue.splice(newIndex, 0, song);
        updateQueue(); // Atualizar a GUI e a overlay após mover a música
    }
});

// Abrir links no navegador padrão
ipcMain.on('openExternal', (event, url) => {
    shell.openExternal(url);
});

// Adicionando uma música manualmente à fila e buscando a capa do álbum
ipcMain.on('addManualSong', async (event, songTitle) => {
    try {
        const songInfo = await fetchSongInfo(songTitle); // Buscar informações da música na API do iTunes
        songQueue.push(songInfo);
        updateQueue(); // Atualizar a GUI e a overlay
    } catch (error) {
        console.error('Erro ao adicionar música manualmente:', error);
    }
});

// Servir a overlay para o OBS
serverApp.get('/overlay', (req, res) => {
    res.send(`
        <html>
        <head>
            <style>
                body { font-family: 'Poppins', sans-serif; text-align: center; color: #fff; background: #333; }
                .container { padding: 20px; }
                img { width: 150px; height: 150px; border-radius: 10px; }
                h1 { font-size: 24px; margin-top: 10px; font-weight: bold; }
                h2 { font-size: 20px; font-weight: bold; }
                ul { list-style-type: none; padding: 0; }
                li { font-size: 18px; color: #ccc; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <img id="currentSongCover" src="default-image-url.jpg" alt="Capa da Música">
                <h1 id="currentSongTitle">Nenhuma música na fila</h1>
                <h2>Próximas na Fila:</h2>
                <ul id="nextSongs"></ul>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();

                socket.on('updateOverlay', (songs) => {
                    const currentSong = songs.length > 0 ? songs[0] : { title: "Nenhuma música na fila", coverUrl: "default-image-url.jpg" };
                    const nextSongs = songs.slice(1).map((song, index) => \`<li>\${index + 2}. \${song.title}</li>\`).join("");

                    document.getElementById('currentSongCover').src = currentSong.coverUrl;
                    document.getElementById('currentSongTitle').innerText = \`Tocando Agora: \${currentSong.title}\`;
                    document.getElementById('nextSongs').innerHTML = nextSongs;
                });
            </script>
        </body>
        </html>
    `);
});

// Iniciar o servidor Express
http.listen(port, () => {
    console.log(`Servidor da overlay rodando em http://localhost:${port}/overlay`);
});

// Inicializar a aplicação do Electron
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
