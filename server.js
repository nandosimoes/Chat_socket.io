const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Servir arquivos estáticos, incluindo CSS
app.use(express.static(__dirname))

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

let esperandoUsuario = null

io.on('connection', (socket) => {
    console.log("Um usuário se conectou.");
    socket.on('set username', (username) => {
        socket.username = username
        console.log(`${username} entrou na sala.`);
        if (esperandoUsuario) {
            socket.partner = esperandoUsuario
            esperandoUsuario.partner = socket
            esperandoUsuario.emit('chat start', `falando com: ${socket.username}.`)
            socket.emit('chat start', `falando com: ${esperandoUsuario.username}.`)
            esperandoUsuario = null
        } else {
            esperandoUsuario = socket
            socket.emit('waiting', 'Aguardando por um usuário disponível.')
        }
    })

    socket.on('chat message', (msg) => {
        if(socket.partner) {
            socket.partner.emit('chat message', `${socket.username}: ${msg}`)
        }
    })

    socket.on("manual disconnect", () => {
        if(socket.partner) {
            socket.partner.emit('chat end', `${socket.username} desconectou.`)
            socket.partner.partner = null
            socket.partner = null
        }
        socket.emit('chat end', 'você desconectou.')
    })

    socket.on('disconnect', () => {
        console.log('Usuário se desconectou.');
        if(socket.partner) {
            socket.partner.emit('chat end', `${socket.username} desconectou.`)
            socket.partner.partner = null
        }
        if(esperandoUsuario === socket) {
            esperandoUsuario = null
        }
    })
})

server.listen(8080, () => {
    console.log('Servidor rodando na porta 8080');
})
