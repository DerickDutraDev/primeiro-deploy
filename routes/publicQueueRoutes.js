const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (supabaseAdmin) => {

    // Adicionar cliente na fila
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
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('clients')
                .insert([{
                    id: clientId,
                    name,
                    barber: barber.toLowerCase(),
                    status: 'waiting',
                    timestamp: new Date().toISOString()
                }])
                .select();

            if (insertError) {
                console.error('Erro detalhado do Supabase na inserção:', insertError);
                return res.status(500).json({ 
                    error: 'Erro ao adicionar cliente na fila.', 
                    details: insertError 
                });
            }

            console.log("Cliente inserido com sucesso. Buscando a posição na fila.");
            const { data: rows, error } = await supabaseAdmin
                .from('clients')
                .select('id')
                .eq('barber', barber.toLowerCase())
                .eq('status', 'waiting')
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Erro ao buscar fila:', error);
                return res.status(500).json({ error: 'Erro ao buscar fila.', details: error });
            }

            const position = rows.findIndex(row => row.id === clientId) + 1;
            console.log("Posição na fila encontrada:", position);
            
            // Remoção automática só após insert confirmado
            setTimeout(async () => {
                try {
                    await supabaseAdmin.from('clients').delete().eq('id', clientId);
                    console.log(`Cliente ${clientId} removido automaticamente da fila.`);
                } catch (err) {
                    console.error('Erro ao remover cliente automaticamente:', err.message);
                }
            }, 780000); // 780 segundos

            res.status(201).json({
                message: 'Cliente adicionado à fila com sucesso!',
                clientId,
                position
            });

        } catch (err) {
            console.error('Erro inesperado na rota /join-queue:', err);
            res.status(500).json({ error: 'Erro ao adicionar cliente na fila.', details: err });
        }
    });

    // Remover cliente da fila manualmente
    router.post('/leave-queue', async (req, res) => {
        console.log("Rota POST /leave-queue acionada.");
        const { clientId } = req.body;
        if (!clientId) {
            console.log("ID do cliente ausente.");
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }

        try {
            console.log("Tentando remover cliente do Supabase.");
            const { error } = await supabaseAdmin
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error('Erro ao remover cliente:', error);
                return res.status(500).json({ error: 'Erro ao remover cliente da fila.', details: error });
            }

            console.log("Cliente removido com sucesso.");
            res.status(200).json({ message: 'Cliente removido da fila.' });
        } catch (err) {
            console.error('Erro inesperado na rota /leave-queue:', err);
            res.status(500).json({ error: 'Erro ao remover cliente da fila.', details: err });
        }
    });

    // Obter a fila completa (público)
    router.get('/queues', async (req, res) => {
        console.log("Rota GET /queues acionada.");
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };

        try {
            console.log("Buscando todas as filas...");
            await Promise.all(barbers.map(async barber => {
                console.log(`Buscando fila do barbeiro ${barber}.`);
                const { data, error } = await supabaseAdmin
                    .from('clients')
                    .select('id, name')
                    .eq('barber', barber)
                    .eq('status', 'waiting')
                    .order('timestamp', { ascending: true });

                if (error) {
                    console.error(`Erro ao buscar fila do barbeiro ${barber}:`, error);
                    queues[barber] = [];
                } else {
                    console.log(`Fila de ${barber} encontrada:`, data.length, "clientes.");
                    queues[barber] = data.map(row => ({
                        clientId: row.id,
                        name: row.name
                    }));
                }
            }));
            
            console.log("Busca por todas as filas concluída.");
            res.status(200).json(queues);

        } catch (err) {
            console.error('Erro inesperado na rota /queues:', err);
            res.status(500).json({ error: 'Erro ao buscar filas.', details: err });
        }
    });

    return router;
};