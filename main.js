import './style.css'

console.log('카드 레이싱 게임 초기화됨!');

// 간단한 화면 전환 로직 (테스트용)
const playerListEl = document.getElementById('player-list');
const addPlayerBtn = document.getElementById('add-player-btn');
const startGameBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-btn');

let players = [
  { id: 1, name: '레드베어', color: '#ef4444', weight: 1, energySuit: '♠', energy: 0 },
  { id: 2, name: '블루호크', color: '#3b82f6', weight: 1, energySuit: '♥', energy: 0 },
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
      <select class="suit-select" onchange="updatePlayer(${index}, 'energySuit', this.value)">
        <option value="♠" ${player.energySuit === '♠' ? 'selected' : ''}>♠</option>
        <option value="♥" ${player.energySuit === '♥' ? 'selected' : ''}>♥</option>
        <option value="♣" ${player.energySuit === '♣' ? 'selected' : ''}>♣</option>
        <option value="♦" ${player.energySuit === '♦' ? 'selected' : ''}>♦</option>
      </select>
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
    weight: 1,
    energySuit: ['♠', '♥', '♣', '♦'][players.length % 4],
    energy: 0
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
  isRacing: false,
  enableFaltering: false,
  enableStumble: false,
  enableEnergy: false,
  trackCards: []
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
  
  const falteringCheck = document.getElementById('rule-faltering')?.checked;
  const stumbleCheck = document.getElementById('rule-stumble')?.checked;
  const energyCheck = document.getElementById('rule-energy')?.checked;
  
  gameState.enableFaltering = !!falteringCheck;
  gameState.enableStumble = !!stumbleCheck;
  gameState.enableEnergy = !!energyCheck;

  // Track cards generation
  gameState.trackCards = [];
  if (gameState.enableFaltering) {
    for (let i = 0; i < gameState.trackLength; i++) {
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        gameState.trackCards.push({ id: randomPlayer.id, color: randomPlayer.color, flipped: false });
    }
  }

  // Energy reset
  players.forEach(p => p.energy = 0);
  
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

  // 조커 추가 (헛딛임 활성화시 덱의 1/15 장, 최소 2장 추가 후 다시 셔플)
  if (gameState.enableStumble) {
    const jokerCount = Math.max(2, Math.floor(totalSlots / 15));
    for(let i=0; i<jokerCount; i++) {
      deck.push({ id: 'joker', name: '조커', color: '#64748b' });
    }
    // 다시 셔플
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  
  return deck;
}

const commentaries = {
  start: [
    "게이트 열렸습니다! 드디어 본격적인 레이스가 시작됩니다!",
    "출발 기립! 각 마필들, 맹렬하게 튀어나갑니다!",
    "관중들의 거대한 함성과 함께 레이스 1막이 오릅니다! 과연 오늘의 승자는?"
  ],
  move: [
    "{name}, 모래바람을 일으키며 파죽지세로 치고 나옵니다!",
    "폭발적인 스피드! {name} 매섭게 차고 나갑니다!",
    "{name}, 거침없는 질주! 페이스를 무섭게 끌어올립니다!"
  ],
  overtake: [
    "아앗! 관중석이 술렁입니다! {name}(이)가 아웃코스에서 추월에 성공합니다!",
    "순위가 요동칩니다! {name}, 믿을 수 없는 벼락같은 앞지르기!",
    "대단한 탄력입니다! {name}(이)가 단숨에 판도를 뒤집습니다!"
  ],
  nearFinish: [
    "{name}, 마지막 4코너 돌면서 결승선이 눈앞입니다!",
    "이제 남은 건 단 한 발짝! {name}, 혼신의 채찍질을 멈추지 않습니다!",
    "숨막히는 라스트 스퍼트! {name} 맹렬히 파고듭니다!"
  ],
  finish: [
    "결승선 통과! {name}! {name}! {rank}위로 들어옵니다!",
    "마침내 들어왔습니다! {name}(이)가 {rank}위로 골인합니다!",
    "엄청난 뒷심을 발휘하며 {name}, 당당히 {rank}위 달성!"
  ],
  custom: ["{text}"]
};


function updateCommentary(type, data = {}) {
  const box = document.getElementById('commentary-text');
  const pool = commentaries[type] || commentaries['move'];
  let text = pool[Math.floor(Math.random() * pool.length)];
  
  if (data.name) {
    text = text.replace(/{name}/g, data.name);
  }
  if (data.text) {
    text = text.replace(/{text}/g, data.text);
  }
  if (data.rank) {
    text = text.replace(/{rank}/g, data.rank);
  }
  
  text = '중계: ' + text;
  
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
  
  players.forEach((player, pIndex) => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.id = `lane-${player.id}`;
    
    // 트랙 칸 생성
    for (let i = 0; i <= gameState.trackLength; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (i === gameState.trackLength) cell.classList.add('finish-line');
      
      // 첫 번째 레인에만 엎어둔 트랙 카드 렌더링 (절룩거림 규칙 활성화 시)
      if (pIndex === 0 && i > 0 && i <= gameState.trackLength && gameState.enableFaltering) {
        const cardData = gameState.trackCards[i - 1];
        const trackCardContainer = document.createElement('div');
        trackCardContainer.className = 'track-card-container';
        trackCardContainer.innerHTML = `
          <div class="track-card" id="track-card-${i}">
            <div class="track-card-face track-card-front" style="color: ${cardData.color}">●</div>
            <div class="track-card-face track-card-back"></div>
          </div>
        `;
        cell.appendChild(trackCardContainer);
      }
      
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
    if (tempCard.id === 'joker') {
      card = tempCard;
      break;
    }
    const horse = document.getElementById(`horse-${tempCard.id}`);
    const pos = horse ? parseInt(horse.dataset.pos) : 0;
    
    if (pos < gameState.trackLength) {
      card = tempCard;
      break;
    }
  }
  
  if (!card) {
    console.log('유효한 카드가 더 이상 없습니다. 종료합니다.');
    gameState.isRacing = false;
    checkWinner(); // 최종 판정 강제 실행
    return;
  }
  
  renderDeck(); 
  const suits = ['♠', '♥', '♣', '♦'];
  const drawnSuit = suits[Math.floor(Math.random() * suits.length)];
  updateCardDisplay(card, drawnSuit);
  
  const baseDelay = 800 / gameState.speed;
  const moveDelay = 400 / gameState.speed;

  setTimeout(() => {
    let energyNames = [];
    if (gameState.enableEnergy) {
      players.forEach(p => {
        const h = document.getElementById(`horse-${p.id}`);
        if (h && parseInt(h.dataset.pos) < gameState.trackLength) {
            if (p.energySuit === drawnSuit) {
              p.energy++;
              if (p.energy >= 3) {
                  p.energy = 0;
                  energyNames.push(p.name);
                  moveHorse(p, false); // 에너지 도약 시 절룩거림 체크 생략
              }
            }
        }
      });
      if (energyNames.length > 0) {
        updateCommentary('custom', { text: `⚡ 에너지 돌파! [${energyNames.join(', ')}] 추가 전진!` });
      }
    }

    if (card.id === 'joker') {
        const currentStandings = players.map(p => {
          const h = document.getElementById(`horse-${p.id}`);
          return { id: p.id, pos: h ? parseInt(h.dataset.pos) : 0 };
        }).sort((a, b) => b.pos - a.pos);
        
        const leaderPos = currentStandings[0].pos;
        const leaders = currentStandings.filter(p => p.pos === leaderPos).map(p => p.id);
        
        players.forEach(p => {
            if (!leaders.includes(p.id)) {
                const h = document.getElementById(`horse-${p.id}`);
                if (h && parseInt(h.dataset.pos) < gameState.trackLength) {
                    moveHorse(p, false); 
                }
            }
        });
        updateCommentary('custom', { text: `🃏 헛딛임 발동! 선두를 제외한 모든 말들이 전진합니다!` });
    } else {
        moveHorse(card, true); // 일반 이동 시 절룩거림 체크
        
        const horse = document.getElementById(`horse-${card.id}`);
        const pos = parseInt(horse.dataset.pos);
        const currentStandings = players.map(p => {
          const h = document.getElementById(`horse-${p.id}`);
          return { id: p.id, name: p.name, pos: h ? parseInt(h.dataset.pos) : 0 };
        }).sort((a, b) => b.pos - a.pos);
        
        const currentLeader = currentStandings[0];
        
        if (pos >= gameState.trackLength) {
           updateCommentary('finish', { name: card.name, rank: horse.dataset.finishOrder });
        } else if (pos === gameState.trackLength - 1) {
          updateCommentary('nearFinish', { name: card.name });
        } else if (lastLeaderId && lastLeaderId !== currentLeader.id) {
          updateCommentary('overtake', { name: currentLeader.name });
          lastLeaderId = currentLeader.id;
        } else if (energyNames.length === 0 && Math.random() > 0.7) {
          updateCommentary('move', { name: card.name });
        }
        
        if (!lastLeaderId) lastLeaderId = currentLeader.id;
    }

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

function updateCardDisplay(player, forcedSuit = null) {
  const cardSlot = document.getElementById('current-card');
  const suits = ['♠', '♥', '♣', '♦'];
  const suit = forcedSuit || suits[Math.floor(Math.random() * suits.length)];
  
  cardSlot.innerHTML = `
    <div class="playing-card" style="border-color: ${player.color}">
      <span style="font-size: 1.8rem; color: ${player.color}">${suit}</span>
      <span style="color: ${player.color}; font-size: 0.8rem;">${player.name}</span>
    </div>
  `;
}

function moveHorse(player, checkFaltering = true) {
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

    // Faltering Check
    if (checkFaltering && gameState.enableFaltering && pos > 0 && pos <= gameState.trackLength) {
      const cardData = gameState.trackCards[pos - 1];
      if (!cardData.flipped) {
        cardData.flipped = true;
        const cardEl = document.getElementById(`track-card-${pos}`);
        if (cardEl) {
          cardEl.classList.add('flipped');
          if (cardData.id === player.id) {
            setTimeout(() => {
              updateCommentary('custom', { text: `앗! 절룩거림! ${player.name} 뒤로 후퇴합니다!` });
              horse.classList.add('faltering-bounce');
              setTimeout(() => horse.classList.remove('faltering-bounce'), 500);
              
              pos = pos - 1;
              horse.dataset.pos = pos;
              globalMoveTick++;
              horse.dataset.moveTick = globalMoveTick;
              const backCell = lane.children[pos];
              if (layout === 'vertical') {
                horse.style.top = `${backCell.offsetTop + (backCell.offsetHeight / 2) - 22}px`;
              } else {
                horse.style.left = `${backCell.offsetLeft + (backCell.offsetWidth / 2) - 22}px`;
              }
              updateRankings();
              updateMinimap();
            }, 600);
          }
        }
      }
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
    let energyHtml = '';
    if (gameState.enableEnergy) {
      energyHtml = `
        <div class="energy-area" title="에너지 무늬: ${p.energySuit}">
          <span class="energy-icon">⚡</span>
          <div class="energy-dot ${p.energy >= 1 ? 'filled' : ''}"></div>
          <div class="energy-dot ${p.energy >= 2 ? 'filled' : ''}"></div>
          <div class="energy-dot ${p.energy >= 3 ? 'filled' : ''}"></div>
        </div>
      `;
    }

    li.innerHTML = `
      <span class="rank-pos">${index + 1}</span>
      <span class="rank-name">${p.name}</span>
      ${energyHtml}
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
