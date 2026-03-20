require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const XLSX = require('xlsx');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// ===== CARREGAR XLSX =====
const workbook = XLSX.readFile("NPC's Valkaria.xlsx");

const npcs = XLSX.utils.sheet_to_json(workbook.Sheets["NPCs"]);
const locais = XLSX.utils.sheet_to_json(workbook.Sheets["Locais"]);

// ===== NORMALIZAÇÃO =====
function normalize(text) {
  return text?.toLowerCase().trim();
}

// ===== MAPEAMENTO MANUAL =====
const mapa = {
  "aaliyah": "casa de banho",
  "andris": "pesqueiro",
  "artemisia": "taverna",
  "ahstad & khordad": "antiquário",
  "barossa": "biblioteca",
  "bragi": "taverna",
  "caliandre": "arena",
  "eh'mmed": "biblioteca",
  "frann": "laboratório",
  "harko": "oficina",
  "juno": "arena",
  "kandor": "oficina",
  "lassance": "bosque",
  "lyssara": "mercado",
  "mahin": "estalagem",
  "myssia": "guilda",
  "nahiri": "mercado",
  "nerus": "pesqueiro",
  "nima": "taverna",
  "nthanda": "laboratório",
  "phylla": "oficina",
  "punddin": "churrascaria",
  "rafiq": "templo",
  "tanit": "templo",
  "teclis": "biblioteca",
  "tharuk": "mercado",
  "tonhão": "churrascaria",
  "viridiane": "bosque"
};

// ===== BUSCA NPC =====
function buscarNPC(nome) {
  const termo = normalize(nome);
  return npcs.filter(n => normalize(n.Nome).includes(termo));
}

// ===== BUSCA LOCAL =====
function buscarLocal(nome) {
  const termo = normalize(nome);

  const local = locais.find(l =>
    normalize(l.Local).includes(termo)
  );

  const personagens = Object.entries(mapa)
    .filter(([_, loc]) => normalize(loc) === termo)
    .map(([nome]) => nome);

  return { local, personagens };
}

// ===== FORMATADORES =====
function formatNPC(npc) {
  return `
**Nome:**  
${npc.Nome || "N/A"}

**Local:**  
${npc.Local || "N/A"}

**Descrição:**  
${npc.Descrição || "N/A"}

**Cordial:**  
${npc.Cordial || "N/A"}

**Leal:**  
${npc.Leal || "N/A"}

**Intimo:**  
${npc.Intimo || "N/A"}

**Interesse(s):**  
${npc["Interesse(s)"] || "N/A"}

**Final Quest:**  
${npc["Final Quest"] || "N/A"}
`;
}

function formatLocal(data) {
  if (!data.local) return "Local não encontrado.";

  return `
**Local:**  
${data.local.Local}

**Função:**  
${data.local.Função}

**Descrição:**  
${data.local.Descrição}

**Serviço:**  
${data.local.Serviço}

**Honraria:**  
${data.local.Honraria}

**Personagens no Local:**  
${data.personagens.length ? data.personagens.join("\n") : "N/A"}
`;
}

// ===== EVENTO =====
client.on("messageCreate", msg => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (!msg.content.startsWith("!")) return;

  const [cmd, ...args] = msg.content.slice(1).split(" ");
  const query = args.join(" ");

  if (cmd === "/npc") {
    const result = buscarNPC(query);

    if (!result.length) {
      msg.reply("Nenhum NPC encontrado.");
      return;
    }

    result.forEach(n => msg.reply(formatNPC(n)));
  }

  if (cmd === "/local") {
    const result = buscarLocal(query);
    msg.reply(formatLocal(result));
  }
});

client.login(process.env.TOKEN);