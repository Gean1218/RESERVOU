document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroFormUsuario');
  
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
  
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const messageDiv = document.getElementById('message');
        
        messageDiv.style.display = 'none';
  
        if (password !== confirmPassword) {
            messageDiv.className = 'message error';
            messageDiv.textContent = 'As senhas não coincidem!';
            messageDiv.style.display = 'block';
            return;
        }
  
        // 1. Verifica se o email já está em uso fazendo uma chamada à API
        try {
          const checkEmailResponse = await fetch(`/usuarios?email=${email}`);
          const existingUsers = await checkEmailResponse.json();
  
          if (existingUsers.length > 0) {
              messageDiv.className = 'message error';
              messageDiv.textContent = 'Este email já está cadastrado.';
              messageDiv.style.display = 'block';
              return;
          }
  
          // 2. Cria o novo usuário com o campo "nome"
          const novoUsuario = {
              nome: nome,
              email: email,
              password: password,
              restaurantesFavoritos: [] // Inicializa favoritos como um array vazio
          };
  
          // 3. Envia o novo usuário para o servidor via POST
          const createUserResponse = await fetch('/usuarios', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(novoUsuario)
          });
  
          if (!createUserResponse.ok) {
              throw new Error('Não foi possível realizar o cadastro.');
          }
  
          messageDiv.className = 'message success';
          messageDiv.textContent = 'Cadastro realizado com sucesso! Você já pode fazer o login.';
          messageDiv.style.display = 'block';
          
          form.reset();
  
        } catch (error) {
          console.error('Erro no cadastro:', error);
          messageDiv.className = 'message error';
          messageDiv.textContent = 'Ocorreu um erro no servidor. Tente novamente mais tarde.';
          messageDiv.style.display = 'block';
        }
    });
  });