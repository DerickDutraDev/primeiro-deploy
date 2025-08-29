const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (supabase) => {

    // Adicionar cliente à fila (público)
    router.post('/join-queue', async (req, res) => {
        console.log("Rota POST /join-queue acionada.");
        const { name, barber } = req.body;
        const clientId = crypto.randomUUID();

        if (!name || !barber) {
            console.log("Dados ausentes. Retornando 400.");
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            console.log("Tentando inserir cliente no Supabase.");
            await supabase
                .from('clients')
                .insert([{ id: clientId, name, barber: barber.toLowerCase() }]);
            console.log("Cliente inserido com sucesso.");

            console.log("Buscando posição do cliente na fila.");
            const { data: rows, error } = await supabase
                .from('clients')
                .select('id')
                .eq('barber', barber.toLowerCase())
                .order('timestamp', { ascending: true });

            if (error) {
                console.error("Erro ao buscar a posição do cliente:", error);
                throw error;
            }

            const position = rows.findIndex(row => row.id === clientId) + 1;
            console.log("Posição na fila encontrada:", position);
            
            res.status(201).json({
                message: 'Cliente adicionado à fila com sucesso!',
                clientId,
                position
            });

        } catch (err) {
            console.error('Erro inesperado na rota /join-queue:', err);
            res.status(500).json({ error: 'Erro ao adicionar cliente na fila.' });
        }
    });

    // Remover cliente da fila (público ou logout)
    router.post('/leave-queue', async (req, res) => {
        console.log("Rota POST /leave-queue acionada.");
        const { clientId } = req.body;
        if (!clientId) {
            console.log("ID do cliente ausente.");
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }

        try {
            console.log("Tentando remover cliente do Supabase.");
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error("Erro ao remover cliente:", error);
                throw error;
            }

            console.log("Cliente removido com sucesso.");
            res.status(200).json({ message: 'Cliente removido da fila.' });
        } catch (err) {
            console.error('Erro inesperado na rota /leave-queue:', err);
            res.status(500).json({ error: 'Erro ao remover cliente da fila.' });
        }
    });

    // Atender cliente (usado pelo barbeiro)
    router.post('/serve-client', async (req, res) => {
        console.log("Rota POST /serve-client acionada.");
        const { clientId } = req.body;
        if (!clientId) {
            console.log("ID do cliente ausente.");
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }

        try {
            console.log("Tentando atender o cliente e removê-lo da fila.");
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error("Erro ao atender cliente:", error);
                throw error;
            }

            console.log("Cliente atendido e removido com sucesso.");
            res.status(200).json({ message: 'Cliente atendido com sucesso.' });
        } catch (err) {
            console.error('Erro inesperado na rota /serve-client:', err);
            res.status(500).json({ error: 'Erro ao atender cliente.' });
        }
    });

    // Adicionar cliente manualmente (dashboard)
    router.post('/adicionar-cliente-manual', async (req, res) => {
        console.log("Rota POST /adicionar-cliente-manual acionada.");
        const { nome, barber } = req.body;
        const clientId = crypto.randomUUID();

        if (!nome || !barber) {
            console.log("Nome ou barbeiro ausentes.");
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            console.log("Tentando adicionar cliente manualmente no Supabase.");
            const { data, error } = await supabase
                .from('clients')
                .insert([{ id: clientId, name: nome, barber: barber.toLowerCase() }])
                .select()
                .single();

            if (error) {
                console.error("Erro ao adicionar cliente manualmente:", error);
                throw error;
            }

            console.log("Cliente adicionado manualmente com sucesso.");
            res.status(201).json({
                message: 'Cliente adicionado manualmente com sucesso!',
                clientId: data.id
            });

        } catch (err) {
            console.error('Erro inesperado na rota /adicionar-cliente-manual:', err);
            res.status(500).json({ error: 'Erro ao adicionar cliente manualmente.' });
        }
    });

    // Obter fila completa (dashboard)
    router.get('/queues', async (req, res) => {
        console.log("Rota GET /queues acionada.");
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };

        try {
            console.log("Buscando todas as filas...");
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
            
            console.log("Busca por todas as filas concluída. Retornando resposta.");
            res.status(200).json(queues);

        } catch (err) {
            console.error('Erro inesperado na rota /queues:', err);
            res.status(500).json({ error: 'Erro ao buscar filas.' });
        }
    });

    return router;
};