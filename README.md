# Discord Bot

Este é um bot do Discord para consultar NPCs e locais de Valkaria usando dados de um arquivo Excel.

## Instalação

1. Instale as dependências:
   ```
   npm install
   ```

2. Copie o arquivo `NPC's Valkaria.xlsx` para a raiz do projeto.

3. Edite o arquivo `.env` e substitua `YOUR_BOT_TOKEN_HERE` pelo token do seu bot do Discord.

## Como obter o token do bot

1. Vá para o [Discord Developer Portal](https://discord.com/developers/applications).
2. Crie uma nova aplicação ou selecione uma existente.
3. Vá para a aba "Bot" e copie o token.

## Executar localmente

```
npm start
```

## Comandos

- `/npc <nome>`: Busca por NPCs.
- `/local <nome>`: Busca por locais.

## Deploy para produção

Para manter o bot online 24/7, faça o deploy em uma plataforma como Railway ou Heroku.

### Passo a passo com Railway (recomendado):

1. Crie uma conta no [Railway](https://railway.app).
2. Crie um repositório no GitHub e faça push do código do projeto.
3. No Railway, clique em "New Project" > "Deploy from GitHub repo".
4. Conecte seu repositório GitHub.
5. Adicione a variável de ambiente `TOKEN` com o valor do seu token do Discord (no painel do Railway, em Variables).
6. O deploy será automático. O bot ficará online.

Certifique-se de que o arquivo `NPC's Valkaria.xlsx` está no repositório (não ignore no .gitignore).