const dictionaries = {
  fr: {
    common: {
      errorGeneric: "Une erreur est survenue.",
      commandError: "Erreur lors de l'exécution de la commande.",
      cancelled: "Interaction annulée.",
      selectOption: "Choisis une option",
      confirm: "Confirmer",
      cancel: "Annuler",
      betLabel: "Mise 💰",
      rulesLabel: "Règles du jeu",
      choiceLabelFlip: "Choix 🎯",
      choiceLabelDice: "Nombre 🎲",
      choiceLabelRoulette: "Couleur 🎯",
      choiceLabelHigherLower: "Choix 🎯",
      choiceLabelCrash: "Cashout 📈",
      choicePlaceholderFlip: "pile ou face",
      choicePlaceholderDice: "1 à 6",
      choicePlaceholderRoulette: "rouge, noir, vert",
      choicePlaceholderHigherLower: "plus ou moins",
      choicePlaceholderCrash: "Ex: 2.5",
      betPlaceholder: "Ex: 100",
      botDisabled: "Le bot est désactivé sur ce serveur.",
      botDisabledReason: "Le bot est désactivé sur ce serveur. Raison : {reason}",
      noData: "Aucune donnée."
    },
    commands: {
      addMoneyNotImplemented: "Add money: fonctionnalité à implémenter.",
      giveawayNotImplemented: "Giveway: fonctionnalité à implémenter."
    },
    daily: {
      alreadyTitle: "Daily déjà récupéré",
      alreadyNext: "⏳ Prochaine disponibilité dans **{remaining}**",
      alreadyLater: "Revenez plus tard.",
      receivedTitle: "Daily reçu",
      streak: "Streak",
      balance: "Balance",
      nextBonus: "Prochain bonus",
      bonus: "Bonus",
      bonusLine: "Base {base} +{bonus} ({status})",
      bonusWith: "avec bonus",
      bonusWithout: "sans bonus",
      streakResetTitle: "Streak réinitialisée",
      streakResetText: "Jour manqué. La série repart à 1.",
      error: "Erreur daily.",
      nextBonusNone: "Aucun bonus configuré",
      nextBonusMax: "Bonus max atteint (+{percent}%)",
      nextBonusIn: "+{percent}% dans {daysLeft} jour(s) (série {target})"
    },
    shop: {
      noneConfigured: "Aucun shop configuré.",
      noneAccessible: "Aucun shop accessible.",
      availableTitle: "Shops disponibles",
      selectPlaceholder: "Sélectionnez une autre boutique...",
      roleRequired: "Rôles requis",
      notFound: "Shop introuvable.",
      noAccess: "Tu n'as pas les rôles requis pour accéder au shop.",
      error: "Erreur shop."
    },
    leaderboard: {
      title: "Leaderboard",
      error: "Erreur leaderboard.",
      serverTitle: "Classements de l'économie du serveur \"{guild}\"",
      footer: "MAJ: {date} • Actualisé automatiquement toutes les 10 minutes."
    },
    games: {
      title: "Jeux",
      disabled: "Les jeux sont désactivés sur ce serveur.",
      choose: "Choisis un jeu puis indique ta mise.",
      minBet: "Mise min",
      maxBet: "Mise max",
      cooldown: "Cooldown",
      timeout: "Interaction expirée. Relance /jeux pour rejouer.",
      error: "Erreur jeux.",
      helpFlip: "Choisis pile ou face. Si tu gagnes, la mise est multipliée (jackpot possible).",
      helpDice: "Choisis un nombre de 1 à 6. S’il sort, tu gagnes avec le multiplicateur.",
      helpSlot: "3 symboles aléatoires. Le gain dépend de la combinaison.",
      helpRoulette: "Choisis rouge/noir/vert. Si la couleur sort, tu gagnes.",
      helpHigherLower: "Devine si le prochain nombre est plus haut ou plus bas.",
      helpCrash: "Le multiplicateur monte puis crash. Cashout avant le crash pour gagner.",
      helpDouble: "50/50. Si gagné, mise × multiplicateur.",
      helpMystery: "Un multiplicateur aléatoire est tiré selon les probabilités.",
      helpDefault: "Mini‑jeu de pari.",
      choicePrompt: "**{game}** — {help}\nChoisis ton option pour continuer 👇",
      labels: {
        flip: "Pile ou face",
        dice: "Dés",
        slot: "Slot",
        roulette: "Roulette",
        higherLower: "Plus/Moins",
        crash: "Crash",
        double: "Double",
        mystery: "Mystère",
        default: "Mini‑jeu"
      },
      hints: {
        flip: "pile/face, mise × multiplicateur",
        dice: "choisir 1‑6",
        slot: "3 symboles, gains selon combo",
        roulette: "rouge/noir/vert",
        higherLower: "plus haut ou plus bas",
        crash: "cashout avant le crash",
        double: "50/50, mise × multiplicateur",
        mystery: "multiplicateur surprise",
        default: "pari"
      },
      choiceHeads: "Pile",
      choiceTails: "Face",
      choiceRed: "Rouge",
      choiceBlack: "Noir",
      choiceGreen: "Vert",
      choiceHigher: "Plus",
      choiceLower: "Moins"
    },
    buy: {
      success: "Achat OK. Prix: {price}",
      error: "Achat impossible.",
      notFound: "Article introuvable.",
      rolesRequired: "Rôles requis pour ce shop.",
      errorBuy: "Erreur achat.",
      purchaseFailed: "Achat impossible: {reason}",
      confirmTitle: "Achat confirmé",
      confirmText: "Votre achat a bien été enregistré.",
      fieldShop: "Boutique",
      fieldItem: "Article",
      fieldPrice: "Prix",
      fieldRole: "Rôle",
      roleAssigned: "Attribué ✅",
      roleFailed: "Attribution échouée ❌",
      ownerDm:
        "🧾 Achat effectué sur **{shop}**\nAcheteur: <@{buyer}>\nArticle: **{item}**\nPrix: {price}"
    },
    lootbox: {
      noLootbox: "Tu ne possèdes pas cette lootbox.",
      empty: "Cette lootbox n'a aucune récompense.",
      notFound: "Lootbox introuvable.",
      invalid: "Lootbox invalide.",
      shopNotFound: "Shop introuvable.",
      openFailed: "Erreur ouverture lootbox.",
      rewardFallback: "Récompense",
      openedTitle: "🎁 Lootbox ouverte",
      wonText: "Tu as gagné **{reward}**{description}",
      fieldType: "Type",
      fieldInventory: "Inventaire",
      inventoryAdded: "Ajouté à l’inventaire ✅",
      fieldRole: "Rôle",
      roleAssigned: "Attribué ✅",
      roleFailed: "Attribution échouée ❌",
      ownerDm:
        "🎁 Lootbox ouverte sur **{lootbox}**\nUtilisateur: <@{user}>\nGain: **{reward}**\nType: {type}"
    },
    inventory: {
      title: "Inventaire",
      empty: "Inventaire vide.",
      openLootbox: "Ouvrir une lootbox",
      useSelect: "Utiliser un objet (rôle)",
      useSuccess: "Objet utilisé : {item}.",
      useFailed: "Impossible d’utiliser cet objet.",
      timeout: "Interaction expirée. Relance /inventaire.",
      error: "Erreur inventaire.",
      lootboxFallback: "Lootbox",
      itemFallback: "Objet"
    },
    sale: {
      title: "Boutique de vente",
      inventoryTitle: "Ton inventaire (vendre)",
      salesTitle: "Objets en vente (acheter)",
      noneToSell: "Aucun objet à vendre.",
      noneForSale: "Aucune vente en cours.",
      buy: "Acheter",
      sell: "Vendre",
      cancel: "Annuler",
      timeout: "Interaction expirée. Relance /vente.",
      error: "Erreur vente.",
      selectSell: "Choisir un objet à vendre",
      chooseBuy: "Choisis l’objet que tu veux acheter 👇",
      confirmExpired: "Confirmation expirée. Relance /vente.",
      buyError: "Erreur achat.",
      cannotBuyOwn: "Tu ne peux pas acheter ton propre objet.",
      insufficientFunds: "Fonds insuffisants.",
      saleNotFound: "Vente introuvable.",
      itemNotFound: "Objet introuvable.",
      purchaseFailed: "Achat impossible: {reason}",
      saleConfirmedDm: "💸 Vente confirmée\nTon objet **{item}** a été acheté par <@{buyer}> pour **{price}** 💰.",
      itemRecovered: "Objet récupéré",
      itemRecoveredText: "Tu as récupéré **{item}** depuis tes ventes.",
      itemBoughtTitle: "Achat effectué",
      itemBoughtText: "**{buyer}** a acheté **{item}** pour **{price}** 💰.",
      noInventoryToSell: "Aucun objet d’inventaire à vendre.",
      noSales: "Aucune vente en cours.",
      saleImpossible: "Vente impossible: {reason}",
      modalTitle: "Mettre en vente",
      modalPriceLabel: "Prix de vente (coins)",
      modalPricePlaceholder: "Ex: 500",
      modalQtyLabel: "Quantité à vendre",
      modalQtyPlaceholder: "Ex: 2",
      confirmTitle: "Confirmer l'achat",
      confirmButton: "Confirmer l'achat",
      confirmDesc: "Objet: **{item}**\nQuantité dispo: **x{qty}**\nPrix: **{price}** 💰\nVendu par: {seller}",
      optionDesc: "x{qty} • {price} 💰 • vendu par {seller}",
      soldTitle: "Objet mis en vente",
      soldText: "**{seller}** vend **{item}** pour **{price}** 💰."
    },
    game: {
      resultTitle: "Résultat {game}",
      resultWin: "✅ Victoire",
      resultLose: "❌ Défaite",
      fieldBet: "Mise",
      fieldGain: "Gain",
      fieldBalance: "Balance",
      error: "Erreur jeu.",
      impossible: "Jeu impossible: {reason}",
      detailResult: "Résultat",
      detailDie: "Dé",
      detailColor: "Couleur",
      detailStreak: "Suite",
      detailCrash: "Crash"
    },
    shopUi: {
      emptyTitle: "Aucun article",
      emptyText: "Cette boutique ne contient aucun article pour le moment.",
      itemFallback: "Article",
      qtyRemaining: "Quantité restante : {count}",
      priceLabel: "Prix : {price}",
      buyButton: "Acheter – {price}",
      balanceLabel: "{emoji} **{balance}**",
      selectShopPlaceholder: "Sélectionnez une autre boutique...",
      shopFallback: "Boutique",
      rolesRequired: "Rôles requis"
    },
    shopTimeout: {
      navigationDone: "Navigation terminée ! Pour parcourir ou acheter des articles, relancez la boutique avec /shop"
    }
  },
  en: {
    common: {
      errorGeneric: "An error occurred.",
      commandError: "Error while executing the command.",
      cancelled: "Interaction cancelled.",
      selectOption: "Choose an option",
      confirm: "Confirm",
      cancel: "Cancel",
      betLabel: "Bet 💰",
      rulesLabel: "Game rules",
      choiceLabelFlip: "Choice 🎯",
      choiceLabelDice: "Number 🎲",
      choiceLabelRoulette: "Color 🎯",
      choiceLabelHigherLower: "Choice 🎯",
      choiceLabelCrash: "Cashout 📈",
      choicePlaceholderFlip: "heads or tails",
      choicePlaceholderDice: "1 to 6",
      choicePlaceholderRoulette: "red, black, green",
      choicePlaceholderHigherLower: "higher or lower",
      choicePlaceholderCrash: "Ex: 2.5",
      betPlaceholder: "Ex: 100",
      botDisabled: "The bot is disabled on this server.",
      botDisabledReason: "The bot is disabled on this server. Reason: {reason}",
      noData: "No data."
    },
    commands: {
      addMoneyNotImplemented: "Add money: feature not implemented.",
      giveawayNotImplemented: "Giveaway: feature not implemented."
    },
    daily: {
      alreadyTitle: "Daily already claimed",
      alreadyNext: "⏳ Next available in **{remaining}**",
      alreadyLater: "Come back later.",
      receivedTitle: "Daily received",
      streak: "Streak",
      balance: "Balance",
      nextBonus: "Next bonus",
      bonus: "Bonus",
      bonusLine: "Base {base} +{bonus} ({status})",
      bonusWith: "with bonus",
      bonusWithout: "no bonus",
      streakResetTitle: "Streak reset",
      streakResetText: "Missed day. Streak resets to 1.",
      error: "Daily error.",
      nextBonusNone: "No bonus configured",
      nextBonusMax: "Max bonus reached (+{percent}%)",
      nextBonusIn: "+{percent}% in {daysLeft} day(s) (streak {target})"
    },
    shop: {
      noneConfigured: "No shop configured.",
      noneAccessible: "No accessible shop.",
      availableTitle: "Available shops",
      selectPlaceholder: "Select another shop...",
      roleRequired: "Roles required",
      notFound: "Shop not found.",
      noAccess: "You don't have the required roles to access the shop.",
      error: "Shop error."
    },
    buy: {
      success: "Purchase OK. Price: {price}",
      error: "Purchase failed.",
      notFound: "Item not found.",
      rolesRequired: "Roles required for this shop.",
      errorBuy: "Purchase error.",
      purchaseFailed: "Purchase failed: {reason}",
      confirmTitle: "Purchase confirmed",
      confirmText: "Your purchase has been recorded.",
      fieldShop: "Shop",
      fieldItem: "Item",
      fieldPrice: "Price",
      fieldRole: "Role",
      roleAssigned: "Assigned ✅",
      roleFailed: "Assignment failed ❌",
      ownerDm:
        "🧾 Purchase completed on **{shop}**\nBuyer: <@{buyer}>\nItem: **{item}**\nPrice: {price}"
    },
    leaderboard: {
      title: "Leaderboard",
      error: "Leaderboard error.",
      serverTitle: "Economy leaderboard for server \"{guild}\"",
      footer: "Updated: {date} • Auto-updated every 10 minutes."
    },
    games: {
      title: "Games",
      disabled: "Games are disabled on this server.",
      choose: "Pick a game, then enter your bet.",
      minBet: "Min bet",
      maxBet: "Max bet",
      cooldown: "Cooldown",
      timeout: "Interaction expired. Run /jeux to play again.",
      error: "Games error.",
      helpFlip: "Choose heads or tails. If you win, the bet is multiplied (jackpot possible).",
      helpDice: "Choose a number from 1 to 6. If it rolls, you win with the multiplier.",
      helpSlot: "3 random symbols. Payout depends on the combo.",
      helpRoulette: "Choose red/black/green. If the color hits, you win.",
      helpHigherLower: "Guess if the next number is higher or lower.",
      helpCrash: "Multiplier goes up then crashes. Cash out before it crashes to win.",
      helpDouble: "50/50. If you win, bet × multiplier.",
      helpMystery: "A random multiplier is drawn based on probabilities.",
      helpDefault: "Betting mini-game.",
      choicePrompt: "**{game}** — {help}\nChoose your option to continue 👇",
      labels: {
        flip: "Coin Flip",
        dice: "Dice",
        slot: "Slot",
        roulette: "Roulette",
        higherLower: "Higher/Lower",
        crash: "Crash",
        double: "Double",
        mystery: "Mystery",
        default: "Mini-game"
      },
      hints: {
        flip: "heads/tails, bet × multiplier",
        dice: "pick 1‑6",
        slot: "3 symbols, payout by combo",
        roulette: "red/black/green",
        higherLower: "higher or lower",
        crash: "cash out before crash",
        double: "50/50, bet × multiplier",
        mystery: "surprise multiplier",
        default: "bet"
      },
      choiceHeads: "Heads",
      choiceTails: "Tails",
      choiceRed: "Red",
      choiceBlack: "Black",
      choiceGreen: "Green",
      choiceHigher: "Higher",
      choiceLower: "Lower"
    },
    lootbox: {
      noLootbox: "You don't own this lootbox.",
      empty: "This lootbox has no rewards.",
      notFound: "Lootbox not found.",
      invalid: "Invalid lootbox.",
      shopNotFound: "Shop not found.",
      openFailed: "Lootbox opening error.",
      rewardFallback: "Reward",
      openedTitle: "🎁 Lootbox opened",
      wonText: "You won **{reward}**{description}",
      fieldType: "Type",
      fieldInventory: "Inventory",
      inventoryAdded: "Added to inventory ✅",
      fieldRole: "Role",
      roleAssigned: "Assigned ✅",
      roleFailed: "Assignment failed ❌",
      ownerDm:
        "🎁 Lootbox opened on **{lootbox}**\nUser: <@{user}>\nReward: **{reward}**\nType: {type}"
    },
    inventory: {
      title: "Inventory",
      empty: "Inventory is empty.",
      openLootbox: "Open a lootbox",
      useSelect: "Use an item (role)",
      useSuccess: "Item used: {item}.",
      useFailed: "Unable to use this item.",
      timeout: "Interaction expired. Run /inventaire.",
      error: "Inventory error.",
      lootboxFallback: "Lootbox",
      itemFallback: "Item"
    },
    sale: {
      title: "Sales shop",
      inventoryTitle: "Your inventory (sell)",
      salesTitle: "Items for sale (buy)",
      noneToSell: "No items to sell.",
      noneForSale: "No active sales.",
      buy: "Buy",
      sell: "Sell",
      cancel: "Cancel",
      timeout: "Interaction expired. Run /vente.",
      error: "Sales error.",
      selectSell: "Select an item to sell",
      chooseBuy: "Choose the item you want to buy 👇",
      confirmExpired: "Confirmation expired. Run /vente.",
      buyError: "Purchase error.",
      cannotBuyOwn: "You cannot buy your own item.",
      insufficientFunds: "Insufficient funds.",
      saleNotFound: "Sale not found.",
      itemNotFound: "Item not found.",
      purchaseFailed: "Purchase failed: {reason}",
      saleConfirmedDm: "💸 Sale confirmed\nYour item **{item}** was bought by <@{buyer}> for **{price}** 💰.",
      itemRecovered: "Item recovered",
      itemRecoveredText: "You recovered **{item}** from your sales.",
      itemBoughtTitle: "Purchase completed",
      itemBoughtText: "**{buyer}** bought **{item}** for **{price}** 💰.",
      noInventoryToSell: "No inventory item to sell.",
      noSales: "No active sales.",
      saleImpossible: "Sale failed: {reason}",
      modalTitle: "List for sale",
      modalPriceLabel: "Sale price (coins)",
      modalPricePlaceholder: "Ex: 500",
      modalQtyLabel: "Quantity to sell",
      modalQtyPlaceholder: "Ex: 2",
      confirmTitle: "Confirm purchase",
      confirmButton: "Confirm purchase",
      confirmDesc: "Item: **{item}**\nAvailable qty: **x{qty}**\nPrice: **{price}** 💰\nSold by: {seller}",
      optionDesc: "x{qty} • {price} 💰 • sold by {seller}",
      soldTitle: "Item listed",
      soldText: "**{seller}** is selling **{item}** for **{price}** 💰."
    },
    game: {
      resultTitle: "Result {game}",
      resultWin: "✅ Win",
      resultLose: "❌ Loss",
      fieldBet: "Bet",
      fieldGain: "Payout",
      fieldBalance: "Balance",
      error: "Game error.",
      impossible: "Game failed: {reason}",
      detailResult: "Result",
      detailDie: "Die",
      detailColor: "Color",
      detailStreak: "Sequence",
      detailCrash: "Crash"
    },
    shopUi: {
      emptyTitle: "No items",
      emptyText: "This shop has no items yet.",
      itemFallback: "Item",
      qtyRemaining: "Remaining quantity: {count}",
      priceLabel: "Price: {price}",
      buyButton: "Buy – {price}",
      balanceLabel: "{emoji} **{balance}**",
      selectShopPlaceholder: "Select another shop...",
      shopFallback: "Shop",
      rolesRequired: "Roles required"
    },
    shopTimeout: {
      navigationDone: "Navigation finished! To browse or buy items, run /shop again."
    }
  },
  es: {
    common: {
      errorGeneric: "Ocurrió un error.",
      commandError: "Error al ejecutar el comando.",
      cancelled: "Interacción cancelada.",
      selectOption: "Elige una opción",
      confirm: "Confirmar",
      cancel: "Cancelar",
      betLabel: "Apuesta 💰",
      rulesLabel: "Reglas del juego",
      choiceLabelFlip: "Elección 🎯",
      choiceLabelDice: "Número 🎲",
      choiceLabelRoulette: "Color 🎯",
      choiceLabelHigherLower: "Elección 🎯",
      choiceLabelCrash: "Cashout 📈",
      choicePlaceholderFlip: "cara o cruz",
      choicePlaceholderDice: "1 a 6",
      choicePlaceholderRoulette: "rojo, negro, verde",
      choicePlaceholderHigherLower: "más o menos",
      choicePlaceholderCrash: "Ej: 2.5",
      betPlaceholder: "Ej: 100",
      botDisabled: "El bot está desactivado en este servidor.",
      botDisabledReason: "El bot está desactivado en este servidor. Motivo: {reason}",
      noData: "Sin datos."
   },
    commands: {
      addMoneyNotImplemented: "Add money: funcionalidad no implementada.",
      giveawayNotImplemented: "Giveaway: funcionalidad no implementada."
    },
    daily: {
      alreadyTitle: "Daily ya reclamado",
      alreadyNext: "⏳ Próximo disponible en **{remaining}**",
      alreadyLater: "Vuelve más tarde.",
      receivedTitle: "Daily recibido",
      streak: "Racha",
      balance: "Saldo",
      nextBonus: "Próximo bonus",
      bonus: "Bonus",
      bonusLine: "Base {base} +{bonus} ({status})",
      bonusWith: "con bonus",
      bonusWithout: "sin bonus",
      streakResetTitle: "Racha reiniciada",
      streakResetText: "Día perdido. La racha vuelve a 1.",
      error: "Error del daily.",
      nextBonusNone: "Sin bonus configurado",
      nextBonusMax: "Bonus máximo alcanzado (+{percent}%)",
      nextBonusIn: "+{percent}% en {daysLeft} día(s) (racha {target})"
    },
    shop: {
      noneConfigured: "No hay tiendas configuradas.",
      noneAccessible: "No hay tiendas accesibles.",
      availableTitle: "Tiendas disponibles",
      selectPlaceholder: "Selecciona otra tienda...",
      roleRequired: "Roles requeridos",
      notFound: "Tienda no encontrada.",
      noAccess: "No tienes los roles necesarios para acceder a la tienda.",
      error: "Error de tienda."
    },
    buy: {
      success: "Compra OK. Precio: {price}",
      error: "No se pudo comprar.",
      notFound: "Artículo no encontrado.",
      rolesRequired: "Roles requeridos para esta tienda.",
      errorBuy: "Error de compra.",
      purchaseFailed: "No se pudo comprar: {reason}",
      confirmTitle: "Compra confirmada",
      confirmText: "Tu compra ha sido registrada.",
      fieldShop: "Tienda",
      fieldItem: "Artículo",
      fieldPrice: "Precio",
      fieldRole: "Rol",
      roleAssigned: "Asignado ✅",
      roleFailed: "Asignación fallida ❌",
      ownerDm:
        "🧾 Compra realizada en **{shop}**\nComprador: <@{buyer}>\nArtículo: **{item}**\nPrecio: {price}"
    },
    leaderboard: {
      title: "Clasificación",
      error: "Error de clasificación.",
      serverTitle: "Clasificación de economía del servidor \"{guild}\"",
      footer: "Actualizado: {date} • Se actualiza cada 10 minutos."
    },
    games: {
      title: "Juegos",
      disabled: "Los juegos están desactivados en este servidor.",
      choose: "Elige un juego y luego indica tu apuesta.",
      minBet: "Apuesta mín",
      maxBet: "Apuesta máx",
      cooldown: "Enfriamiento",
      timeout: "Interacción expirada. Ejecuta /jeux para jugar otra vez.",
      error: "Error de juegos.",
      helpFlip: "Elige cara o cruz. Si ganas, la apuesta se multiplica (jackpot posible).",
      helpDice: "Elige un número del 1 al 6. Si sale, ganas con el multiplicador.",
      helpSlot: "3 símbolos aleatorios. La ganancia depende de la combinación.",
      helpRoulette: "Elige rojo/negro/verde. Si sale el color, ganas.",
      helpHigherLower: "Adivina si el siguiente número es mayor o menor.",
      helpCrash: "El multiplicador sube y luego cae. Cobra antes de que caiga.",
      helpDouble: "50/50. Si ganas, apuesta × multiplicador.",
      helpMystery: "Se sortea un multiplicador aleatorio según probabilidades.",
      helpDefault: "Mini‑juego de apuesta.",
      choicePrompt: "**{game}** — {help}\nElige tu opción para continuar 👇",
      labels: {
        flip: "Cara o cruz",
        dice: "Dados",
        slot: "Slot",
        roulette: "Ruleta",
        higherLower: "Más/Menos",
        crash: "Crash",
        double: "Doble",
        mystery: "Misterio",
        default: "Mini‑juego"
      },
      hints: {
        flip: "cara/cruz, apuesta × multiplicador",
        dice: "elige 1‑6",
        slot: "3 símbolos, ganancia por combo",
        roulette: "rojo/negro/verde",
        higherLower: "más o menos",
        crash: "cobra antes del crash",
        double: "50/50, apuesta × multiplicador",
        mystery: "multiplicador sorpresa",
        default: "apuesta"
      },
      choiceHeads: "Cara",
      choiceTails: "Cruz",
      choiceRed: "Rojo",
      choiceBlack: "Negro",
      choiceGreen: "Verde",
      choiceHigher: "Más",
      choiceLower: "Menos"
    },
    lootbox: {
      noLootbox: "No tienes esta lootbox.",
      empty: "Esta lootbox no tiene recompensas.",
      notFound: "Lootbox no encontrada.",
      invalid: "Lootbox inválida.",
      shopNotFound: "Tienda no encontrada.",
      openFailed: "Error al abrir la lootbox.",
      rewardFallback: "Recompensa",
      openedTitle: "🎁 Lootbox abierta",
      wonText: "Has ganado **{reward}**{description}",
      fieldType: "Tipo",
      fieldInventory: "Inventario",
      inventoryAdded: "Añadido al inventario ✅",
      fieldRole: "Rol",
      roleAssigned: "Asignado ✅",
      roleFailed: "Asignación fallida ❌",
      ownerDm:
        "🎁 Lootbox abierta en **{lootbox}**\nUsuario: <@{user}>\nRecompensa: **{reward}**\nTipo: {type}"
    },
    inventory: {
      title: "Inventario",
      empty: "El inventario está vacío.",
      openLootbox: "Abrir una lootbox",
      useSelect: "Usar un objeto (rol)",
      useSuccess: "Objeto usado: {item}.",
      useFailed: "No se pudo usar este objeto.",
      timeout: "Interacción expirada. Ejecuta /inventaire.",
      error: "Error de inventario.",
      lootboxFallback: "Lootbox",
      itemFallback: "Objeto"
    },
    sale: {
      title: "Tienda de ventas",
      inventoryTitle: "Tu inventario (vender)",
      salesTitle: "Artículos en venta (comprar)",
      noneToSell: "No hay artículos para vender.",
      noneForSale: "No hay ventas en curso.",
      buy: "Comprar",
      sell: "Vender",
      cancel: "Cancelar",
      timeout: "Interacción expirada. Ejecuta /vente.",
      error: "Error de ventas.",
      selectSell: "Selecciona un artículo para vender",
      chooseBuy: "Elige el artículo que quieres comprar 👇",
      confirmExpired: "Confirmación expirada. Ejecuta /vente.",
      buyError: "Error de compra.",
      cannotBuyOwn: "No puedes comprar tu propio artículo.",
      insufficientFunds: "Fondos insuficientes.",
      saleNotFound: "Venta no encontrada.",
      itemNotFound: "Artículo no encontrado.",
      purchaseFailed: "No se pudo comprar: {reason}",
      saleConfirmedDm: "💸 Venta confirmada\nTu artículo **{item}** fue comprado por <@{buyer}> por **{price}** 💰.",
      itemRecovered: "Artículo recuperado",
      itemRecoveredText: "Recuperaste **{item}** de tus ventas.",
      itemBoughtTitle: "Compra realizada",
      itemBoughtText: "**{buyer}** compró **{item}** por **{price}** 💰.",
      noInventoryToSell: "No hay artículos de inventario para vender.",
      noSales: "No hay ventas en curso.",
      saleImpossible: "Venta fallida: {reason}",
      modalTitle: "Poner en venta",
      modalPriceLabel: "Precio de venta (monedas)",
      modalPricePlaceholder: "Ej: 500",
      modalQtyLabel: "Cantidad a vender",
      modalQtyPlaceholder: "Ej: 2",
      confirmTitle: "Confirmar compra",
      confirmButton: "Confirmar compra",
      confirmDesc: "Objeto: **{item}**\nCantidad disp.: **x{qty}**\nPrecio: **{price}** 💰\nVendido por: {seller}",
      optionDesc: "x{qty} • {price} 💰 • vendido por {seller}",
      soldTitle: "Artículo en venta",
      soldText: "**{seller}** vende **{item}** por **{price}** 💰."
    },
    game: {
      resultTitle: "Resultado {game}",
      resultWin: "✅ Victoria",
      resultLose: "❌ Derrota",
      fieldBet: "Apuesta",
      fieldGain: "Ganancia",
      fieldBalance: "Saldo",
      error: "Error de juego.",
      impossible: "Juego fallido: {reason}",
      detailResult: "Resultado",
      detailDie: "Dado",
      detailColor: "Color",
      detailStreak: "Secuencia",
      detailCrash: "Crash"
    },
    shopUi: {
      emptyTitle: "Sin artículos",
      emptyText: "Esta tienda no tiene artículos por ahora.",
      itemFallback: "Artículo",
      qtyRemaining: "Cantidad restante: {count}",
      priceLabel: "Precio: {price}",
      buyButton: "Comprar – {price}",
      balanceLabel: "{emoji} **{balance}**",
      selectShopPlaceholder: "Selecciona otra tienda...",
      shopFallback: "Tienda",
      rolesRequired: "Roles requeridos"
    },
    shopTimeout: {
      navigationDone: "¡Navegación finalizada! Para ver o comprar artículos, ejecuta /shop."
    }
  }
};

const localeByLang = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES"
};

const interpolate = (value, vars = {}) =>
  String(value).replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? vars[key] : match));

export const t = (lang, key, vars = {}) => {
  const dict = dictionaries[lang] || dictionaries.fr;
  const fallback = dictionaries.fr;
  const getValue = (obj) =>
    key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  const value = getValue(dict) ?? getValue(fallback) ?? key;
  return interpolate(value, vars);
};

const settingsCache = new Map();
const CACHE_TTL = 5 * 1000;
const CACHE_TTL_FAIL = 2 * 1000;

export const getBotSettings = async (guildId, apiBase, apiKey) => {
  const key = String(guildId || "");
  if (!key) {
    return {
      language: "fr",
      timezone: null,
      welcome_enabled: true,
      welcome_message_fr: null,
      welcome_message_en: null,
      welcome_message_es: null
    };
  }
  const cached = settingsCache.get(key);
  if (cached) {
    const ttl = cached.failed ? CACHE_TTL_FAIL : CACHE_TTL;
    if (Date.now() - cached.ts < ttl) return cached.value;
  }
  try {
    const res = await fetch(`${apiBase}/bot/settings?guildId=${encodeURIComponent(key)}`, {
      headers: { "x-api-key": apiKey }
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      console.warn("[bot-settings] fetch failed", {
        guildId: key,
        status: res.status,
        detail
      });
      throw new Error("bot_settings_failed");
    }
    const data = await res.json();
    const value = {
      language: String(data?.language || "fr").toLowerCase(),
      timezone: data?.timezone || null,
      welcome_enabled: data?.welcome_enabled !== false,
      welcome_message_fr: data?.welcome_message_fr || null,
      welcome_message_en: data?.welcome_message_en || null,
      welcome_message_es: data?.welcome_message_es || null
    };
    settingsCache.set(key, { ts: Date.now(), value, failed: false });
    return value;
  } catch {
    const value = {
      language: "fr",
      timezone: null,
      welcome_enabled: true,
      welcome_message_fr: null,
      welcome_message_en: null,
      welcome_message_es: null
    };
    settingsCache.set(key, { ts: Date.now(), value, failed: true });
    return value;
  }
};

export const getBotLanguage = async (guildId, apiBase, apiKey) => {
  const settings = await getBotSettings(guildId, apiBase, apiKey);
  return settings.language || "fr";
};

export const getBotTimezone = async (guildId, apiBase, apiKey) => {
  const settings = await getBotSettings(guildId, apiBase, apiKey);
  return settings.timezone || null;
};

export const localeFromLang = (lang) => localeByLang[lang] || localeByLang.fr;
