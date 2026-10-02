import re
import json

with open('Lists/Pulsing Aura.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

cards_data = []
for line in lines[1:]:
    line = line.strip()
    if not line:
        continue
    
    match = re.match(r'(.+?)\s*-\s*(.+?)\s+#(\d+)\s*-\s*(\w+)\s*-\s*(\S+)', line)
    if match:
        name = match.group(1).strip()
        code_part = match.group(2).strip()
        number = int(match.group(3))
        rarity = match.group(4).strip()
        ptype = match.group(5).strip()
        
        num_padded = f'{number:03d}'
        filename = f'{num_padded}_{name.replace(" ", "_")}'
        
        card = {
            'name': name,
            'number': number,
            'code': f'{code_part} #{num_padded}',
            'rarity': rarity,
            'type': ptype,
            'pack': 'PULSING AURA',
            'image': f'https://storage.yandexcloud.net/poketracker/Images/Packs/Pulsing Aura/{filename}.webp'
        }
        cards_data.append(card)

# Вывожу первые 3 карты
for i, card in enumerate(cards_data[:3]):
    print(json.dumps(card, ensure_ascii=False))

print(f'Total: {len(cards_data)} cards')

# Сохраняю в файл для вставки в JSON
with open('pulsing_aura_cards.json', 'w', encoding='utf-8') as f:
    json.dump(cards_data, f, ensure_ascii=False, indent=2)

print('Saved to pulsing_aura_cards.json')
