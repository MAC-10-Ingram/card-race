import './style.css'

console.log('카드 레이싱 게임 초기화됨!');

// 간단한 화면 전환 로직 (테스트용)
const playerListEl = document.getElementById('player-list');
const addPlayerBtn = document.getElementById('add-player-btn');
const startGameBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-btn');

let players = [
  { id: 1, name: '레드베어', color: '#ef4444', weight: 1 },
  { id: 2, name: '블루호크', color: '#3b82f6', weight: 1 },
];

const screens = {
  setup: document.getElementById('setup-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen')
};

function renderPlayerList() {
  playerListEl.innerHTML = '';
  players.forEach((player, index) => {
    const item = document.createElement('div');
    item.className = 'player-item';
    item.innerHTML = `
      <div class="color-dot" style="background-color: ${player.color}"></div>
      <input type="text" value="${player.name}" onchange="updatePlayer(${index}, 'name', this.value)" placeholder="이름">
      <div class="weight-control">
        <span>비중:</span>
        <input type="number" value="${player.weight}" min="1" max="10" onchange="updatePlayer(${index}, 'weight', this.value)">
      </div>
      <button class="remove-btn" onclick="removePlayer(${index})">✕</button>
    `;
    playerListEl.appendChild(item);
  });
}

window.updatePlayer = (index, key, value) => {
  players[index][key] = key === 'weight' ? parseInt(value) : value;
};

window.removePlayer = (index) => {
  if (players.length > 2) {
    players.splice(index, 1);
    renderPlayerList();
  } else {
    alert('최소 2명의 플레이어가 필요합니다.');
  }
};

addPlayerBtn?.addEventListener('click', () => {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];
  const newColor = colors[players.length % colors.length];
  players.push({
    id: Date.now(),
    name: `말 ${players.length + 1}`,
    color: newColor,
    weight: 1
  });
  renderPlayerList();
});

renderPlayerList();

function showScreen(screenId) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenId].classList.add('active');
}

startGameBtn?.addEventListener('click', () => {
  console.log('최종 참여 플레이어:', players);
  showScreen('game');
  initGame(); // 게임 초기화 함수 (다음 단계에서 구현)
});

restartBtn?.addEventListener('click', () => {
  showScreen('setup');
});

let gameState = {
  deck: [],
  trackLength: 7,
  winCondition: '1',
  isRacing: false
};

function initGame() {
  const trackLengthInput = document.getElementById('track-length');
  const winConditionSelect = document.getElementById('win-condition');
  
  gameState.trackLength = parseInt(trackLengthInput.value);
  gameState.winCondition = winConditionSelect.value;
  gameState.deck = createWeightedDeck(players);
  
  console.log('게임 시작! 덱 규모:', gameState.deck.length);
  renderTrack();
  renderDeck();
  updateRankings();
  
  // 트랙 렌더링 후 약간의 지연을 두어 애니메이션이 먹히도록 한 뒤 시작
  setTimeout(startRace, 1000);
}

function renderDeck() {
  const deckEl = document.getElementById('card-deck');
  deckEl.innerHTML = '';
  // 덱의 시각적 두께 표현 (최대 12장 정도로 표현)
  const displayCount = Math.min(12, Math.ceil(gameState.deck.length / 4));
  for (let i = 0; i < displayCount; i++) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.bottom = `${i * 2}px`;
    card.style.left = `${i * 0.4}px`;
    deckEl.appendChild(card);
  }
}

function createWeightedDeck(playerData) {
  let deck = [];
  playerData.forEach(player => {
    // 각 플레이어의 비중(weight)만큼 카드를 생성 (기본 13장 * 비중)
    const cardCount = 13 * player.weight;
    for (let i = 0; i < cardCount; i++) {
      deck.push({ ...player });
    }
  });
  
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

const commentaries = {
  start: ["자! 드디어 경주가 시작됩니다!", "각 말들, 힘차게 출발합니다!", "오늘의 승자는 누가 될까요?"],
  move: ["{name}, 무서운 기세로 치고 나옵니다!", "{name} 선수가 한 칸 전진합니다!", "{name}, 힘을 냅니다!"],
  overtake: ["오오! {name}(이)가 순위를 뒤집습니다!", "{name}, 역전에 성공합니다!", "순위가 요동치고 있습니다!"],
  nearFinish: ["{name}, 결승선이 코앞입니다!", "이제 한 칸 남았습니다! {name}!", "마지막 스퍼트를 올리는 {name}!"],
  finish: ["{name}! {name}! 1등으로 들어옵니다!", "결정됐습니다! 오늘의 우승은 {name}!", "모두 박수 부탁드립니다. {name} 우승!"]
};

let lastLeaderId = null;

function updateCommentary(type, data = {}) {
  const box = document.getElementById('commentary-text');
  const pool = commentaries[type];
  let text = pool[Math.floor(Math.random() * pool.length)];
  
  if (data.name) {
    text = text.replace(/{name}/g, data.name);
  }
  
  box.style.opacity = 0;
  setTimeout(() => {
    box.innerText = text;
    box.style.opacity = 1;
  }, 300);
}

function renderTrack() {
  const trackArea = document.querySelector('.track-area');
  trackArea.innerHTML = '';
  
  players.forEach(player => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.id = `lane-${player.id}`;
    
    // 트랙 칸 생성
    for (let i = 0; i <= gameState.trackLength; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (i === gameState.trackLength) cell.classList.add('finish-line');
      lane.appendChild(cell);
    }
    
    // 말 생성
    const horse = document.createElement('div');
    horse.className = 'horse';
    horse.style.backgroundColor = player.color;
    horse.id = `horse-${player.id}`;
    horse.dataset.pos = 0;
    
    lane.children[0].appendChild(horse);
    trackArea.appendChild(lane);
    
    // 초기 위치 강제 설정 (렌더링 직후 위치 잡기)
    requestAnimationFrame(() => {
      const startCell = lane.children[0];
      horse.style.left = `${startCell.offsetLeft + (startCell.offsetWidth / 2) - 22}px`;
    });
  });
}

function startRace() {
  if (gameState.isRacing) return;
  gameState.isRacing = true;
  lastLeaderId = null;
  updateCommentary('start');
  nextTurn();
}

function nextTurn() {
  if (gameState.deck.length === 0 || !gameState.isRacing) {
    gameState.isRacing = false;
    return;
  }
  
  const card = gameState.deck.pop();
  renderDeck(); // 덱 높이 업데이트
  updateCardDisplay(card);
  
  // 카드가 날아오는 시간(0.4초) 뒤에 말이 움직이도록 시차 부여
  setTimeout(() => {
    moveHorse(card);
    
    // 상황 판단 로직
    const horse = document.getElementById(`horse-${card.id}`);
    const pos = parseInt(horse.dataset.pos);
    const currentStandings = players.map(p => ({
      id: p.id,
      name: p.name,
      pos: parseInt(document.getElementById(`horse-${p.id}`).dataset.pos)
    })).sort((a, b) => b.pos - a.pos);
    
    const currentLeader = currentStandings[0];
    
    if (pos >= gameState.trackLength) {
       updateCommentary('finish', { name: card.name });
    } else if (pos === gameState.trackLength - 1) {
      updateCommentary('nearFinish', { name: card.name });
    } else if (lastLeaderId && lastLeaderId !== currentLeader.id) {
      updateCommentary('overtake', { name: currentLeader.name });
      lastLeaderId = currentLeader.id;
    } else if (Math.random() > 0.7) {
      updateCommentary('move', { name: card.name });
    }
    
    if (!lastLeaderId) lastLeaderId = currentLeader.id;

    // 다음 턴 대기
    setTimeout(() => {
      if (checkWinner()) {
        gameState.isRacing = false;
      } else {
        nextTurn();
      }
    }, 1200);
  }, 600);
}

function updateCardDisplay(player) {
  const cardSlot = document.getElementById('current-card');
  const suits = ['♠', '♥', '♣', '♦'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  
  cardSlot.innerHTML = `
    <div class="playing-card" style="border-color: ${player.color}">
      <span style="font-size: 1.8rem; color: ${player.color}">${suit}</span>
      <span style="color: ${player.color}; font-size: 0.8rem;">${player.name}</span>
    </div>
  `;
}

function moveHorse(player) {
  const horse = document.getElementById(`horse-${player.id}`);
  let currentPos = parseInt(horse.dataset.pos);
  const nextPos = currentPos + 1;
  horse.dataset.pos = nextPos;
  
  const lane = document.getElementById(`lane-${player.id}`);
  const targetCell = lane.children[nextPos];
  
  // 중앙 정렬 보정 (말 크기 44px 고려)
  const targetX = targetCell.offsetLeft + (targetCell.offsetWidth / 2) - 22;
  horse.style.left = `${targetX}px`;
  
  updateRankings();
}

function updateRankings() {
  const rankListEl = document.getElementById('rank-list');
  
  // 현재 말들의 위치 정보를 가져와서 정렬
  const currentStandings = players.map(p => {
    const horse = document.getElementById(`horse-${p.id}`);
    return {
      ...p,
      pos: parseInt(horse.dataset.pos)
    };
  }).sort((a, b) => b.pos - a.pos); // 내림차순 정렬
  
  rankListEl.innerHTML = '';
  currentStandings.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    li.style.borderLeftColor = p.color;
    li.innerHTML = `
      <span class="rank-num">${index + 1}위</span>
      <span class="rank-name">${p.name}</span>
      <span class="rank-pos">${p.pos}칸</span>
    `;
    rankListEl.appendChild(li);
  });
}

function checkWinner() {
  const horses = document.querySelectorAll('.horse');
  let winners = [];
  
  horses.forEach(horse => {
    if (parseInt(horse.dataset.pos) >= gameState.trackLength) {
      const playerId = horse.id.replace('horse-', '');
      winners.push(players.find(p => p.id == playerId));
    }
  });
  
  if (winners.length > 0) {
    showResult(winners[0]); // 첫 번째 도착자 기준 (동시 도착 시 로직은 추후 보강 가능)
    return true;
  }
  return false;
}

function showResult(winner) {
  const resultTitle = document.getElementById('result-title');
  const winnerDisplay = document.getElementById('winner-display');
  
  if (gameState.winCondition === 'last') {
    // 꼴찌 당첨 로직은 추후 모든 말 도착 시 판정으로 보강 필요하나 우선 1등 기준으로 흐름 구현
    resultTitle.innerText = "🏁 경주 종료!";
    winnerDisplay.innerHTML = `<h1 style="color: ${winner.color}">${winner.name} 1위 도착!</h1>`;
  } else {
    resultTitle.innerText = "🎉 우승 축하합니다!";
    winnerDisplay.innerHTML = `<h1 style="color: ${winner.color}">${winner.name} 승리!</h1>`;
  }
  
  setTimeout(() => showScreen('result'), 1000);
}
