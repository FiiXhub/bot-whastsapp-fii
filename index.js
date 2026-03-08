const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} = require("@whiskeysockets/baileys")

const P = require("pino")

let welcomeGroups = new Set()
let antilinkGroups = new Set()
let undanganGroups = {}

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
logger: P({ level: "silent" }),
auth: state,
version,
printQRInTerminal: false
})

sock.ev.on("creds.update", saveCreds)

console.log("Bot WhatsApp Aktif")

// CONNECTION EVENT
sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

if(connection === "connecting"){
console.log("Menghubungkan ke WhatsApp...")
}

if(connection === "open"){
console.log("✅ Bot terhubung")
}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

console.log("Koneksi terputus")

if(shouldReconnect){
startBot()
}

}

// PAIRING CODE
if(!sock.authState.creds.registered){

const phoneNumber = "6287886582175" // GANTI NOMOR KAMU

try{

const code = await sock.requestPairingCode(phoneNumber)

console.log("================================")
console.log("PAIRING CODE WHATSAPP")
console.log(code)
console.log("================================")

}catch(e){
console.log("Menunggu koneksi pairing...")
}

}

})

// WELCOME MEMBER
sock.ev.on("group-participants.update", async (data) => {

const groupId = data.id

if(data.action === "add" && welcomeGroups.has(groupId)){

const user = data.participants[0].split("@")[0]

const text = `
👋 Selamat datang @${user}

*NIGHTFALL SILENT SLAUGHTER*

Nama:
Usn:
Umur:
Asal:
Sudah bisa CN / Belum?
`

await sock.sendMessage(groupId,{
text:text,
mentions:[data.participants[0]]
})

}

})

// MESSAGE EVENT
sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]
if(!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

const from = msg.key.remoteJid
const sender = msg.key.participant || from

let isAdmin = false

if(from.endsWith("@g.us")){

const metadata = await sock.groupMetadata(from)

const admins = metadata.participants
.filter(p => p.admin)
.map(p => p.id)

isAdmin = admins.includes(sender)

}

// MENU
if(text === ".menu"){

await sock.sendMessage(from,{
text:`
👑 NSSxFII MENU

ADMIN
.setwelcome
.setundangan
.interval
.stopundangan
.antilink
.kick

MEMBER
.rules
`
})

}

// SET WELCOME
if(text === ".setwelcome"){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

welcomeGroups.add(from)

await sock.sendMessage(from,{text:"✅ Welcome aktif"})

}

// RULES
if(text === ".rules"){

await sock.sendMessage(from,{
text:`
📜 RULES GROUP

1. WAJIB 17+
2. DILARANG DRAMA
3. DILARANG MEMBUAT KERIBUTAN
4. DILARANG MENJELEKKAN MEMBER
5. DILARANG FAKER
6. JAGA NAMA BAIK CLAN
`
})

}

// ANTILINK
if(text === ".antilink"){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

antilinkGroups.add(from)

await sock.sendMessage(from,{text:"🚫 Anti link aktif"})

}

// DETEKSI LINK
if(antilinkGroups.has(from)){

if(text.includes("https://chat.whatsapp.com")){

await sock.sendMessage(from,{
text:"🚫 Link grup dilarang!"
})

}

}

// KICK
if(text.startsWith(".kick")){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

if(!msg.message.extendedTextMessage) return

const mentioned =
msg.message.extendedTextMessage.contextInfo?.mentionedJid

if(!mentioned) return

await sock.groupParticipantsUpdate(from,mentioned,"remove")

}

// SET UNDANGAN
if(text.startsWith(".setundangan")){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

const pesan = text.replace(".setundangan","").trim()

if(!pesan)
return sock.sendMessage(from,{
text:"Contoh:\n.setundangan Ayo join clan"
})

undanganGroups[from]={
text:pesan,
timer:null
}

await sock.sendMessage(from,{
text:"✅ Pesan undangan disimpan\nGunakan .interval"
})

}

// INTERVAL
if(text.startsWith(".interval")){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

if(!undanganGroups[from])
return sock.sendMessage(from,{text:"⚠️ Gunakan .setundangan dulu"})

const waktu = text.split(" ")[1]

let ms = 0

if(waktu==="30menit") ms=1800000
if(waktu==="1jam") ms=3600000
if(waktu==="2jam") ms=7200000

if(!ms)
return sock.sendMessage(from,{
text:"Gunakan:\n.interval 30menit\n.interval 1jam\n.interval 2jam"
})

if(undanganGroups[from].timer)
clearInterval(undanganGroups[from].timer)

undanganGroups[from].timer=setInterval(async()=>{

await sock.sendMessage(from,{
text:undanganGroups[from].text
})

},ms)

await sock.sendMessage(from,{
text:`✅ Undangan aktif setiap ${waktu}`
})

}

// STOP UNDANGAN
if(text === ".stopundangan"){

if(!isAdmin)
return sock.sendMessage(from,{text:"❌ Hanya admin"})

if(!undanganGroups[from])
return sock.sendMessage(from,{text:"⚠️ Belum aktif"})

clearInterval(undanganGroups[from].timer)

delete undanganGroups[from]

await sock.sendMessage(from,{
text:"🛑 Undangan dihentikan"
})

}

})

}

startBot()
