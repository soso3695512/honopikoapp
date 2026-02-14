// グローバル変数
let csvData = new Map();
let metaData = null;
let currentDate = new Date('2026-02-15');
let allAspects = [];
let showingAllAspects = false;

// 天体の日本語マッピング
const planetNames = {
    'Sun': '太陽', 'Moon': '月', 'Mercury': '水星', 'Venus': '金星',
    'Mars': '火星', 'Jupiter': '木星', 'Saturn': '土星',
    'Uranus': '天王星', 'Neptune': '海王星', 'Pluto': '冥王星',
    'ASC': 'ASC（上昇宮）', 'MC': 'MC（天頂）'
};

// アスペクトの日本語マッピング
const aspectNames = {
    'con': { name: '合（強調）', type: 'plus' },
    'sex': { name: '60°（協調）', type: 'plus' },
    'sq': { name: '90°（摩擦）', type: 'minus' },
    'tri': { name: '120°（追い風）', type: 'plus' },
    'opp': { name: '180°（対立）', type: 'minus' }
};

// 状態ラベル
const statusLabels = {
    0: '低調期', 20: '注意期', 40: '安定期', 60: '好調期', 80: '絶好調'
};

// 総合判定関数
function fortuneRank(score) {
    if (score >= 85) return { rank: '大吉', color: 'daikichi', message: '最高の運気！大きな一歩を踏み出すチャンスです。' };
    if (score >= 70) return { rank: '吉', color: 'kichi', message: '運気良好。積極的な行動が幸運を呼びます。' };
    if (score >= 55) return { rank: '中吉', color: 'chukichi', message: 'バランスの取れた日。前向きに過ごしましょう。' };
    if (score >= 40) return { rank: '小吉', color: 'shokichi', message: '穏やかな一日。小さな喜びを大切に。' };
    if (score >= 25) return { rank: '末吉', color: 'suekichi', message: '控えめな運気。じっくり準備を進める時期です。' };
    if (score >= 15) return { rank: '凶', color: 'kyo', message: '慎重に。焦らず、落ち着いて判断しましょう。' };
    return { rank: '大凶', color: 'daikyo', message: '休息優先。無理せず、守りの姿勢で過ごしましょう。' };
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    updateDisplay();
});

// データ読み込み
async function loadData() {
    try {
        const [csvResponse, jsonResponse] = await Promise.all([
            fetch('data/fortune_2026_daily_00UT.csv'),
            fetch('data/fortune_2026_daily_00UT_metadata.json')
        ]);

        const csvText = await csvResponse.text();
        const jsonData = await jsonResponse.json();

        metaData = jsonData;
        parseCSV(csvText);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('fortuneJudgment').style.display = 'block';
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        document.getElementById('loading').innerHTML = '<p>データの読み込みに失敗しました</p>';
    }
}

// CSV簡易パーサー
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};

        headers.forEach((header, index) => {
            row[header.trim()] = values[index] ? values[index].trim() : '';
        });

        csvData.set(row.date, row);
    }
}

// CSV行パーサー（引用符対応）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// イベントリスナー設定
function setupEventListeners() {
    const dateInput = document.getElementById('dateInput');
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    const toggleHowTo = document.getElementById('toggleHowTo');
    const showMoreBtn = document.getElementById('showMoreAspects');
    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('aspectModal');

    dateInput.value = formatDate(currentDate);

    dateInput.addEventListener('change', (e) => {
        currentDate = new Date(e.target.value + 'T00:00:00');
        updateDisplay();
    });

    prevBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        dateInput.value = formatDate(currentDate);
        updateDisplay();
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        dateInput.value = formatDate(currentDate);
        updateDisplay();
    });

    // 読み方ガイドの折りたたみ
    toggleHowTo.addEventListener('click', () => {
        const content = document.getElementById('howToContent');
        const icon = toggleHowTo.querySelector('.toggle-icon');
        const isExpanded = toggleHowTo.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            content.style.display = 'none';
            icon.textContent = '▼';
            toggleHowTo.setAttribute('aria-expanded', 'false');
        } else {
            content.style.display = 'block';
            icon.textContent = '▲';
            toggleHowTo.setAttribute('aria-expanded', 'true');
        }
    });

    // もっと見るボタン
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            showingAllAspects = !showingAllAspects;
            updateAspectsDisplay();
        });
    }

    // モーダルを閉じる
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // モーダルの外側クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 表示更新
function updateDisplay() {
    const mainContent = document.getElementById('mainContent');

    // フェードアウト
    mainContent.classList.add('fade-out');
    mainContent.classList.remove('fade-in');

    setTimeout(() => {
        const dateStr = formatDate(currentDate);
        const data = csvData.get(dateStr);

        if (!data) {
            mainContent.style.display = 'none';
            document.getElementById('fortuneJudgment').style.display = 'none';
            document.getElementById('noData').style.display = 'block';
            return;
        }

        mainContent.style.display = 'block';
        document.getElementById('fortuneJudgment').style.display = 'block';
        document.getElementById('noData').style.display = 'none';

        const score = parseFloat(data.score_0_100);

        updateFortuneJudgment(score);
        updateGauge(score);
        updateChart(dateStr);
        updateActionGuide(score);
        updateAIAnalysis(score);
        updateAspects(data.aspects_top);
        updateBirthInfo();

        // フェードイン
        mainContent.classList.remove('fade-out');
        mainContent.classList.add('fade-in');

        // トップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
}

// 総合判定表示
function updateFortuneJudgment(score) {
    const fortune = fortuneRank(score);
    const rankEl = document.getElementById('fortuneRank');
    const messageEl = document.getElementById('fortuneMessage');

    rankEl.textContent = fortune.rank;
    rankEl.className = `fortune-rank ${fortune.color}`;
    messageEl.textContent = fortune.message;
}

// ゲージ更新
function updateGauge(score) {
    const gauge = document.getElementById('gaugeProgress');
    const scoreText = document.getElementById('gaugeScore');
    const labelText = document.getElementById('gaugeLabel');

    const circumference = 534;
    const offset = circumference - (score / 100) * circumference;

    gauge.style.strokeDashoffset = offset;
    scoreText.textContent = Math.round(score);

    // 色変更
    if (score >= 80) {
        gauge.style.stroke = '#4caf50';
        labelText.textContent = statusLabels[80];
    } else if (score >= 60) {
        gauge.style.stroke = '#8bc34a';
        labelText.textContent = statusLabels[60];
    } else if (score >= 40) {
        gauge.style.stroke = '#ffd700';
        labelText.textContent = statusLabels[40];
    } else if (score >= 20) {
        gauge.style.stroke = '#ff9800';
        labelText.textContent = statusLabels[20];
    } else {
        gauge.style.stroke = '#f44336';
        labelText.textContent = statusLabels[0];
    }
}

// チャート更新
function updateChart(currentDateStr) {
    const canvas = document.getElementById('trendChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 過去14日分のデータ取得
    const scores = [];
    const date = new Date(currentDateStr + 'T00:00:00');

    for (let i = 13; i >= 0; i--) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const data = csvData.get(formatDate(d));
        scores.push(data ? parseFloat(data.score_0_100) : null);
    }

    // 描画
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const stepX = chartWidth / 13;

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();

    scores.forEach((score, i) => {
        if (score !== null) {
            const x = padding + i * stepX;
            const y = padding + chartHeight - (score / 100) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // ポイント描画
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.stroke();

    // グリッド線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
}

// 行動ガイド更新（スコアベース）
function updateActionGuide(score) {
    const goodList = document.getElementById('actionGood');
    const avoidList = document.getElementById('actionAvoid');
    const awareList = document.getElementById('actionAware');

    goodList.innerHTML = '';
    avoidList.innerHTML = '';
    awareList.innerHTML = '';

    let good = [], avoid = [], aware = [];

    if (score >= 70) {
        good = ['新しいことに挑戦する', '人との出会いを大切にする', '直感を信じて行動する'];
        avoid = ['チャンスを逃すこと', '消極的な姿勢'];
        aware = ['感謝の気持ちを忘れずに', '周りへの配慮も大切に'];
    } else if (score >= 40) {
        good = ['計画を立てて実行する', 'コミュニケーションを深める', '学びの時間を作る'];
        avoid = ['焦って決断すること', '無理な予定を詰めること'];
        aware = ['バランスを意識しましょう', '小さな成功を積み重ねて'];
    } else {
        good = ['休息を優先する', '身近な人との時間を大切に', '振り返りと整理の時間を持つ'];
        avoid = ['無理な挑戦', '衝動的な行動'];
        aware = ['焦らず、自分のペースで', '次のチャンスに備える時期'];
    }

    good.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        goodList.appendChild(li);
    });

    avoid.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        avoidList.appendChild(li);
    });

    aware.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        awareList.appendChild(li);
    });
}

// AI解説更新（占い口調）
function updateAIAnalysis(data) {
    const score = typeof data === 'number' ? data : parseFloat(data.score_0_100);

    // テーマ生成（占い口調）
    let theme = '';
    if (score >= 80) {
        theme = '星々が祝福する、絶好調の一日です。大きな一歩を踏み出す勝負の時。迷わず進みましょう。';
    } else if (score >= 60) {
        theme = '運気の風が追い風となり、あなたを後押しします。新しい扉を開く好機が訪れています。';
    } else if (score >= 40) {
        theme = '穏やかな星の導き。焦らず、着実に歩みを進めることで、道は開けていきます。';
    } else if (score >= 20) {
        theme = '星々は静かに見守っています。慎重な判断と、心の声に耳を傾けることが大切な時期です。';
    } else {
        theme = '今は休息と充電の時。無理をせず、エネルギーを蓄えましょう。次の輝きのために。';
    }
    document.getElementById('aiTheme').textContent = theme;

    // キーワード（占い風）
    const keywordsDiv = document.getElementById('aiKeywords');
    keywordsDiv.innerHTML = '';

    let keywords = [];
    if (score >= 70) keywords = ['飛躍', '勇気', '可能性'];
    else if (score >= 40) keywords = ['調和', '成長', 'つながり'];
    else keywords = ['内省', '準備', '安らぎ'];

    keywords.forEach(k => {
        const span = document.createElement('span');
        span.className = 'keyword-tag';
        span.textContent = k;
        keywordsDiv.appendChild(span);
    });
}

// アスペクト更新
function updateAspects(aspectsStr) {
    if (!aspectsStr) {
        allAspects = [];
        updateAspectsDisplay();
        return;
    }

    const aspectsArray = aspectsStr.split('|').map(a => a.trim()).filter(a => a);

    // 影響度でソート（絶対値が大きい順）
    allAspects = aspectsArray.map(aspectStr => {
        const match = aspectStr.match(/c=([-\d.]+)/);
        const influence = match ? parseFloat(match[1]) : 0;
        return { str: aspectStr, influence: Math.abs(influence) };
    }).sort((a, b) => b.influence - a.influence);

    showingAllAspects = false;
    updateAspectsDisplay();
}

// アスペクト表示更新
function updateAspectsDisplay() {
    const keyContainer = document.getElementById('keyAspectsList');
    const allContainer = document.getElementById('aspectsList');
    const showMoreBtn = document.getElementById('showMoreAspects');

    keyContainer.innerHTML = '';
    allContainer.innerHTML = '';

    if (allAspects.length === 0) {
        keyContainer.innerHTML = '<p class="no-aspects">本日は影響の強いアスペクトはありません</p>';
        showMoreBtn.style.display = 'none';
        return;
    }

    // キーアスペクト（トップ3）
    const top3 = allAspects.slice(0, 3);
    top3.forEach(aspect => {
        const card = createAspectCard(aspect.str, true);
        if (card) keyContainer.appendChild(card);
    });

    // 全アスペクト表示
    const displayAspects = showingAllAspects ? allAspects : allAspects.slice(0, 6);
    displayAspects.forEach(aspect => {
        const card = createAspectCard(aspect.str, false);
        if (card) allContainer.appendChild(card);
    });

    // もっと見るボタン
    if (allAspects.length > 6) {
        showMoreBtn.style.display = 'block';
        document.getElementById('showMoreText').textContent = showingAllAspects ? '閉じる' : 'もっと見る';
        document.getElementById('showMoreIcon').textContent = showingAllAspects ? '▲' : '▼';
    } else {
        showMoreBtn.style.display = 'none';
    }
}

// アスペクトカード作成
function createAspectCard(aspectStr, isKey) {
    const match = aspectStr.match(/t(\w+)\s+(\w+)\s+n(\w+)\s+orb=([\d.]+)\/([\d.]+)\s+c=([-\d.]+)/);
    if (!match) return null;

    const [, transitPlanet, aspectCode, natalPoint, currentOrb, allowedOrb, influence] = match;
    const influenceVal = parseFloat(influence);

    const aspectInfo = aspectNames[aspectCode];
    if (!aspectInfo) return null;

    const card = document.createElement('div');
    card.className = isKey ? 'aspect-card key-aspect' : 'aspect-card';

    // クリックでモーダル表示
    card.addEventListener('click', () => showAspectModal(aspectStr, match));

    const header = document.createElement('div');
    header.className = 'aspect-header';

    const planets = document.createElement('div');
    planets.className = 'aspect-planets';
    planets.innerHTML = `<span class="planet">${planetNames[transitPlanet] || transitPlanet}</span> × ${aspectInfo.name.split('（')[0]} × <span class="planet">${planetNames[natalPoint] || natalPoint}</span>`;

    const rightSide = document.createElement('div');
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '8px';

    const typeBadge = document.createElement('span');
    typeBadge.className = `aspect-badge ${aspectInfo.type}`;
    typeBadge.textContent = aspectInfo.type === 'plus' ? '調和' : '摩擦';

    const influenceBadge = document.createElement('span');
    influenceBadge.className = `aspect-influence-badge ${influenceVal >= 0 ? 'positive' : 'negative'}`;
    influenceBadge.textContent = (influenceVal > 0 ? '+' : '') + influenceVal.toFixed(1);

    rightSide.appendChild(typeBadge);
    rightSide.appendChild(influenceBadge);

    header.appendChild(planets);
    header.appendChild(rightSide);

    const description = document.createElement('div');
    description.className = 'aspect-description';

    const orbRatio = parseFloat(currentOrb) / parseFloat(allowedOrb);
    const strength = orbRatio < 0.3 ? '強い' : orbRatio < 0.6 ? '中程度の' : '弱い';

    if (aspectInfo.type === 'plus') {
        description.textContent = `${strength}調和のエネルギー。${planetNames[transitPlanet]}が${planetNames[natalPoint]}を${aspectInfo.name.split('（')[0]}で刺激し、あなたの運気を後押しします。`;
    } else {
        description.textContent = `${strength}緊張のエネルギー。${planetNames[transitPlanet]}が${planetNames[natalPoint]}を${aspectInfo.name.split('（')[0]}で刺激しています。慎重な行動を。`;
    }

    card.appendChild(header);
    card.appendChild(description);

    return card;
}

// アスペクト詳細モーダル表示
function showAspectModal(aspectStr, match) {
    const [, transitPlanet, aspectCode, natalPoint, currentOrb, allowedOrb, influence] = match;
    const influenceVal = parseFloat(influence);
    const aspectInfo = aspectNames[aspectCode];

    const modal = document.getElementById('aspectModal');
    const modalBody = document.getElementById('modalBody');

    const orbRatio = parseFloat(currentOrb) / parseFloat(allowedOrb);
    const strength = orbRatio < 0.3 ? '強い' : orbRatio < 0.6 ? '中程度' : '弱め';

    let interpretation = '';
    let tips = '';
    let caution = '';

    if (aspectInfo.type === 'plus') {
        interpretation = `${planetNames[transitPlanet]}と${planetNames[natalPoint]}が${aspectInfo.name}を形成し、調和のエネルギーが流れています。この配置は、あなたの運気を高め、物事がスムーズに進むサポートとなるでしょう。`;
        tips = '積極的に行動することで、このエネルギーを最大限に活かせます。新しいことにチャレンジする絶好のタイミングです。';
        caution = '調子が良い時こそ、周りへの感謝を忘れずに。';
    } else {
        interpretation = `${planetNames[transitPlanet]}と${planetNames[natalPoint]}が${aspectInfo.name}を形成し、緊張のエネルギーが生じています。この配置は、課題や葛藤をもたらすことがありますが、成長の機会でもあります。`;
        tips = '焦らず、冷静に状況を見極めましょう。計画的な行動が重要です。';
        caution = '衝動的な判断は避け、一呼吸置いてから決断することを心がけてください。';
    }

    modalBody.innerHTML = `
        <h3 class="modal-title">${planetNames[transitPlanet]} × ${aspectInfo.name} × ${planetNames[natalPoint]}</h3>
        <div class="modal-badges">
            <span class="aspect-badge ${aspectInfo.type}">${aspectInfo.type === 'plus' ? '調和' : '摩擦'}</span>
            <span class="aspect-influence-badge ${influenceVal >= 0 ? 'positive' : 'negative'}">${(influenceVal > 0 ? '+' : '') + influenceVal.toFixed(1)}</span>
        </div>
        <div class="modal-section">
            <h4>📊 詳細データ</h4>
            <p><strong>orb（オーブ）:</strong> ${parseFloat(currentOrb).toFixed(2)}° / ${parseFloat(allowedOrb).toFixed(1)}° （${strength}影響）</p>
            <p><strong>影響度:</strong> ${influenceVal.toFixed(2)}</p>
        </div>
        <div class="modal-section">
            <h4>🔮 解釈</h4>
            <p>${interpretation}</p>
        </div>
        <div class="modal-section">
            <h4>💡 活かし方</h4>
            <p>${tips}</p>
        </div>
        <div class="modal-section">
            <h4>⚠️ 注意点</h4>
            <p>${caution}</p>
        </div>
    `;

    modal.style.display = 'flex';
}

// 出生情報更新
function updateBirthInfo() {
    if (!metaData) return;

    const natal = metaData.natal;
    const info = `生年月日: ${natal.birth_date} | 出生時刻: ${natal.birth_time_jst} JST | ハウスシステム: ${natal.house_system}`;
    document.getElementById('birthInfo').textContent = info;
}

// 日付フォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
