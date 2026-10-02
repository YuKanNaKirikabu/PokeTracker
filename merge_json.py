import json

# Читаю старые карты
with open('Time/cards.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Читаю новые карты
with open('pulsing_aura_cards.json', 'r', encoding='utf-8') as f:
    new_cards = json.load(f)

# Добавляю новые карты
data['cards'].extend(new_cards)

# Сохраняю обратно
with open('Time/cards.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Added {len(new_cards)} cards')
print(f'Total cards now: {len(data["cards"])}')
