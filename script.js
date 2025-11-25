        const defaultShopList = [
            { name: "teppay Mall 新宿店", iconChar: "t", iconColor: "#69caba", iconBg: "#fff" },
            { name: "毎王百貨店 燕谷店", iconChar: "👜", iconColor: "#f58220", iconBg: "#009944" },
            { name: "スーパー激安 高槻店", iconChar: "S", iconColor: "#005baa", iconBg: "#fff" },
            { name: "オーソン 相模大野店", iconChar: "L", iconColor: "#0067C0", iconBg: "#f2e6ce" },
            { name: "戸塚市役所 税務課", iconChar: "税", iconColor: "#fff", iconBg: "#e60012" },
            { name: "とちぎでんきストア 西川田店", iconChar: "📸", iconColor: "#005bac", iconBg: "#eaf2ff" },
        ];

        let currentBalance = 0;
        let pendingDeduction = 0;
        let currentPaymentShop = null;
        let customShops = [];

        function setCookie(name, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = name + "=" + (value || "")  + expires + "; path=/";
        }

        function getCookie(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for(let i=0;i < ca.length;i++) {
                let c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
        }

        function initBalance() {
            const saved = getCookie('teppay_balance');
            if (saved !== null) {
                currentBalance = parseInt(saved, 10);
            } else {
                currentBalance = 31040;
                setCookie('teppay_balance', currentBalance, 365);
            }
            updateAllBalanceDisplays(currentBalance);
        }

        function initCustomShops() {
            const saved = localStorage.getItem('teppay_custom_shops');
            if (saved) {
                customShops = JSON.parse(saved);
            }
        }

        // 支払い画面（コード表示）関連
        function openPayScreen() {
            document.getElementById('payScreen').classList.add('active');
            generateBarcode('payScreenBarcode'); // コード画面用バーコード生成
        }
        function closePayScreen() {
            document.getElementById('payScreen').classList.remove('active');
        }
        function triggerPaymentFromCode() {
            showPaymentComplete();
        }

        // 設定・リセット関連
        function openSettings() {
            document.getElementById('settingsScreen').classList.add('active');
        }
        function closeSettings() {
            document.getElementById('settingsScreen').classList.remove('active');
        }
        function showResetConfirm() {
            document.getElementById('resetModal').classList.add('active');
        }
        function closeResetConfirm() {
            document.getElementById('resetModal').classList.remove('active');
        }
        function executeReset() {
            const resetAmount = 31040;
            setCookie('teppay_balance', resetAmount, 365);
            localStorage.removeItem('teppay_history');
            localStorage.removeItem('teppay_custom_shops');
            currentBalance = resetAmount;
            customShops = [];
            updateAllBalanceDisplays(resetAmount);
            closeResetConfirm();
            closeSettings();
        }

        // カスタム店舗設定関連
        function openCustomShopScreen() {
            renderCustomShopList();
            document.getElementById('customShopScreen').classList.add('active');
        }
        function closeCustomShopScreen() {
            document.getElementById('customShopScreen').classList.remove('active');
        }
        function renderCustomShopList() {
            const listEl = document.getElementById('customShopList');
            const formEl = document.getElementById('customShopForm');
            listEl.innerHTML = '';

            customShops.forEach((shop, index) => {
                const item = document.createElement('div');
                item.className = 'custom-shop-item';
                item.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <div class="shop-preview-icon" style="color:${shop.iconColor}; background-color:${shop.iconBg};">
                            ${shop.iconChar}
                        </div>
                        <div class="shop-preview-name">${shop.name}</div>
                    </div>
                    <i class="fa-solid fa-trash delete-shop-btn" onclick="deleteCustomShop(${index})"></i>
                `;
                listEl.appendChild(item);
            });

            // 3件以上なら追加フォームを隠す
            if (customShops.length >= 3) {
                formEl.style.display = 'none';
            } else {
                formEl.style.display = 'block';
            }
        }
        function addCustomShop() {
            const name = document.getElementById('shopNameInput').value;
            const char = document.getElementById('shopCharInput').value;
            const color = document.getElementById('shopColorInput').value;
            const bg = document.getElementById('shopBgInput').value;

            if (!name || !char) {
                alert('店舗名とアイコン文字を入力してください');
                return;
            }

            customShops.push({
                name: name,
                iconChar: char,
                iconColor: color,
                iconBg: bg
            });
            localStorage.setItem('teppay_custom_shops', JSON.stringify(customShops));
            
            // 入力リセット
            document.getElementById('shopNameInput').value = '';
            document.getElementById('shopCharInput').value = '';
            
            renderCustomShopList();
        }
        function deleteCustomShop(index) {
            if (confirm('この店舗を削除しますか？')) {
                customShops.splice(index, 1);
                localStorage.setItem('teppay_custom_shops', JSON.stringify(customShops));
                renderCustomShopList();
            }
        }

        // お知らせ画面関連
        function openInfoScreen() {
            document.getElementById('infoScreen').classList.add('active');
        }
        function closeInfoScreen() {
            document.getElementById('infoScreen').classList.remove('active');
        }


        function saveHistory(type, amount, shopInfo) {
            const historyJson = localStorage.getItem('teppay_history');
            let history = historyJson ? JSON.parse(historyJson) : [];
            const now = new Date();
            const dateStr = `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            const newItem = { type: type, amount: amount, shop: shopInfo, date: dateStr, timestamp: now.getTime() };
            history.unshift(newItem);
            localStorage.setItem('teppay_history', JSON.stringify(history));
        }

        function showPaymentComplete() {
            if (currentBalance <= 0) {
                alert('入金ボタンを押してください！');
                return;
            }
            const amount = Math.floor(Math.random() * currentBalance) + 1;
            pendingDeduction = amount;

            // 店舗決定ロジック: カスタム店舗があれば優先的にそこからランダム
            if (customShops.length > 0) {
                currentPaymentShop = customShops[Math.floor(Math.random() * customShops.length)];
            } else {
                currentPaymentShop = defaultShopList[Math.floor(Math.random() * defaultShopList.length)];
            }
            
            document.getElementById('shopName').textContent = currentPaymentShop.name;
            const iconEl = document.getElementById('shopIcon');
            iconEl.textContent = currentPaymentShop.iconChar;
            iconEl.style.color = currentPaymentShop.iconColor;
            iconEl.style.backgroundColor = currentPaymentShop.iconBg;

            const now = new Date();
            const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            document.getElementById('paymentDate').textContent = dateStr;
            document.getElementById('paymentAmountDisplay').innerHTML = `${amount.toLocaleString()}<span>円</span>`;

            const ticket = Math.floor(Math.random() * (amount * 0.1)); 
            const limitPt = Math.floor(Math.random() * (amount * 0.05));
            const pt = Math.floor(Math.random() * (amount * 0.1));
            document.getElementById('detailTicket').textContent = ticket > 0 ? `${ticket.toLocaleString()}円分` : '0円分';
            document.getElementById('detailLimitPoint').textContent = limitPt > 0 ? `${limitPt.toLocaleString()}pt` : '0pt';
            document.getElementById('detailPoint').textContent = pt > 0 ? `${pt.toLocaleString()}pt` : '0pt';

            const audio = new Audio('teppay.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));

            document.getElementById('completeScreen').classList.add('active');
        }

        function closePaymentComplete() {
            document.getElementById('completeScreen').classList.remove('active');
            closePayScreen();
            
            setTimeout(() => {
                saveHistory('payment', pendingDeduction, currentPaymentShop);
                currentBalance -= pendingDeduction;
                if(currentBalance < 0) currentBalance = 0;
                setCookie('teppay_balance', currentBalance, 365);
                updateAllBalanceDisplays(currentBalance);
                pendingDeduction = 0;
                currentPaymentShop = null;
            }, 300);
        }

        function addMoney() {
            const addAmount = 1000;
            currentBalance += addAmount;
            setCookie('teppay_balance', currentBalance, 365);
            saveHistory('charge', addAmount, null);
            updateAllBalanceDisplays(currentBalance);
        }

        function showHistory() {
            const historyListEl = document.getElementById('historyList');
            historyListEl.innerHTML = ''; 
            const historyJson = localStorage.getItem('teppay_history');
            const history = historyJson ? JSON.parse(historyJson) : [];

            if (history.length === 0) {
                historyListEl.innerHTML = '<div class="no-history">履歴はありません</div>';
            } else {
                history.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'history-item';
                    let iconHtml = '', title = '', amountClass = 'history-amount', amountPrefix = '';
                    if (item.type === 'charge') {
                        iconHtml = '<i class="fa-solid fa-plus" style="color: #69caba;"></i>';
                        title = 'チャージ';
                        amountClass += ' plus';
                        amountPrefix = '+';
                    } else {
                        const shopBg = item.shop ? item.shop.iconBg : '#eee';
                        const shopColor = item.shop ? item.shop.iconColor : '#333';
                        const shopChar = item.shop ? item.shop.iconChar : '決';
                        title = item.shop ? item.shop.name : '支払い';
                        iconHtml = `<div style="font-weight:bold; color:${shopColor};">${shopChar}</div>`;
                        amountPrefix = '-';
                    }
                    row.innerHTML = `
                        <div class="history-icon-wrapper" style="${item.type === 'payment' && item.shop ? `background:${item.shop.iconBg}` : ''}">
                            ${iconHtml}
                        </div>
                        <div class="history-content">
                            <div class="history-title">${title}</div>
                            <div class="history-date">${item.date}</div>
                        </div>
                        <div class="${amountClass}">${amountPrefix}${item.amount.toLocaleString()}円</div>
                    `;
                    historyListEl.appendChild(row);
                });
            }
            document.getElementById('historyScreen').classList.add('active');
        }

        function closeHistory() {
            document.getElementById('historyScreen').classList.remove('active');
        }

        function updateAllBalanceDisplays(value) {
            const amountEls = document.querySelectorAll('.amount');
            const duration = 500;
            const startTime = Date.now();
            const intervalId = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime > duration) {
                    clearInterval(intervalId);
                    amountEls.forEach(el => el.innerHTML = value.toLocaleString() + '<span> 円</span>');
                } else {
                    const randomValue = Math.floor(Math.random() * 90000) + 10000;
                    amountEls.forEach(el => el.innerHTML = randomValue.toLocaleString() + '<span> 円</span>');
                }
            }, 30);
        }

        function generateBarcode(elementClassOrId) {
            const selector = elementClassOrId ? (elementClassOrId.startsWith('.') || elementClassOrId.startsWith('#') ? elementClassOrId : '#'+elementClassOrId) : '.barcode';
            const barcodeEls = document.querySelectorAll(selector);
            
            barcodeEls.forEach(barcodeEl => {
                let gradient = 'linear-gradient(90deg';
                let pos = 2;
                const startPattern = [{color: '#000', w: 0.5}, {color: '#fff', w: 0.5}, {color: '#000', w: 0.5}, {color: '#fff', w: 0.5}];
                startPattern.forEach(p => { gradient += `, ${p.color} ${pos}%, ${p.color} ${pos + p.w}%`; pos += p.w; });
                while (pos < 96) {
                    const widthIndex = Math.floor(Math.random() * 3);
                    const width = [0.8, 1.4, 2.0][widthIndex];
                    if (pos + width > 96) break;
                    gradient += `, #000 ${pos}%, #000 ${pos + width}%`;
                    pos += width;
                    const spaceIndex = Math.floor(Math.random() * 3);
                    const space = [0.8, 1.4, 2.0][spaceIndex];
                    if (pos + space > 96) break;
                    gradient += `, #fff ${pos}%, #fff ${pos + space}%`;
                    pos += space;
                }
                gradient += `, #000 ${pos}%, #000 ${pos + 0.5}%`; pos += 0.5;
                gradient += `, #fff ${pos}%, #fff ${pos + 2}%`;
                gradient += ')';
                barcodeEl.style.background = gradient;
            });
        }

        window.addEventListener('load', () => {
            generateBarcode('.barcode'); 
            initBalance();
            initCustomShops();
            document.body.addEventListener('touchstart', function() {}, {passive: true});
        });