const {
  conversation,
  composerSeat,
  composerCard,
  anyPhase,
  conversationScrolls,
} = require('./dom-adapter.js');

function createComposerSessionResolver(documentRef = document) {
  const resolve = () => {
    const currentConversation = conversation(documentRef);
    const currentSeat = composerSeat(currentConversation);
    const currentCard = composerCard(currentSeat);
    // Kept as the observer target: this is what the original rc.2 code watched,
    // and swapping it out starves the dock's ResizeObserver. It is NOT a sound
    // source for the seat's width on rc.5 (the nested [data-phase] there is the
    // 40px composer input wrapper) — composer-dock.js now measures the column
    // itself for that.
    const currentSurface = anyPhase(currentConversation) || conversationScrolls(currentConversation)[0] || null;
    return { conversation: currentConversation, seat: currentSeat, card: currentCard, surface: currentSurface };
  };

  return { resolve };
}

module.exports = { createComposerSessionResolver };
