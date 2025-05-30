const API_BASE = 'http://localhost:8084/api';
let allVocabulary = [];
let currentPracticeWord = null;

document.addEventListener('DOMContentLoaded', function() {
    // 页面切换逻辑
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');

            // 更新导航按钮状态
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 切换页面
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');

            // 加载对应页面数据
            if (pageId === 'vocabularyPage') {
                loadVocabulary();
            } else if (pageId === 'mistakesPage') {
                loadMistakes();
            } else if (pageId === 'practicePage') {
                loadPractice();
            }
        });
    });

    // 初始加载单词本
    loadVocabulary();

    // 练习页面按钮事件
    document.getElementById('nextBtn').addEventListener('click', nextPracticeWord);
    document.getElementById('addToMistakesBtn').addEventListener('click', addCurrentToMistakes);
    document.getElementById('practiceCard').addEventListener('click', togglePracticeDetails);

    // 添加上传功能
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            uploadVocabularyFile(file);
        }
    });
});

// 上传单词本文件
function uploadVocabularyFile(file) {
    if (!file || file.name !== 'jp.txt') {
        alert('请上传名为jp.txt的文件');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const loading = document.querySelector('#vocabularyPage .loading');
    loading.style.display = 'block';
    loading.textContent = '正在上传...';

    fetch(`${API_BASE}/upload-vocabulary`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('上传失败');
        return response.json();
    })
    .then(data => {
        loading.style.display = 'none';
        alert(data.message);
        loadVocabulary(); // 重新加载单词本
    })
    .catch(error => {
        console.error('上传失败:', error);
        loading.style.display = 'none';
        alert('上传失败，请重试');
    });
}

function loadVocabulary() {
    const container = document.getElementById('vocabularyList');
    const loading = document.querySelector('#vocabularyPage .loading');

    container.innerHTML = '';
    loading.style.display = 'block';

    fetch(`${API_BASE}/vocabulary`)
        .then(response => {
            if (!response.ok) throw new Error('网络响应不正常');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            displayVocabulary(data, container, true);
        })
        .catch(error => {
            console.error('获取单词失败:', error);
            loading.textContent = '加载失败，请刷新重试';
        });
}

function loadMistakes() {
    const container = document.getElementById('mistakesList');
    const loading = document.querySelector('#mistakesPage .loading');

    container.innerHTML = '';
    loading.style.display = 'block';

    fetch(`${API_BASE}/mistakes`)
        .then(response => {
            if (!response.ok) throw new Error('网络响应不正常');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            displayVocabulary(data, container, false);
        })
        .catch(error => {
            console.error('获取错题失败:', error);
            loading.textContent = '加载失败，请刷新重试';
        });
}

function displayVocabulary(vocabulary, container, showAddButton) {
    vocabulary.forEach(item => {
        const card = document.createElement('div');
        card.className = 'vocabulary-card';

        const wordEl = document.createElement('div');
        wordEl.className = 'word';
        wordEl.textContent = item.word;

        const pronunciationEl = document.createElement('div');
        pronunciationEl.className = 'pronunciation';
        pronunciationEl.textContent = item.pronunciation;

        const actions = document.createElement('div');
        actions.className = 'actions';

        if (showAddButton) {
            const addBtn = document.createElement('button');
            addBtn.className = 'action-btn add-mistake';
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';
            addBtn.title = '添加到错题本';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToMistakes(item);
            });
            actions.appendChild(addBtn);
        } else {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-mistake';
            removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            removeBtn.title = '从错题本删除';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromMistakes(item.word);
            });
            actions.appendChild(removeBtn);
        }

        card.appendChild(wordEl);
        card.appendChild(actions);
        card.appendChild(pronunciationEl);

        if (item.romaji) {
            const romajiEl = document.createElement('div');
            romajiEl.className = 'romaji';
            romajiEl.textContent = item.romaji;
            card.appendChild(romajiEl);
        }

        // 点击显示/隐藏详情
        card.addEventListener('click', function() {
            this.classList.toggle('show-details');
        });

        container.appendChild(card);
    });
}

// 新增练习相关函数
function loadPractice() {
    const loading = document.querySelector('#practicePage .loading');
    const practiceContainer = document.getElementById('practiceContainer');

    practiceContainer.style.display = 'none';
    loading.style.display = 'block';

    if (allVocabulary.length === 0) {
        fetch(`${API_BASE}/vocabulary`)
            .then(response => {
                if (!response.ok) throw new Error('网络响应不正常');
                return response.json();
            })
            .then(data => {
                allVocabulary = data;
                loading.style.display = 'none';
                practiceContainer.style.display = 'block';
                nextPracticeWord();
            })
            .catch(error => {
                console.error('获取单词失败:', error);
                loading.textContent = '加载失败，请刷新重试';
            });
    } else {
        loading.style.display = 'none';
        practiceContainer.style.display = 'block';
        nextPracticeWord();
    }
}

function nextPracticeWord() {
    if (allVocabulary.length === 0) return;

    const randomIndex = Math.floor(Math.random() * allVocabulary.length);
    currentPracticeWord = allVocabulary[randomIndex];

    document.getElementById('practiceWord').textContent = currentPracticeWord.word;
    document.getElementById('practicePronunciation').textContent = currentPracticeWord.pronunciation;
    document.getElementById('practiceRomaji').textContent = currentPracticeWord.romaji || '';

    // 重置显示状态
    document.getElementById('practiceCard').classList.remove('show-details');
}

function togglePracticeDetails() {
    this.classList.toggle('show-details');
}

function addCurrentToMistakes() {
    if (!currentPracticeWord) return;

    addToMistakes(currentPracticeWord);
}

async function addToMistakes(item) {
    try {
        // 先检查是否已存在
        const checkResponse = await fetch(`${API_BASE}/mistakes/check/${encodeURIComponent(item.word)}`);
        if (!checkResponse.ok) throw new Error('检查失败');

        const { exists } = await checkResponse.json();

        if (exists) {
            alert('该单词已在错题本中');
            return;
        }

        // 添加错题
        const addResponse = await fetch(`${API_BASE}/mistakes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item)
        });

        if (!addResponse.ok) throw new Error('添加失败');
        alert('已添加到错题本');
    } catch (error) {
        console.error('操作失败:', error);
        alert(error.message || '操作失败，请重试');
    }
}

function removeFromMistakes(word) {
    if (confirm(`确定要从错题本删除"${word}"吗？`)) {
        fetch(`${API_BASE}/mistakes/${encodeURIComponent(word)}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) throw new Error('删除失败');
            loadMistakes(); // 刷新错题本
        })
        .catch(error => {
            console.error('删除错题失败:', error);
            alert('删除失败，请重试');
        });
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .actions {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        height: 100%;
    }

    .vocabulary-card {
        position: relative;
        padding-right: 70px;
        min-height: 60px;
    }

    .show-details .pronunciation,
    .show-details .romaji {
        display: block;
        animation: fadeIn 0.3s ease forwards;
    }

    .pronunciation, .romaji {
        display: none;
    }

    #practiceContainer {
        display: none;
    }
`;
document.head.appendChild(style);