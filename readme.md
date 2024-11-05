# TikTok Live Music Request Overlay

Este projeto é um aplicativo para gerenciar pedidos de músicas em tempo real em lives do TikTok. O aplicativo conecta-se ao chat da live e exibe uma fila de músicas solicitadas, mostrando também a capa do álbum e um link para a versão karaokê no YouTube. Ele gera uma overlay para ser usada no OBS, facilitando a exibição das músicas na live.

## Funcionalidades

- Conecta-se ao chat de uma live no TikTok.
- Detecta comandos do chat para solicitar músicas (`!request`).
- Adiciona manualmente músicas à fila.
- Exibe a fila de músicas com capa do álbum e link para karaokê.
- Permite a reorganização das músicas na fila (mover para cima ou para baixo).
- Remove músicas da fila.
- Gera uma overlay para ser usada no OBS, atualizada em tempo real.

## Instalação

### Pré-requisitos

- **Node.js**: Certifique-se de que o Node.js está instalado em sua máquina. Você pode baixá-lo [aqui](https://nodejs.org/).
- **Git**: Tenha o Git instalado para clonar o repositório ou baixe-o diretamente.

### Passos para rodar o projeto

1. Clone o repositório ou baixe os arquivos diretamente:

   ```bash
   git clone https://github.com/seu-usuario/tiktok-live-music-request.git
   cd tiktok-live-music-request
   npm install
   npm start


