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
    // 꼴찌 선택 중일 경우 등수 자동 갱신
    const winCondition = document.getElementById('win-condition').value;
    if (winCondition === 'last') {
      document.getElementById('custom-rank').value = players.length;
    }
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
  // 꼴찌 선택 중일 경우 등수 자동 갱신
  const winCondition = document.getElementById('win-condition').value;
  if (winCondition === 'last') {
    document.getElementById('custom-rank').value = players.length;
  }
});

renderPlayerList();

// 당첨 조건 드롭다운 변경 이벤트
const winConditionSelect = document.getElementById('win-condition');
const customRankInput = document.getElementById('custom-rank');
const speedSelect = document.getElementById('game-speed');

winConditionSelect?.addEventListener('change', (e) => {
  if (e.target.value === '1') {
    customRankInput.value = 1;
    customRankInput.readOnly = true;
    customRankInput.style.opacity = 0.6;
  } else if (e.target.value === 'last') {
    customRankInput.value = players.length;
    customRankInput.readOnly = true;
    customRankInput.style.opacity = 0.6;
  } else {
    customRankInput.readOnly = false;
    customRankInput.style.opacity = 1;
  }
});

// 실시간 속도 조절 이벤트
speedSelect?.addEventListener('change', (e) => {
  gameState.speed = parseFloat(e.target.value);
  document.documentElement.style.setProperty('--speed-multiplier', gameState.speed);
  console.log(`속도 변경: ${gameState.speed}배속`);
});

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

let lastLeaderId = null;
let finishCounter = 0; // 도착 순서 기록용
let globalMoveTick = 0; // 트랙 내 선착순 판정용

function initGame() {
  const trackLengthInput = document.getElementById('track-length');
  const winConditionSelect = document.getElementById('win-condition');
  const customRankInput = document.getElementById('custom-rank');
  const speedSelect = document.getElementById('game-speed');
  
  gameState.trackLength = parseInt(trackLengthInput.value);
  gameState.winCondition = winConditionSelect.value;
  gameState.customRank = parseInt(customRankInput.value);
  
  // 게임 초기화 시 카운터 리셋
  finishCounter = 0;
  globalMoveTick = 0;
  
  // 현재 설정된 속도 반영
  gameState.speed = parseFloat(speedSelect.value);
  document.documentElement.style.setProperty('--speed-multiplier', gameState.speed);
  
  gameState.deck = createWeightedDeck(players);
  
  console.log('게임 시작! 덱 규모:', gameState.deck.length);
  renderTrack();
  renderDeck();
  renderMinimap();
  updateRankings();
  
  // 트랙 렌더링 후 약간의 지연을 두어 애니메이션이 먹히도록 한 뒤 시작
  setTimeout(() => {
    players.forEach(p => {
        // init position
        const horse = document.getElementById(`horse-${p.id}`);
        const lane = document.getElementById(`lane-${p.id}`);
        const cell = lane.children[0];
        const layout = getOrientationLayout();
        if (layout === 'vertical') {
          horse.style.top = `${cell.offsetTop + (cell.offsetHeight / 2) - 22}px`;
          horse.style.left = '50%';
        } else {
          horse.style.left = `${cell.offsetLeft + (cell.offsetWidth / 2) - 22}px`;
          horse.style.top = '50%';
        }
    });
    startRace();
  }, 1000);
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
  const totalSlots = players.length * gameState.trackLength * 2; // 요청된 공식: 말 수 * 트랙 길이 * 2
  const totalWeight = playerData.reduce((sum, p) => sum + p.weight, 0);
  
  playerData.forEach(player => {
    // 각 플레이어당 가중치 비율에 맞춰 카드 수 계산
    const playerCount = Math.floor((player.weight / totalWeight) * totalSlots);
    for (let i = 0; i < playerCount; i++) {
      deck.push({ ...player });
    }
  });

  // 누락된 슬롯만큼 랜덤 채우기 (반올림 오차 대응)
  while (deck.length < totalSlots) {
    const randomPlayer = playerData[Math.floor(Math.random() * playerData.length)];
    deck.push({ ...randomPlayer });
  }

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

// Orientation & View Helpers
function getOrientationLayout() {
  return window.matchMedia("(max-aspect-ratio: 1/1)").matches || window.matchMedia("(max-width: 768px)").matches ? 'vertical' : 'horizontal';
}

function centerCameraOnHorse(id) {
  const horse = document.getElementById(`horse-${id}`);
  const lane = document.getElementById(`lane-${id}`);
  const trackArea = document.querySelector('.track-area');
  if (!horse || !lane || !trackArea) return;
  
  const layout = getOrientationLayout();
  const pos = parseInt(horse.dataset.pos);
  const targetCell = lane.children[pos];
  
  if (layout === 'vertical') {
    trackArea.scrollTo({
      top: targetCell.offsetTop - trackArea.clientHeight / 2 + targetCell.offsetHeight / 2,
      behavior: 'smooth'
    });
  } else {
    trackArea.scrollTo({
      left: targetCell.offsetLeft - trackArea.clientWidth / 2 + targetCell.offsetWidth / 2,
      behavior: 'smooth'
    });
  }
}

// Minimap functions
function renderMinimap() {
  const minimap = document.getElementById('minimap-track');
  if(!minimap) return;
  minimap.innerHTML = '';
  players.forEach(p => {
    const dot = document.createElement('div');
    dot.className = 'minimap-dot';
    dot.style.backgroundColor = p.color;
    dot.id = `minimap-dot-${p.id}`;
    minimap.appendChild(dot);
  });
  updateMinimap();
}

function updateMinimap() {
  players.forEach(p => {
    const horse = document.getElementById(`horse-${p.id}`);
    const dot = document.getElementById(`minimap-dot-${p.id}`);
    if (horse && dot) {
      const pos = parseInt(horse.dataset.pos);
      const ratio = Math.min((pos / gameState.trackLength), 1) * 100;
      dot.style.left = `${ratio}%`;
      dot.style.top = '50%';
    }
  });
}

// Camera Tracking logic
let trackingMode = 'auto'; // 'auto' or player id
const autoTrackBtn = document.getElementById('auto-track-btn');
autoTrackBtn?.addEventListener('click', () => {
  trackingMode = 'auto';
  autoTrackBtn.classList.add('active');
  updateRankings();
  if (lastLeaderId) centerCameraOnHorse(lastLeaderId);
});

window.addEventListener('resize', () => {
  if (gameState.isRacing || gameState.deck.length > 0) {
    players.forEach(p => {
      const horse = document.getElementById(`horse-${p.id}`);
      const lane = document.getElementById(`lane-${p.id}`);
      if (horse && lane) {
        const layout = getOrientationLayout();
        const pos = parseInt(horse.dataset.pos);
        const targetCell = lane.children[pos];
        if (targetCell) {
          if (layout === 'vertical') {
            horse.style.top = `${targetCell.offsetTop + (targetCell.offsetHeight / 2) - 22}px`;
            horse.style.left = '50%';
          } else {
            horse.style.left = `${targetCell.offsetLeft + (targetCell.offsetWidth / 2) - 22}px`;
            horse.style.top = '50%';
          }
        }
      }
    });
    updateMinimap();
    
    if (trackingMode !== 'auto') {
      centerCameraOnHorse(trackingMode);
    } else if (lastLeaderId) {
      centerCameraOnHorse(lastLeaderId); // fallback to leader
    }
  }
});


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
    horse.dataset.finishOrder = 999; // 초기값 (완주 전엔 큰 값)
    
    lane.children[0].appendChild(horse);
    trackArea.appendChild(lane);
    
    // 초기 위치 강제 설정 (렌더링 직후 위치 기준점 세팅용 - 나중에 타이머로 재조정)
    horse.dataset.moveTick = 0;
    horse.style.left = `-100px`;
    horse.style.top = `-100px`;
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
  
  // 이미 완주한 말의 카드는 건너뛰기
  let card = null;
  while (gameState.deck.length > 0) {
    const tempCard = gameState.deck.pop();
    const horse = document.getElementById(`horse-${tempCard.id}`);
    const pos = horse ? parseInt(horse.dataset.pos) : 0;
    
    if (pos < gameState.trackLength) {
      card = tempCard;
      break;
    }
    // 이미 완주한 말의 카드라면 그냥 버리고 다음 카드로 진행 (로그 출력 생략 가능)
  }
  
  if (!card) {
    console.log('유효한 카드가 더 이상 없습니다. 종료합니다.');
    gameState.isRacing = false;
    checkWinner(); // 최종 판정 강제 실행
    return;
  }
  
  renderDeck(); 
  updateCardDisplay(card);
  
  const baseDelay = 800 / gameState.speed;
  const moveDelay = 400 / gameState.speed;

  // 카드가 날아오는 시간 뒤에 말이 움직이도록 시차 부여
  setTimeout(() => {
    moveHorse(card);
    
    // 상황 판단 로직
    const horse = document.getElementById(`horse-${card.id}`);
    const pos = parseInt(horse.dataset.pos);
    const currentStandings = players.map(p => {
      const h = document.getElementById(`horse-${p.id}`);
      return {
        id: p.id,
        name: p.name,
        pos: h ? parseInt(h.dataset.pos) : 0
      };
    }).sort((a, b) => b.pos - a.pos);
    
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
        console.log('경주 종료!');
      } else {
        nextTurn();
      }
    }, baseDelay);
  }, moveDelay);
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
  const lane = document.getElementById(`lane-${player.id}`);
  if (!horse || !lane) return;
  
  let pos = parseInt(horse.dataset.pos) + 1;
  // 트랙 끝을 넘지 않도록 제한
  if (pos > gameState.trackLength) pos = gameState.trackLength;
  
  const targetCell = lane.children[pos];
  if (targetCell) {
    horse.dataset.pos = pos;
    globalMoveTick++;
    horse.dataset.moveTick = globalMoveTick; // 이동 시점 기록
    
    const layout = getOrientationLayout();
    
    if (layout === 'vertical') {
      horse.style.top = `${targetCell.offsetTop + (targetCell.offsetHeight / 2) - 22}px`;
      horse.style.left = '50%';
    } else {
      horse.style.left = `${targetCell.offsetLeft + (targetCell.offsetWidth / 2) - 22}px`;
      horse.style.top = '50%';
    }
    
    // 도착 시 시각적 효과 및 도착 순서 기록
    if (pos === gameState.trackLength && parseInt(horse.dataset.finishOrder) === 999) {
      finishCounter++;
      horse.dataset.finishOrder = finishCounter;
      horse.classList.add('finished');
    }
    
    // Tracking mode action
    if (trackingMode === 'auto' || trackingMode === player.id) {
      centerCameraOnHorse(player.id);
    }
  }
  
  updateRankings();
  updateMinimap();
}

function updateRankings() {
  const rankList = document.getElementById('rank-list');
  
  // 현재 말들의 위치 정보를 가져와서 정렬
  const standings = players.map(p => {
    const horse = document.getElementById(`horse-${p.id}`);
    return {
      ...p,
      pos: horse ? parseInt(horse.dataset.pos) : 0,
      finishOrder: horse ? parseInt(horse.dataset.finishOrder) : 999,
      moveTick: horse ? parseInt(horse.dataset.moveTick) : 0
    };
  }).sort((a, b) => {
    if (b.pos !== a.pos) return b.pos - a.pos; // 1차 기준: 위치 (내림차순)
    if (a.finishOrder !== b.finishOrder) return a.finishOrder - b.finishOrder; // 2차 기준: 완주 순서 (오름차순)
    return a.moveTick - b.moveTick; // 3차 기준: 해당 위치 도달 선착순 (오름차순 - 작을수록 먼저 도착함)
  });
  
  rankList.innerHTML = '';
  standings.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item' + (trackingMode === p.id ? ' tracking' : '');
    li.style.borderLeftColor = p.color;
    li.innerHTML = `
      <span class="rank-pos">${index + 1}</span>
      <span class="rank-name">${p.name}</span>
    `;
    li.onclick = () => {
      trackingMode = p.id;
      const autoBtn = document.getElementById('auto-track-btn');
      if(autoBtn) autoBtn.classList.remove('active');
      updateRankings();
      centerCameraOnHorse(p.id);
    };
    rankList.appendChild(li);
  });
}

function checkWinner() {
  const horses = document.querySelectorAll('.horse');
  let finishedCount = 0;
  
  horses.forEach(horse => {
    if (parseInt(horse.dataset.pos) >= gameState.trackLength) {
      finishedCount++;
    }
  });
  
  // 모든 말이 들어왔을 때 최종 판정 (특정 등수나 꼴찌 판정을 위해)
  if (finishedCount === players.length) {
    const finalStandings = players.map(p => {
      const horse = document.getElementById(`horse-${p.id}`);
      return {
        ...p,
        pos: parseInt(horse.dataset.pos),
        finishOrder: parseInt(horse.dataset.finishOrder),
        moveTick: parseInt(horse.dataset.moveTick)
      };
    }).sort((a, b) => {
      if (b.pos !== a.pos) return b.pos - a.pos;
      if (a.finishOrder !== b.finishOrder) return a.finishOrder - b.finishOrder;
      return a.moveTick - b.moveTick;
    });
    
    let winner;
    if (gameState.winCondition === 'last') {
      winner = finalStandings[finalStandings.length - 1];
    } else if (gameState.winCondition === 'custom') {
      winner = finalStandings[Math.min(gameState.customRank - 1, finalStandings.length - 1)];
    } else {
      winner = finalStandings[0];
    }
    
    showResult(winner);
    return true;
  }
  return false;
}

function showResult(winner) {
  const resultTitle = document.getElementById('result-title');
  const winnerDisplay = document.getElementById('winner-display');
  
  let resultText = "🎊 경주 종료!";
  let winnerText = `<h1 style="color: ${winner.color}">${winner.name} 당첨!</h1>`;
  
  if (gameState.winCondition === 'custom') {
    resultText = `${gameState.customRank}등 당첨 확정!`;
  } else if (gameState.winCondition === 'last') {
    resultText = "꼴찌(벌칙자) 당첨!";
  }
  
  resultTitle.innerText = resultText;
  winnerDisplay.innerHTML = winnerText;
  
  setTimeout(() => showScreen('result'), 1000);
}
