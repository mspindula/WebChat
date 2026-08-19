document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (!loginForm) {
            return;
        }


        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const formData =
                    new FormData(
                        loginForm
                    );


                const email =
                    formData.get(
                        "email"
                    );


                const senha =
                    formData.get(
                        "senha"
                    );


                try {

                    const response =
                        await fetch(
                            "/api/login",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        email,
                                        senha
                                    })

                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            data.message ||
                            "Email ou senha incorretos."
                        );

                        return;

                    }


                    /*
                     * Salva o usuário
                     * logado no navegador.
                     */

                    localStorage.setItem(
                        "usuario",
                        JSON.stringify(
                            data.usuario
                        )
                    );


                    /*
                     * Vai para o chat.
                     */

                    window.location.href =
                        "/chat";


                } catch (error) {

                    console.error(
                        "Erro no login:",
                        error
                    );


                    alert(
                        "Erro ao conectar com o servidor."
                    );

                }

            }
        );

    }
);