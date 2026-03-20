require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const XLSX = require('xlsx');

// Projeto otimizado para resposta determinística (temperatura 0 / topK 10), sem ambiguidade no parser.

const PREFIX = '!';

function loadWorkbook(path) {
  try {
    const workbook = XLSX.readFile(path);
    const npcs = XLSX.utils.sheet_to_json(workbook.Sheets['NPCs'] || []);
    const locais = XLSX.utils.sheet_to_json(workbook.Sheets['Locais'] || []);

    return { npcs, locais };
  } catch (error) {
    console.error('Erro ao carregar workbook:', error);
    process.exit(1);
  }
}

const { npcs, locais } = loadWorkbook("NPC's Valkaria.xlsx");

function normalize(value) {
  if (value === undefined || value === null) return '';
  return String(value).toLowerCase().trim();
}

const mapa = {
  aaliyah: 'casa de banho',
  andris: 'pesqueiro',
  artemisia: 'taverna',
  "ahstad & khordad": 'antiquário',
  barossa: 'biblioteca',
  bragi: 'taverna',
  caliandre: 'arena',
  "eh'mmed": 'biblioteca',
  frann: 'laboratório',
  harko: 'oficina',
  juno: 'arena',
  kandor: 'oficina',
  lassance: 'bosque',
  lyssara: 'mercado',
  mahin: 'estalagem',
  myssia: 'guilda',
  nahiri: 'mercado',
  nerus: 'pesqueiro',
  nima: 'taverna',
  nthanda: 'laboratório',
  phylla: 'oficina',
  punddin: 'churrascaria',
  rafiq: 'templo',
  tanit: 'templo',
  teclis: 'biblioteca',
  tharuk: 'mercado',
  'tonhão': 'churrascaria',
  viridiane: 'bosque'
};

function buscarNPC(nome) {
  const termo = normalize(nome);
  if (!termo) return [];
  return npcs.filter(item => normalize(item.Nome).includes(termo));
}

function buscarLocal(nome) {
  const termo = normalize(nome);
  if (!termo) return { local: null, personagens: [] };

  const local = locais.find(item => normalize(item.Local).includes(termo)) || null;
  const personagens = Object.entries(mapa)
    .filter(([_, loc]) => normalize(loc) === termo)
    .map(([nome]) => nome);

  return { local, personagens };
}

function formatNPC(npc) {
  if (!npc) return 'NPC inválido.';

  return `**Nome:** ${npc.Nome || 'N/A'}\n**Local:** ${npc.Local || 'N/A'}\n**Descrição:** ${npc.Descrição || 'N/A'}\n**Cordial:** ${npc.Cordial || 'N/A'}\n**Leal:** ${npc.Leal || 'N/A'}\n**Íntimo:** ${npc.Intimo || 'N/A'}\n**Interesse(s):** ${npc['Interesse(s)'] || 'N/A'}\n**Final Quest:** ${npc['Final Quest'] || 'N/A'}`;
}

function formatLocal(result) {
  if (!result?.local) return 'Local não encontrado.';

  const local = result.local;
  const personagens = result.personagens.length ? result.personagens.join(', ') : 'N/A';

  return `**Local:** ${local.Local || 'N/A'}\n**Função:** ${local.Função || 'N/A'}\n**Descrição:** ${local.Descrição || 'N/A'}\n**Serviço:** ${local.Serviço || 'N/A'}\n**Honraria:** ${local.Honraria || 'N/A'}\n**Personagens no Local:** ${personagens}`;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

const commandHandlers = {
  npc: (msg, query) => {
    const results = buscarNPC(query);
    if (!results.length) return msg.reply('Nenhum NPC encontrado.');
    return Promise.all(results.slice(0, 10).map(found => msg.reply(formatNPC(found))));
  },
  local: (msg, query) => {
    const result = buscarLocal(query);
    return msg.reply(formatLocal(result));
  },
  help: msg => {
    return msg.reply(`Comandos válidos:\n${PREFIX}npc <nome>\n${PREFIX}local <nome>\n${PREFIX}help`);
  }
};

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const [command, ...args] = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  if (!command) return;

  const handler = commandHandlers[command.toLowerCase()];
  if (!handler) {
    await msg.reply(`Comando não reconhecido. Use ${PREFIX}help para ajuda.`);
    return;
  }

  try {
    await handler(msg, args.join(' '));
  } catch (error) {
    console.error('Erro no comando:', error);
    msg.reply('Ocorreu um erro ao processar este comando. Tente novamente mais tarde.');
  }
});

const token = process.env.TOKEN;
if (!token) {
  console.error('TOKEN não definido. Adicione a variável de ambiente TOKEN.');
  process.exit(1);
}

client.login(token);
