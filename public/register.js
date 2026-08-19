document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registroForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        const nome = formData.get("nome");

        const email = formData.get("email");

        const senha = formData.get("senha");

        try {
            const response = await fetch("/api/register", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);

                return;
            }

            alert("Usuário cadastrado com sucesso!");

            window.location.href = "/";
        } catch (error) {
            console.error(error);

            alert("Erro ao conectar com o servidor.");
        }
    });
});
