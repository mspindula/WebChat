require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("./public/User");

const { loginValidate, registerValidate } = require("./public/validate");

/* =========================================================
   CONFIGURAÇÃO DO EXPRESS
========================================================= */

const app = express();

const server = http.createServer(app);

const io = new Server(server);

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   MONGODB
========================================================= */

mongoose
    .connect("mongodb://127.0.0.1:27017/users")
    .then(() => {
        console.log("MongoDB conectado com sucesso!");
    })
    .catch((error) => {
        console.error("Erro ao conectar ao MongoDB:", error);
    });


/* =========================================================
   PÁGINAS
========================================================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/chat", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "chat.html"));
});

/* =========================================================
   REGISTRO
========================================================= */

app.post("/api/register", async (req, res) => {
    try {
        const validation = registerValidate(req.body);

        if (validation.error) {
            return res.status(400).json({
                message: validation.error.message,
            });
        }

        const { nome, email, senha } = req.body;

        const emailNormalizado = email.trim().toLowerCase();

        const userExists = await User.findOne({
            email: emailNormalizado,
        });

        if (userExists) {
            return res.status(400).json({
                message: "Este email já está cadastrado.",
            });
        }

        const passwordHash = await bcrypt.hash(senha, 10);

        const user = new User({
            nome: nome.trim(),

            email: emailNormalizado,

            senha: passwordHash,
        });

        await user.save();

        return res.status(201).json({
            message: "Usuário registrado com sucesso!",
        });
    } catch (error) {
        console.error("Erro no registro:", error);

        return res.status(500).json({
            message: "Erro interno ao registrar.",
        });
    }
});



/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", async (req, res) => {
    try {
        const validation = loginValidate(req.body);

        if (validation.error) {
            return res.status(400).json({
                message: validation.error.message,
            });
        }

        const { email, senha } = req.body;

        const emailNormalizado = email.trim().toLowerCase();

        const user = await User.findOne({
            email: emailNormalizado,
        });

        if (!user) {
            return res.status(401).json({
                message: "Email ou senha incorretos.",
            });
        }

        const passwordCorrect = await bcrypt.compare(senha, user.senha);

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Email ou senha incorretos.",
            });
        }

        return res.json({
            message: "Login realizado com sucesso!",

            usuario: {
                id: String(user._id),

                nome: user.nome,

                email: user.email,
            },
        });
    } catch (error) {
        console.error("Erro no login:", error);

        return res.status(500).json({
            message: "Erro interno no login.",
        });
    }
});

/* =========================================================
   SOCKET.IO
========================================================= */

/*
    IMPORTANTE:

    Existe apenas UMA declaração do namespace /chat.

    Não coloque outro:
        const chat = io.of("/chat");

    em nenhuma outra parte deste arquivo.
*/

const chat = io.of("/chat");

/* =========================================================
   CANAIS
========================================================= */

const canais = new Map();

/*
    Canais padrão.
*/

const canaisIniciais = [
    {
        id: "geral",
        name: "geral",
    },

    {
        id: "desenvolvimento",
        name: "desenvolvimento",
    },

    {
        id: "projetos",
        name: "projetos",
    },

    {
        id: "estudos",
        name: "estudos",
    },

    {
        id: "random",
        name: "random",
    },
];

/*
    Criar os canais iniciais.
*/

canaisIniciais.forEach((channel) => {
    canais.set(
        channel.id,

        {
            id: channel.id,

            name: channel.name,

            messages: [],
        }
    );
});

/* =========================================================
   USUÁRIOS ONLINE
========================================================= */

const usuariosOnline = new Map();

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

/*
    Retorna todos os canais
    sem expor as mensagens.
*/

function getChannels() {
    return Array.from(canais.values()).map((channel) => {
        return {
            id: channel.id,

            name: channel.name,
        };
    });
}

/*
    Retorna todos os usuários online.
*/

function getOnlineUsers() {
    return Array.from(usuariosOnline.values());
}

/*
    Atualiza a lista de usuários
    online para todos os clientes.
*/

function sendOnlineUsers() {
    chat.emit("online_users", getOnlineUsers());
}

/*
    Converte o nome do canal
    em um ID seguro.

    Exemplo:

    "Meu Canal" -> "meu-canal"

    "Programação" -> "programacao"
*/

function normalizeChannelName(name) {
    return name

        .trim()

        .toLowerCase()

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g, "")

        .replace(/[^a-z0-9\s-]/g, "")

        .replace(/\s+/g, "-")

        .replace(/-+/g, "-")

        .replace(/^-+|-+$/g, "");
}

/*
    Envia o estado completo para
    um usuário específico.
*/

function sendInitialState(socket) {
    socket.emit("chat_state", {
        channels: getChannels(),

        activeChannel: "geral",

        onlineUsers: getOnlineUsers(),
    });
}

/* =========================================================
   CONEXÃO DOS USUÁRIOS
========================================================= */

chat.on("connection", (socket) => {
    console.log("======================================");

    console.log("NOVO USUÁRIO CONECTADO");

    console.log("Socket:", socket.id);

    /* =================================================
           DADOS DO USUÁRIO
        ================================================= */

    const auth = socket.handshake.auth || {};

    const userId = String(auth.userId || socket.id);

    const userName =
        typeof auth.userName === "string" && auth.userName.trim()
            ? auth.userName.trim()
            : "Usuário";

    console.log("Usuário:", userName);

    console.log("ID:", userId);

    /* =================================================
           REGISTRAR USUÁRIO ONLINE
        ================================================= */

    usuariosOnline.set(
        socket.id,

        {
            id: userId,

            name: userName,
        }
    );

    console.log("Usuários online:", usuariosOnline.size);

    /* =================================================
           ENVIAR ESTADO INICIAL
        ================================================= */

    sendInitialState(socket);

    /*
            Atualizar todos os usuários.
        */

    sendOnlineUsers();

    /* =================================================
           ENVIAR MENSAGENS DO CANAL GERAL
        ================================================= */

    const geral = canais.get("geral");

    if (geral) {
        socket.emit("channel_messages", {
            channelId: "geral",

            messages: geral.messages,
        });
    }

    /* =================================================
           TROCAR DE CANAL
        ================================================= */

    socket.on("switch_channel", (channelId) => {
        console.log(`${userName} solicitou o canal: ${channelId}`);

        if (typeof channelId !== "string") {
            socket.emit("chat_error", "Canal inválido.");

            return;
        }

        const channel = canais.get(channelId);

        if (!channel) {
            socket.emit("chat_error", "Canal não encontrado.");

            return;
        }

        socket.emit("channel_messages", {
            channelId: channel.id,

            messages: channel.messages,
        });
    });

    /* =================================================
           NOVA MENSAGEM
        ================================================= */

    socket.on("new_message", (data) => {
        if (!data || typeof data !== "object") {
            return;
        }

        const channelId = data.channelId;

        const msg = typeof data.msg === "string" ? data.msg.trim() : "";

        if (!channelId || !msg) {
            return;
        }

        const channel = canais.get(channelId);

        if (!channel) {
            socket.emit("chat_error", "Canal não encontrado.");

            return;
        }

        const message = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,

            userId: userId,

            user: userName,

            msg: msg,

            createdAt: new Date(),
        };

        channel.messages.push(message);

        console.log(`[${channel.name}] ${userName}: ${msg}`);

        /*
                    Enviar a mensagem
                    para todos os usuários.
                */

        chat.emit("new_message", {
            channelId: channelId,

            message: message,
        });
    });

    /* =================================================
           CRIAR CANAL
        ================================================= */

    socket.on("create_channel", (data) => {
        console.log("Pedido para criar canal:", data);

        if (!data || typeof data.name !== "string") {
            socket.emit("chat_error", "Nome de canal inválido.");

            return;
        }

        const displayName = data.name.trim();

        if (displayName.length < 2) {
            socket.emit(
                "chat_error",
                "O nome do canal deve ter pelo menos 2 caracteres."
            );

            return;
        }

        if (displayName.length > 40) {
            socket.emit(
                "chat_error",
                "O nome do canal deve ter no máximo 40 caracteres."
            );

            return;
        }

        const channelId = normalizeChannelName(displayName);

        if (!channelId) {
            socket.emit("chat_error", "Nome de canal inválido.");

            return;
        }

        if (canais.has(channelId)) {
            socket.emit("chat_error", "Este canal já existe.");

            return;
        }

        const channel = {
            id: channelId,

            name: displayName,

            messages: [],
        };

        canais.set(channelId, channel);

        console.log("======================================");

        console.log("CANAL CRIADO");

        console.log("Nome:", displayName);

        console.log("ID:", channelId);

        console.log("Criado por:", userName);

        /*
                    Avisar TODOS os usuários.
                */

        chat.emit("channel_created", {
            id: channel.id,

            name: channel.name,
        });

        /*
                    Avisar quem criou
                    para selecionar o canal.
                */

        socket.emit("channel_created_and_select", {
            id: channel.id,

            name: channel.name,
        });
    });

    /* =================================================
           APAGAR CANAL
        ================================================= */

    socket.on("delete_channel", (channelId) => {
        console.log("Pedido para apagar canal:", channelId);

        if (typeof channelId !== "string") {
            socket.emit("chat_error", "Canal inválido.");

            return;
        }

        /*
                    O canal geral é protegido.
                */

        if (channelId === "geral") {
            socket.emit("chat_error", "O canal geral não pode ser apagado.");

            return;
        }

        /*
                    Verificar se existe.
                */

        const channel = canais.get(channelId);

        if (!channel) {
            socket.emit("chat_error", "Canal não encontrado.");

            return;
        }

        /*
                    Apagar.
                */

        canais.delete(channelId);

        console.log("======================================");

        console.log("CANAL APAGADO");

        console.log("Nome:", channel.name);

        console.log("ID:", channel.id);

        console.log("Apagado por:", userName);

        /*
                    Avisar TODOS os usuários.
                */

        chat.emit("channel_deleted", {
            id: channel.id,

            name: channel.name,
        });
    });

    /* =================================================
           DESCONECTAR
        ================================================= */

    socket.on("disconnect", (reason) => {
        console.log("======================================");

        console.log("USUÁRIO DESCONECTADO");

        console.log("Usuário:", userName);

        console.log("Socket:", socket.id);

        console.log("Motivo:", reason);

        /*
                    Remover da lista online.
                */

        usuariosOnline.delete(socket.id);

        /*
                    Atualizar todos.
                */

        sendOnlineUsers();
    });
});

/* =========================================================
   TRATAMENTO DE ERROS DO SERVIDOR
========================================================= */

process.on("uncaughtException", (error) => {
    console.error("Erro não tratado:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("Promise rejeitada:", error);
});

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("======================================");

    console.log(`Servidor rodando em http://localhost:${PORT}`);

    console.log("======================================");
});
