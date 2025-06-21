document.addEventListener('DOMContentLoaded', () => {
    // --- URLs DA API ---
    const API_RESERVAS_URL = '/reservas';
    const API_RESTAURANTES_URL = '/restaurantes';
  
    // --- ELEMENTOS DO DOM ---
    const tabelaReservasBody = document.getElementById('tabela-reservas');
    const containerReservas = document.getElementById('reservas-container');
    const confirmacaoModal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
    const btnConfirmarCancelamento = document.getElementById('confirmar-cancelamento-btn');
  
    let reservaIdParaCancelar = null;
  
    /**
     * Função principal que orquestra o carregamento e exibição das reservas.
     */
    async function init() {
        console.log('🚀 Iniciando carregamento das reservas...');
    
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    console.log('👤 Usuario logado COMPLETO:', usuarioLogado);
    console.log('🔑 Chaves disponíveis:', Object.keys(usuarioLogado || {}));
    console.log('🆔 idUsuario atual:', usuarioLogado?.idUsuario);
    console.log('🆔 id alternativo:', usuarioLogado?.id);
  
        if (!usuarioLogado || usuarioLogado.type !== 'usuario') {
            mostrarMensagemDeErro("Você precisa estar logado como usuário para ver suas reservas.");
            return;
        }
  
        carregarEExibirReservas(usuarioLogado.id);
    }
  
    /**
     * Carrega os dados do servidor e popula a tabela de reservas.
     * @param {number} idUsuario - O ID do usuário logado.
     */
    async function carregarEExibirReservas(idUsuario) {console.log(`📡 Carregando reservas para o usuário ID: ${idUsuario}`);
        tabelaReservasBody.innerHTML = `<tr><td colspan="8" class="text-center">Carregando...</td></tr>`;
    
        try {
            console.log(`🔗 Fazendo requisições para:
                - Restaurantes: ${API_RESTAURANTES_URL}
                - Reservas: ${API_RESERVAS_URL} (todas, filtraremos por usuário)`);
            
            // 1. Busca todas as informações de restaurantes e reservas
            const [restaurantesResponse, reservasResponse] = await Promise.all([
                fetch(API_RESTAURANTES_URL),
                fetch(API_RESERVAS_URL) // MUDANÇA: Busca todas as reservas
            ]);
    
            console.log('📊 Status das respostas:', {
                restaurantes: restaurantesResponse.status,
                reservas: reservasResponse.status
            });
    
            if (!restaurantesResponse.ok || !reservasResponse.ok) {
                throw new Error('Falha ao carregar os dados do servidor.');
            }
    
            const restaurantes = await restaurantesResponse.json();
            const todasReservas = await reservasResponse.json();
            
            console.log('🏪 Restaurantes recebidos:', restaurantes.length);
            console.log('📅 Todas as reservas recebidas:', todasReservas.length);
            
            // NOVO: Filtra reservas do usuário específico
            const reservasDoUsuario = todasReservas.filter(reserva => {
                // Converte ambos para string para comparação segura
                const reservaUserId = String(reserva.idUsuario);
                const usuarioId = String(idUsuario);
                const pertenceAoUsuario = reservaUserId === usuarioId;
                
                console.log(`🔍 Reserva ID ${reserva.id}: idUsuario "${reservaUserId}" === "${usuarioId}" ? ${pertenceAoUsuario}`);
                return pertenceAoUsuario;
            });
            
            console.log('👤 Reservas do usuário:', reservasDoUsuario.length);
    
            // 2. Mapeia os restaurantes por ID para acesso rápido ao nome
            const mapaRestaurantes = restaurantes.reduce((map, restaurante) => {
                map[restaurante.id] = restaurante.infoCadastro?.nome || restaurante.nome || 'Nome não encontrado';
                return map;
            }, {});
    
            // 3. Filtra apenas as reservas que não estão canceladas
            const reservasAtivas = reservasDoUsuario.filter(reserva => 
                !reserva.status || reserva.status.toLowerCase() !== 'cancelada'
            );
            
            console.log('✅ Reservas ativas:', reservasAtivas.length);
    
            renderizarTabela(reservasAtivas, mapaRestaurantes);
    
        } catch (error) {
            console.error("💥 Erro ao carregar reservas:", error);
            mostrarMensagemDeErro("Não foi possível carregar suas reservas. Tente novamente mais tarde.");
        }
    }
  
    /**
     * Renderiza as linhas da tabela com os dados das reservas.
     * @param {Array} reservas - A lista de reservas ativas do usuário.
     * @param {Object} mapaRestaurantes - Um objeto mapeando ID de restaurante para nome.
     */
    function renderizarTabela(reservas, mapaRestaurantes) {
        tabelaReservasBody.innerHTML = '';
  
        if (reservas.length === 0) {
            tabelaReservasBody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhuma reserva ativa encontrada.</td></tr>`;
            return;
        }
  
        reservas.forEach(reserva => {
            const nomeRestaurante = mapaRestaurantes[reserva.idRestaurante] || 'Restaurante não encontrado';
            const linha = document.createElement('tr');
            linha.id = `reserva-${reserva.id}`;
            linha.innerHTML = `
                <td>${nomeRestaurante}</td>
                <td>${formatarStatus(reserva.status)}</td>
                <td>${new Date(reserva.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>${reserva.horario}</td>
                <td>Mesa ${reserva.numeroMesa}</td>
                <td>${reserva.qtdPessoas}</td>
                <td>${reserva.estacionamento}</td>
                <td>
                    <button class="btn btn-sm btn-danger cancelar-btn" data-id="${reserva.id}" data-bs-toggle="modal" data-bs-target="#confirmacaoModal">
                        <i class="bi bi-trash"></i> Cancelar
                    </button>
                </td>
            `;
            tabelaReservasBody.appendChild(linha);
        });
    }
  
    /**
     * Formata o status da reserva com um badge colorido do Bootstrap.
     */
    function formatarStatus(status) {
        if (!status) return `<span class="badge bg-secondary">Indefinido</span>`;
        switch (status.toLowerCase()) {
            case 'confirmada': return '<span class="badge bg-success">Confirmada</span>';
            case 'pendente': return '<span class="badge bg-warning text-dark">Pendente</span>';
            default: return `<span class="badge bg-secondary">${status}</span>`;
        }
    }
  
    /**
     * Mostra uma mensagem de erro no lugar da tabela.
     */
    function mostrarMensagemDeErro(mensagem) {
        containerReservas.innerHTML = `<div class="alert alert-danger text-center">${mensagem}</div>`;
    }
  
    /**
     * Lida com o clique para cancelar uma reserva, enviando uma requisição PATCH.
     * @param {string|number} id - O ID da reserva a ser cancelada.
     */
    async function cancelarReserva(id) {
        try {
            const response = await fetch(`${API_RESERVAS_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelada' }),
            });
  
            if (!response.ok) {
                throw new Error('Falha ao cancelar a reserva no servidor.');
            }
  
            // Remove a linha da tabela para feedback visual imediato
            const linhaParaRemover = document.getElementById(`reserva-${id}`);
            if (linhaParaRemover) {
                linhaParaRemover.remove();
            }
  
            // Verifica se a tabela ficou vazia após a remoção
            if (tabelaReservasBody.children.length === 0) {
                tabelaReservasBody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhuma reserva ativa encontrada.</td></tr>`;
            }
  
        } catch (error) {
            console.error("Erro ao cancelar reserva:", error);
            alert("Não foi possível cancelar a reserva. Tente novamente.");
        }
    }
  
    // --- EVENT LISTENERS ---
  
    // Delegação de evento para capturar cliques nos botões de cancelar na tabela
    tabelaReservasBody.addEventListener('click', (event) => {
        const cancelarBtn = event.target.closest('.cancelar-btn');
        if (cancelarBtn) {
            // CORREÇÃO: Removido o parseInt. O ID agora é tratado como texto.
            reservaIdParaCancelar = cancelarBtn.dataset.id;
            confirmacaoModal.show();
        }
    });
  
    // Evento de clique para o botão de confirmação do modal
    btnConfirmarCancelamento.addEventListener('click', () => {
        if (reservaIdParaCancelar !== null) {
            cancelarReserva(reservaIdParaCancelar);
            confirmacaoModal.hide();
            reservaIdParaCancelar = null;
        }
    });
  
    // Inicia a aplicação
    init();
  });