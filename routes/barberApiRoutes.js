const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (supabase) => {

    // Atender um cliente (remove da fila)
    router.post('/serve-client', async (req, res) => {
        console.log("Rota POST /serve-client acionada.");
        const { clientId } = req.body;
        if (!clientId) {
            console.log("ID do cliente não fornecido.");
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }

        try {
            console.log(`Tentando remover o cliente com ID ${clientId}.`);
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error('Erro ao remover cliente:', error);
                throw error;
            }

            console.log("Cliente removido com sucesso.");
            res.status(200).json({ message: 'Cliente atendido com sucesso.' });
        } catch (err) {
            console.error('Erro inesperado na rota /serve-client:', err);
            res.status(500).json({ error: 'Erro ao atender cliente.' });
        }
    });

    // Adicionar cliente manualmente
    router.post('/adicionar-cliente-manual', async (req, res) => {
        console.log("Rota POST /adicionar-cliente-manual acionada.");
        const { nome, barber } = req.body;
        const clientId = crypto.randomUUID();

        if (!nome || !barber) {
            console.log("Nome ou barbeiro ausentes.");
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            console.log("Tentando inserir cliente manualmente no Supabase.");
            const { data, error } = await supabase
                .from('clients')
                .insert([{ id: clientId, name: nome, barber: barber.toLowerCase() }])
                .select()
                .single();

            if (error) {
                console.error("Erro ao inserir cliente manualmente:", error);
                throw error;
            }
            
            console.log("Cliente adicionado manualmente com sucesso.");
            res.status(201).json({
                message: 'Cliente adicionado manualmente com sucesso!',
                clientId: data.id
            });
        } catch (err) {
            console.error('Erro inesperado na rota /adicionar-cliente-manual:', err);
            res.status(500).json({ error: 'Erro ao adicionar cliente na fila.' });
        }
    });

    // Obter fila completa
    router.get('/queues', async (req, res) => {
        console.log("Rota GET /queues acionada.");
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };

        try {
            console.log("Iniciando a busca por todas as filas.");
            await Promise.all(barbers.map(async barber => {
                console.log(`Buscando fila do barbeiro ${barber}.`);
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('barber', barber)
                    .order('timestamp', { ascending: true });

                if (error) {
                    console.error(`Erro ao buscar fila do barbeiro ${barber}:`, error.message);
                    queues[barber] = [];
                } else {
                    console.log(`Fila de ${barber} encontrada:`, data.length, "clientes.");
                    queues[barber] = data.map(row => ({ clientId: row.id, name: row.name }));
                }
            }));

            console.log("Todas as filas foram processadas. Retornando resposta.");
            res.status(200).json(queues);
        } catch (err) {
            console.error('Erro inesperado na rota /queues:', err);
            res.status(500).json({ error: 'Erro ao buscar filas.' });
        }
    });

    return router;
};