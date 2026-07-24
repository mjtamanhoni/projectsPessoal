package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/config"
)

type TestPageHandler struct {
	Pool *pgxpool.Pool
	Cfg  *config.Config
}

func (h *TestPageHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	dbStatus := "connected"

	err := h.Pool.Ping(r.Context())
	if err != nil {
		dbStatus = fmt.Sprintf("disconnected: %v", err)
		status = "error"
	}

	resp := map[string]interface{}{
		"status":    status,
		"server":    "Gestor Financeiro - Go",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
		"database":  dbStatus,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *TestPageHandler) TestPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestor Server - Teste</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f0f2f5; color: #333; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { color: #1a73e8; margin-bottom: 10px; }
        .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card h2 { font-size: 16px; color: #555; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .info-row { display: flex; padding: 6px 0; }
        .info-label { width: 160px; font-weight: 600; color: #555; }
        .info-value { flex: 1; color: #333; }
        .status-ok { color: #0f9d58; font-weight: 600; }
        .status-error { color: #d93025; font-weight: 600; }
        .test-section { margin-top: 15px; }
        .endpoint { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
        .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; min-width: 50px; text-align: center; }
        .get { background: #e3f2fd; color: #1565c0; }
        .post { background: #e8f5e9; color: #2e7d32; }
        .put { background: #fff3e0; color: #e65100; }
        .delete { background: #fce4ec; color: #c62828; }
        .path { margin-left: 10px; font-family: 'Consolas', monospace; font-size: 13px; color: #333; flex: 1; }
        .test-btn { background: #1a73e8; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .test-btn:hover { background: #1557b0; }
        #result { background: #263238; color: #e0e0e0; padding: 15px; border-radius: 6px; font-family: 'Consolas', monospace; font-size: 13px; white-space: pre-wrap; min-height: 60px; max-height: 400px; overflow: auto; }
        input, textarea { width: 100%: padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; font-family: 'Consolas', monospace; font-size: 13px; }
        .send-btn { background: #0f9d58; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .send-btn:hover { background: #0b8043; }
        .input-group { margin-bottom: 10px; }
        .input-group label { display: block; font-size: 12px; color: #666; margin-bottom: 3px; }
        .input-group input, .input-group textarea { width: 100%%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 13px; }
        .json-editor { display: flex; gap: 10px; }
        .json-editor textarea { flex: 1; min-height: 120px; }
        .flex-row { display: flex; gap: 10px; align-items: flex-end; }
        .flex-row .input-group { flex: 1; }
        .tab { display: inline-block; padding: 8px 16px; cursor: pointer; border-radius: 4px 4px 0 0; font-size: 13px; }
        .tab.active { background: #fff; font-weight: 600; border: 1px solid #ddd; border-bottom: 2px solid #1a73e8; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Gestor Financeiro - Servidor Go</h1>
        <p style="color:#666;margin-bottom:20px;">Página de teste e monitoramento</p>

        <div class="card" id="status-card">
            <h2>Status do Servidor</h2>
            <div class="info-row"><span class="info-label">Porta:</span><span class="info-value">%[1]s</span></div>
            <div class="info-row"><span class="info-label">Banco:</span><span class="info-value">%[2]s@%[3]s:%[4]s/%[5]s</span></div>
            <div class="info-row"><span class="info-label" id="db-label">Banco:</span><span class="info-value" id="db-status">Verificando...</span></div>
        </div>

        <div class="card">
            <h2>Testar Endpoints</h2>
            <div class="tabs">
                <span class="tab active" onclick="showTab('get-tab', this)">GET</span>
                <span class="tab" onclick="showTab('post-tab', this)">POST / PUT</span>
                <span class="tab" onclick="showTab('delete-tab', this)">DELETE</span>
            </div>

            <div id="get-tab" class="tab-content active">
                <p style="margin:10px 0;color:#666;font-size:13px;">Selecione um endpoint GET para testar</p>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:#666;">Endpoint:</label>
                    <select id="get-endpoint" style="width:100%%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        <optgroup label="Públicos">
                            <option value="/empresaPublic">GET /empresaPublic</option>
                            <option value="/health">GET /health</option>
                        </optgroup>
                        <optgroup label="Autenticados (insira token abaixo)">
                            <option value="/usuario">GET /usuario</option>
                            <option value="/fornecedor">GET /fornecedor</option>
                            <option value="/cliente">GET /cliente</option>
                            <option value="/categoriaPagar">GET /categoriaPagar</option>
                            <option value="/categoriaReceber">GET /categoriaReceber</option>
                            <option value="/contasPagar">GET /contasPagar</option>
                            <option value="/contasReceber">GET /contasReceber</option>
                            <option value="/servico">GET /servico</option>
                            <option value="/insumo">GET /insumo</option>
                            <option value="/produtoFabricado">GET /produtoFabricado</option>
                            <option value="/formulario">GET /formulario</option>
                            <option value="/modulo">GET /modulo</option>
                            <option value="/dashboard">GET /dashboard</option>
                            <option value="/permissao">GET /permissao</option>
                        </optgroup>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token JWT (para endpoints autenticados):</label>
                    <input type="text" id="token-input" placeholder="Cole o token aqui..." style="width:100%%;">
                </div>
                <div class="flex-row">
                    <div class="input-group">
                        <label>Parâmetros Query (opcional):</label>
                        <input type="text" id="query-params" placeholder="ex: ?id=1&nome=teste" style="width:100%%;">
                    </div>
                    <button class="send-btn" onclick="testGet()">Testar</button>
                </div>
            </div>

            <div id="post-tab" class="tab-content">
                <p style="margin:10px 0;color:#666;font-size:13px;">Selecione um endpoint e insira o JSON do body</p>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:#666;">Endpoint:</label>
                    <select id="post-endpoint" style="width:100%%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        <option value="/usuario">POST /usuario</option>
                        <option value="/fornecedor">POST /fornecedor</option>
                        <option value="/cliente">POST /cliente</option>
                        <option value="/categoriaPagar">POST /categoriaPagar</option>
                        <option value="/categoriaReceber">POST /categoriaReceber</option>
                        <option value="/contasPagar">POST /contasPagar</option>
                        <option value="/contasReceber">POST /contasReceber</option>
                        <option value="/servico">POST /servico</option>
                        <option value="/insumo">POST /insumo</option>
                        <option value="/produtoFabricado">POST /produtoFabricado</option>
                        <option value="/formulario">POST /formulario</option>
                        <option value="/modulo">POST /modulo</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token JWT:</label>
                    <input type="text" id="post-token" placeholder="Cole o token..." style="width:100%%;">
                </div>
                <div class="input-group">
                    <label>Body JSON:</label>
                    <textarea id="post-body" rows="5" style="width:100%%;font-family:Consolas,monospace;font-size:13px;">{
    "id": 0,
    "nome": "Teste",
    "email": "teste@teste.com"
}</textarea>
                </div>
                <button class="send-btn" onclick="testPost()">Enviar</button>
            </div>

            <div id="delete-tab" class="tab-content">
                <p style="margin:10px 0;color:#666;font-size:13px;">Selecione um endpoint DELETE</p>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:#666;">Endpoint:</label>
                    <select id="delete-endpoint" style="width:100%%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        <option value="/usuario?id=0">DELETE /usuario</option>
                        <option value="/fornecedor?id=0">DELETE /fornecedor</option>
                        <option value="/cliente?id=0">DELETE /cliente</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Token JWT:</label>
                    <input type="text" id="delete-token" placeholder="Cole o token..." style="width:100%%;">
                </div>
                <button class="send-btn" onclick="testDelete()">Excluir</button>
            </div>

            <div style="margin-top:15px;">
                <h3 style="font-size:14px;color:#555;margin-bottom:8px;">Resultado:</h3>
                <div id="result">Clique em "Testar" para ver o resultado aqui.</div>
            </div>
        </div>
    </div>

    <script>
        function showTab(tabId, el) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            el.classList.add('active');
        }

        function getToken() {
            return document.getElementById('token-input').value || '';
        }

        function showResult(data) {
            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
        }

        function testGet() {
            const endpoint = document.getElementById('get-endpoint').value;
            const params = document.getElementById('query-params').value;
            const token = getToken();
            const url = endpoint + (params || '');

            fetch(url, {
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            })
            .then(r => r.json().catch(() => r.text()))
            .then(data => showResult(data))
            .catch(err => showResult({ erro: err.message }));
        }

        function testPost() {
            const endpoint = document.getElementById('post-endpoint').value;
            const token = document.getElementById('post-token').value || getToken();
            let body;
            try {
                body = JSON.parse(document.getElementById('post-body').value);
            } catch(e) {
                showResult({ erro: 'JSON inválido: ' + e.message });
                return;
            }

            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                },
                body: JSON.stringify(body)
            })
            .then(r => r.json().catch(() => r.text()))
            .then(data => showResult(data))
            .catch(err => showResult({ erro: err.message }));
        }

        function testDelete() {
            const endpoint = document.getElementById('delete-endpoint').value;
            const token = document.getElementById('delete-token').value || getToken();

            fetch(endpoint, {
                method: 'DELETE',
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            })
            .then(r => r.json().catch(() => r.text()))
            .then(data => showResult(data))
            .catch(err => showResult({ erro: err.message }));
        }

        // Health check on load
        fetch('/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('db-status').textContent = data.database;
                document.getElementById('db-status').className = data.status === 'ok' ? 'status-ok' : 'status-error';
            })
            .catch(() => {
                document.getElementById('db-status').textContent = 'Desconectado';
                document.getElementById('db-status').className = 'status-error';
            });
    </script>
</body>
</html>`, h.Cfg.ServerPort, h.Cfg.DBUser, h.Cfg.DBHost, h.Cfg.DBPort, h.Cfg.DBName)

	fmt.Fprint(w, html)
}
