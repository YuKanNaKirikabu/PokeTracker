with open('src/config/packs.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Добавляю в PACKS_ORDER
content = content.replace(
    '  { id: "MEGA SHINE", title: "Mega Shine", code: "MEGA_SHINE", artwork: "https://storage.yandexcloud.net/poketracker/Images/Artworks/Mega-Shine.png" },\n  { id: "TRIUMPHANT LIGHT"',
    '  { id: "MEGA SHINE", title: "Mega Shine", code: "MEGA_SHINE", artwork: "https://storage.yandexcloud.net/poketracker/Images/Artworks/Mega-Shine.png" },\n  { id: "PULSING AURA", title: "Pulsing Aura (B3)", code: "B3" },\n  { id: "TRIUMPHANT LIGHT"'
)

# Добавляю в KNOWN_PACKS
content = content.replace(
    '  "MEGA SHINE": "MEGA SHINE",\n  "MYTHICAL ISLAND"',
    '  "MEGA SHINE": "MEGA SHINE",\n  "PULSING AURA": "PULSING AURA",\n  "MYTHICAL ISLAND"'
)

with open('src/config/packs.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated packs.js')
