/* =========================================================
   CHAT.JS
   ChatApp + Socket.IO
========================================================= */

/* =========================================================
   VERIFICAR USUÁRIO
========================================================= */

const usuarioSalvo = localStorage.getItem("usuario");

if (!usuarioSalvo) {
    window.location.replace("/");
}

/* =========================================================
   LER USUÁRIO
========================================================= */

let usuario;

try {
    usuario = JSON.parse(usuarioSalvo);
} catch (error) {
    console.error("Erro ao ler usuário:", error);

    localStorage.removeItem("usuario");

    window.location.replace("/");
}

/*
    Dados do usuário.
*/

const userId = String(usuario.id || "");

const userName = String(usuario.nome || "Usuário").trim();

/* =========================================================
   ELEMENTOS DO HTML
========================================================= */

const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");

const messageInput = document.getElementById("message");

const channelsContainer = document.getElementById("channels");

const onlineUsersContainer = document.getElementById("onlineUsers");

const channelNameElement = document.getElementById("channelName");

const usuarioLogado = document.getElementById("usuarioLogado");

const avatar = document.getElementById("loggedUserAvatar");

const addChannelButton = document.getElementById("addChannel");

/* =========================================================
   MOSTRAR USUÁRIO LOGADO
========================================================= */

if (usuarioLogado) {
    usuarioLogado.textContent = userName;
}

if (avatar) {
    avatar.textContent = userName.charAt(0).toUpperCase();
}

/* =========================================================
   CANAL ATUAL
========================================================= */

let currentChannel = "geral";

/*
    Guardar canais localmente
    para podermos renderizar
    novamente quando necessário.
*/

let channels = [];

/*
    Mensagens do canal atual.
*/

let currentMessages = [];

/* =========================================================
   SOCKET.IO
========================================================= */

/*
    IMPORTANTE:

    O namespace precisa ser exatamente:

        /chat

    E enviamos os dados do usuário
    na autenticação.
*/

const socket = io("/chat", {
    auth: {
        userId: userId,

        userName: userName,
    },
});

/* =========================================================
   CONEXÃO
========================================================= */

socket.on("connect", () => {
    console.log("Socket conectado:", socket.id);
});

/* =========================================================
   ERRO DE CONEXÃO
========================================================= */

socket.on("connect_error", (error) => {
    console.error("Erro Socket.IO:", error);
});

/* =========================================================
   DESCONECTADO
========================================================= */

socket.on("disconnect", (reason) => {
    console.log("Socket desconectado:", reason);
});

/* =========================================================
   ESTADO INICIAL
========================================================= */

socket.on("chat_state", (data) => {
    console.log("Estado recebido:", data);

    if (!data || typeof data !== "object") {
        return;
    }

    /*
            Canais.
        */

    if (Array.isArray(data.channels)) {
        channels = data.channels;

        renderChannels();
    }

    /*
            Canal atual.
        */

    if (data.activeChannel) {
        currentChannel = data.activeChannel;

        updateChannelTitle();
    }

    /*
            Usuários online.
        */

    if (Array.isArray(data.onlineUsers)) {
        renderOnlineUsers(data.onlineUsers);
    }
});

/* =========================================================
   USUÁRIOS ONLINE
========================================================= */

socket.on("online_users", (users) => {
    console.log("Usuários online:", users);

    if (!Array.isArray(users)) {
        return;
    }

    renderOnlineUsers(users);
});

/* =========================================================
   RENDERIZAR USUÁRIOS ONLINE
========================================================= */

function renderOnlineUsers(users) {
    if (!onlineUsersContainer) {
        return;
    }

    onlineUsersContainer.innerHTML = "";

    /*
        Evitar usuários duplicados.
    */

    const uniqueUsers = [];

    const seen = new Set();

    users.forEach((user) => {
        if (!user) {
            return;
        }

        const id = String(user.id || user.name || "");

        if (seen.has(id)) {
            return;
        }

        seen.add(id);

        uniqueUsers.push(user);
    });

    /*
        Criar cada usuário.
    */

    uniqueUsers.forEach((user) => {
        const userElement = document.createElement("div");

        userElement.className = "online-user";

        /*
                Avatar.
            */

        const userAvatar = document.createElement("div");

        userAvatar.className = "online-user-avatar";

        const name = String(user.name || "Usuário");

        userAvatar.textContent = name.charAt(0).toUpperCase();

        /*
                Informações.
            */

        const info = document.createElement("div");

        info.className = "online-user-info";

        const nameElement = document.createElement("strong");

        nameElement.textContent = name;

        const statusElement = document.createElement("small");

        statusElement.textContent = "Online";

        /*
                Ponto verde.
            */

        const dot = document.createElement("span");

        dot.className = "online-dot";

        info.appendChild(nameElement);

        info.appendChild(statusElement);

        userElement.appendChild(userAvatar);

        userElement.appendChild(info);

        userElement.appendChild(dot);

        onlineUsersContainer.appendChild(userElement);
    });

    /*
        Caso não exista ninguém.
    */

    if (uniqueUsers.length === 0) {
        const empty = document.createElement("div");

        empty.className = "empty-online";

        empty.textContent = "Nenhum usuário online";

        onlineUsersContainer.appendChild(empty);
    }
}

/* =========================================================
   RENDERIZAR CANAIS
========================================================= */

function renderChannels() {
    if (!channelsContainer) {
        return;
    }

    channelsContainer.innerHTML = "";

    channels.forEach((channel) => {
        if (!channel) {
            return;
        }

        const channelItem = document.createElement("div");

        channelItem.className = "channel-item";

        /*
                Destacar canal atual.
            */

        if (channel.id === currentChannel) {
            channelItem.classList.add("active");
        }

        /*
                Botão do canal.
            */

        const channelButton = document.createElement("button");

        channelButton.type = "button";

        channelButton.className = "channel-button";

        channelButton.title = `Abrir #${channel.name}`;

        /*
                Ícone #.
            */

        const hash = document.createElement("span");

        hash.className = "channel-hash";

        hash.textContent = "#";

        /*
                Nome.
            */

        const name = document.createElement("span");

        name.className = "channel-name";

        name.textContent = channel.name;

        channelButton.appendChild(hash);

        channelButton.appendChild(name);

        /*
                Clicar no canal.
            */

        channelButton.addEventListener("click", () => {
            switchChannel(channel.id);
        });

        channelItem.appendChild(channelButton);

        /*
                O canal geral não pode
                ser apagado.
            */

        if (channel.id !== "geral") {
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className = "delete-channel";

            deleteButton.title = "Apagar canal";

            deleteButton.innerHTML = '<i class="bi bi-trash3"></i>';

            deleteButton.addEventListener("click", (event) => {
                /*
                            Não abrir o canal
                            ao clicar na lixeira.
                        */

                event.preventDefault();

                event.stopPropagation();

                deleteChannel(channel);
            });

            channelItem.appendChild(deleteButton);
        }

        channelsContainer.appendChild(channelItem);
    });

    /*
        Se não houver canais,
        mostrar mensagem.
    */

    if (channels.length === 0) {
        const empty = document.createElement("div");

        empty.className = "empty-channels";

        empty.textContent = "Nenhum canal disponível";

        channelsContainer.appendChild(empty);
    }
}

/* =========================================================
   TROCAR DE CANAL
========================================================= */

function switchChannel(channelId) {
    if (!channelId) {
        return;
    }

    /*
        Se já estiver no canal,
        não precisa solicitar novamente.
    */

    if (channelId === currentChannel) {
        return;
    }

    console.log("Entrando no canal:", channelId);

    socket.emit("switch_channel", channelId);
}

/* =========================================================
   RECEBER MENSAGENS DO CANAL
========================================================= */

socket.on("channel_messages", (data) => {
    console.log("Mensagens recebidas:", data);

    if (!data || !data.channelId) {
        return;
    }

    currentChannel = data.channelId;

    currentMessages = Array.isArray(data.messages) ? data.messages : [];

    updateChannelTitle();

    renderChannels();

    renderMessages(currentMessages);
});

/* =========================================================
   TÍTULO DO CANAL
========================================================= */

function updateChannelTitle() {
    if (!channelNameElement) {
        return;
    }

    const channel = channels.find((item) => item.id === currentChannel);

    if (channel) {
        channelNameElement.textContent = channel.name;

        return;
    }

    /*
        Fallback.
    */

    channelNameElement.textContent =
        currentChannel === "geral" ? "geral" : currentChannel;
}

/* =========================================================
   RENDERIZAR MENSAGENS
========================================================= */

function renderMessages(messagesList) {
    if (!messages) {
        return;
    }

    messages.innerHTML = "";

    if (!Array.isArray(messagesList)) {
        return;
    }

    messagesList.forEach((message) => {
        renderSingleMessage(message);
    });

    scrollMessagesToBottom();
}

/* =========================================================
   RENDERIZAR UMA MENSAGEM
========================================================= */

function renderSingleMessage(message) {
    if (!messages) {
        return;
    }

    if (!message) {
        return;
    }

    const messageElement = document.createElement("div");

    /*
        Classes diferentes
        para minha mensagem
        e mensagem dos outros.
    */

    if (String(message.userId || "") === userId) {
        messageElement.className = "my-message";
    } else {
        messageElement.className = "other-message";
    }

    /*
        Nome.
    */

    const userElement = document.createElement("strong");

    userElement.className = "message-user";

    userElement.textContent = message.user || "Usuário";

    /*
        Texto.
    */

    const textElement = document.createElement("span");

    textElement.className = "message-text";

    textElement.textContent = message.msg || "";

    messageElement.appendChild(userElement);

    messageElement.appendChild(textElement);

    messages.appendChild(messageElement);
}

/* =========================================================
   NOVA MENSAGEM EM TEMPO REAL
========================================================= */

socket.on("new_message", (data) => {
    if (!data || !data.channelId || !data.message) {
        return;
    }

    /*
            Ignorar mensagens de outros canais.
        */

    if (data.channelId !== currentChannel) {
        return;
    }

    currentMessages.push(data.message);

    renderSingleMessage(data.message);

    scrollMessagesToBottom();
});

/* =========================================================
   ROLAGEM DAS MENSAGENS
========================================================= */

function scrollMessagesToBottom() {
    if (!messages) {
        return;
    }

    messages.scrollTop = messages.scrollHeight;
}

/* =========================================================
   ENVIAR MENSAGEM
========================================================= */

if (messageForm) {
    messageForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!messageInput) {
            return;
        }

        const text = messageInput.value.trim();

        if (!text) {
            return;
        }

        /*
                Enviar para o servidor.
            */

        socket.emit("new_message", {
            channelId: currentChannel,

            msg: text,
        });

        /*
                Limpar campo.
            */

        messageInput.value = "";

        messageInput.focus();
    });
}

/* =========================================================
   CRIAR CANAL
========================================================= */

if (addChannelButton) {
    addChannelButton.addEventListener("click", () => {
        createChannel();
    });
}

/* =========================================================
   FUNÇÃO CRIAR CANAL
========================================================= */

function createChannel() {
    const channelName = prompt("Digite o nome do novo canal:");

    /*
        Cancelou.
    */

    if (channelName === null) {
        return;
    }

    const name = channelName.trim();

    if (!name) {
        alert("Digite um nome para o canal.");

        return;
    }

    if (name.length < 2) {
        alert("O nome do canal deve ter pelo menos 2 caracteres.");

        return;
    }

    if (name.length > 40) {
        alert("O nome do canal deve ter no máximo 40 caracteres.");

        return;
    }

    /*
        Enviar para o servidor.
    */

    socket.emit("create_channel", {
        name: name,
    });
}

/* =========================================================
   CANAL CRIADO
========================================================= */

socket.on("channel_created", (channel) => {
    console.log("Canal criado:", channel);

    if (!channel || !channel.id) {
        return;
    }

    /*
            Evitar duplicação.
        */

    const exists = channels.some((item) => item.id === channel.id);

    if (!exists) {
        channels.push({
            id: channel.id,

            name: channel.name,
        });
    }

    renderChannels();
});

/* =========================================================
   SE QUEM CRIOU DEVE ENTRAR NO CANAL
========================================================= */

socket.on("channel_created_and_select", (channel) => {
    if (!channel || !channel.id) {
        return;
    }

    currentChannel = channel.id;

    updateChannelTitle();

    renderChannels();

    /*
            Solicitar as mensagens
            do novo canal.
        */

    socket.emit("switch_channel", channel.id);
});

/* =========================================================
   APAGAR CANAL
========================================================= */

function deleteChannel(channel) {
    if (!channel || !channel.id) {
        return;
    }

    /*
        Nunca apagar geral.
    */

    if (channel.id === "geral") {
        alert("O canal geral não pode ser apagado.");

        return;
    }

    const confirmed = window.confirm(
        `Deseja realmente apagar o canal "${channel.name}"?`
    );

    if (!confirmed) {
        return;
    }

    console.log("Apagando canal:", channel.id);

    socket.emit("delete_channel", channel.id);
}

/* =========================================================
   CANAL APAGADO
========================================================= */

socket.on("channel_deleted", (channel) => {
    console.log("Canal apagado:", channel);

    if (!channel || !channel.id) {
        return;
    }

    /*
            Remover da lista local.
        */

    channels = channels.filter((item) => item.id !== channel.id);

    /*
            Se estávamos dentro
            do canal apagado,
            voltar para geral.
        */

    if (currentChannel === channel.id) {
        currentChannel = "geral";

        currentMessages = [];

        updateChannelTitle();

        renderChannels();

        renderMessages([]);

        socket.emit("switch_channel", "geral");
    } else {
        renderChannels();
    }
});

/* =========================================================
   ERROS DO CHAT
========================================================= */

socket.on("chat_error", (message) => {
    console.error("Erro do chat:", message);

    alert(message || "Ocorreu um erro.");
});

/* =========================================================
   MENU DO USUÁRIO
========================================================= */

const usuarioMenuButton = document.getElementById("usuarioMenuButton");

const usuarioDropdown = document.getElementById("usuarioDropdown");

const logoutButton = document.getElementById("logoutButton");

/*
    Abrir / fechar menu.
*/

if (usuarioMenuButton && usuarioDropdown) {
    usuarioMenuButton.addEventListener("click", (event) => {
        event.preventDefault();

        event.stopPropagation();

        usuarioDropdown.classList.toggle("show");
    });
}

/*
    Impedir que um clique
    dentro do dropdown feche
    o menu.
*/

if (usuarioDropdown) {
    usuarioDropdown.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

/*
    Clique fora fecha o menu.
*/

document.addEventListener("click", () => {
    if (usuarioDropdown) {
        usuarioDropdown.classList.remove("show");
    }
});

/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {
    logoutButton.addEventListener("click", (event) => {
        event.preventDefault();

        event.stopPropagation();

        console.log("Desconectando...");

        /*
                Primeiro remove o login.
            */

        localStorage.removeItem("usuario");

        /*
                Fecha a conexão.
            */

        try {
            socket.disconnect();
        } catch (error) {
            console.error("Erro ao desconectar:", error);
        }

        /*
                Substitui a página atual
                pelo login.

                replace() impede que o usuário
                simplesmente volte ao chat
                pelo botão voltar.
            */

        window.location.replace("/");
    });
}

/* =========================================================
   TECLA ENTER NO CAMPO DE MENSAGEM
========================================================= */

if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
        /*
                Enter envia a mensagem.

                Shift + Enter não envia.
            */

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (messageForm) {
                messageForm.requestSubmit();
            }
        }
    });
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

console.log("======================================");

console.log("ChatApp iniciado");

console.log("Usuário:", userName);

console.log("ID:", userId);

console.log("Canal inicial:", currentChannel);

console.log("======================================");
