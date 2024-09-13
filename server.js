const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve arquivos estáticos
app.use(express.static(__dirname));

// Rota principal
app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Armazenar usuário que está esperando por um parceiro
let waitingUser = null;

io.on('connection', (socket) => {
    console.log("Um usuário se conectou.");

    // Define o nome de usuário
    socket.on('set username', (username) => {
        socket.username = username;
        console.log(`${username} entrou na sala.`);

        // Se houver um usuário esperando, conecte-os
        if (waitingUser) {
            socket.partner = waitingUser;
            waitingUser.partner = socket;
            waitingUser.emit('chat start', `falando com: ${socket.username}.`);
            socket.emit('chat start', `falando com: ${waitingUser.username}.`);
            waitingUser = null; // Reset waitingUser
        } else {
            waitingUser = socket; // Aguarda um parceiro
            socket.emit('waiting', 'Aguardando por um usuário disponível.');
        }
    });

    // Envia mensagem para o parceiro
    socket.on('chat message', (msg) => {
        if (socket.partner) {
            socket.partner.emit('chat message', `${socket.username}: ${msg}`);
        }
    });

    // Desconectar manualmente
    socket.on("manual disconnect", () => {
        if (socket.partner) {
            socket.partner.emit('chat end', `${socket.username} desconectou.`);
            socket.partner.partner = null;
            socket.partner = null;
        }
        socket.emit('chat end', 'Você desconectou.');
    });

    // Ao desconectar, limpa a conexão
    socket.on('disconnect', () => {
        console.log('Usuário se desconectou.');
        if (socket.partner) {
            socket.partner.emit('chat end', `${socket.username} desconectou.`);
            socket.partner.partner = null;
        }
        if (waitingUser === socket) {
            waitingUser = null;
        }
    });
});

// Inicializa o servidor
server.listen(8080, () => {
    console.log('Servidor rodando na porta 8080');
});
