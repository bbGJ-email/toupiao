// API基础URL
const API_BASE_URL = '/api';

// DOM元素
const messageDiv = document.getElementById('message');
const pollsContainer = document.getElementById('pollsContainer');
const createPollBtn = document.getElementById('createPollBtn');
const createPollModal = document.getElementById('createPollModal');
const createPollForm = document.getElementById('createPollForm');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn = document.getElementById('addOptionBtn');
const cancelBtn = document.getElementById('cancelBtn');
const pollDetailModal = document.getElementById('pollDetailModal');
const pollDetailContent = document.getElementById('pollDetailContent');
const pollResultsModal = document.getElementById('pollResultsModal');
const pollResultsContent = document.getElementById('pollResultsContent');
const closeButtons = document.querySelectorAll('.close');

// 初始化应用
function init() {
    loadPolls();
    setupEventListeners();
}

// 加载投票列表
async function loadPolls() {
    pollsContainer.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/polls`);
        if (!response.ok) {
            throw new Error('Failed to load polls');
        }
        const polls = await response.json();
        renderPolls(polls);
    } catch (error) {
        showMessage('加载投票失败: ' + error.message, 'error');
        pollsContainer.innerHTML = '<p>加载投票失败，请刷新页面重试。</p>';
    }
}

// 渲染投票列表
function renderPolls(polls) {
    if (polls.length === 0) {
        pollsContainer.innerHTML = '<p>暂无投票，请创建第一个投票。</p>';
        return;
    }

    pollsContainer.innerHTML = polls.map(poll => `
        <div class="poll-item">
            <h3>${escapeHtml(poll.title)}</h3>
            ${poll.description ? `<p>${escapeHtml(poll.description)}</p>` : ''}
            <div class="poll-date">创建于: ${formatDate(poll.created_at)}</div>
            <div class="poll-actions">
                <button class="btn btn-primary btn-small" onclick="openPollDetail(${poll.id})">参与投票</button>
                <button class="btn btn-secondary btn-small" onclick="openPollResults(${poll.id})">查看结果</button>
            </div>
        </div>
    `).join('');
}

// 显示消息
function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// 转义HTML字符
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 打开创建投票模态框
    createPollBtn.addEventListener('click', () => {
        createPollModal.style.display = 'block';
        document.getElementById('pollTitle').focus();
    });

    // 关闭模态框
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.style.display = 'none';
            if (modal === createPollModal) {
                createPollForm.reset();
                resetOptions();
            }
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            if (event.target === createPollModal) {
                createPollForm.reset();
                resetOptions();
            }
        }
    });

    // 添加选项
    addOptionBtn.addEventListener('click', addOption);

    // 取消创建投票
    cancelBtn.addEventListener('click', () => {
        createPollModal.style.display = 'none';
        createPollForm.reset();
        resetOptions();
    });

    // 创建投票表单提交
    createPollForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleCreatePoll();
    });

    // 选项删除按钮事件委托
    optionsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-option-btn')) {
            const optionItem = event.target.closest('.option-item');
            if (optionsContainer.children.length > 2) {
                optionItem.remove();
            } else {
                showMessage('至少需要2个选项', 'error');
            }
        }
    });
}

// 重置选项
function resetOptions() {
    // 保留前两个选项，清空其他选项
    const optionItems = optionsContainer.querySelectorAll('.option-item');
    for (let i = optionItems.length - 1; i >= 2; i--) {
        optionItems[i].remove();
    }
    // 清空现有选项的值
    const optionInputs = optionsContainer.querySelectorAll('.option-text');
    optionInputs.forEach((input, index) => {
        input.value = '';
        input.placeholder = `选项 ${index + 1}`;
    });
}

// 添加选项
function addOption() {
    const optionCount = optionsContainer.children.length + 1;
    const optionItem = document.createElement('div');
    optionItem.className = 'option-item';
    optionItem.innerHTML = `
        <input type="text" class="option-text" name="options[]" required placeholder="选项 ${optionCount}">
        <button type="button" class="remove-option-btn">删除</button>
    `;
    optionsContainer.appendChild(optionItem);
}

// 处理创建投票
async function handleCreatePoll() {
    const formData = new FormData(createPollForm);
    const title = formData.get('title');
    const description = formData.get('description');
    const options = formData.getAll('options[]').filter(opt => opt.trim() !== '');

    if (options.length < 2) {
        showMessage('至少需要2个有效选项', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/polls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                options
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '创建投票失败');
        }

        const result = await response.json();
        showMessage('投票创建成功!', 'success');
        createPollModal.style.display = 'none';
        createPollForm.reset();
        resetOptions();
        loadPolls();
    } catch (error) {
        showMessage('创建投票失败: ' + error.message, 'error');
    }
}

// 打开投票详情
async function openPollDetail(pollId) {
    pollDetailContent.innerHTML = '<div class="loading">加载中...</div>';
    pollDetailModal.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}`);
        if (!response.ok) {
            throw new Error('Failed to load poll details');
        }
        const poll = await response.json();
        renderPollDetail(poll);
    } catch (error) {
        pollDetailContent.innerHTML = `<p>加载投票失败: ${error.message}</p>`;
    }
}

// 渲染投票详情
function renderPollDetail(poll) {
    pollDetailContent.innerHTML = `
        <div class="poll-detail">
            <h2>${escapeHtml(poll.title)}</h2>
            ${poll.description ? `<div class="poll-description">${escapeHtml(poll.description)}</div>` : ''}
            <div class="poll-date">创建于: ${formatDate(poll.created_at)}</div>
            
            <div class="vote-options">
                <h3>请选择一个选项:</h3>
                <form id="voteForm">
                    ${poll.options.map(option => `
                        <div class="vote-option">
                            <input type="radio" id="option-${option.id}" name="option_id" value="${option.id}" required>
                            <label for="option-${option.id}">${escapeHtml(option.text)}</label>
                        </div>
                    `).join('')}
                    <div class="form-actions" style="margin-top: 1rem; border-top: none;">
                        <button type="button" class="btn btn-secondary" onclick="pollDetailModal.style.display = 'none'">取消</button>
                        <button type="submit" class="btn btn-primary">提交投票</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // 投票表单提交事件
    document.getElementById('voteForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleVote(poll.id);
    });

    // 选项点击事件
    const voteOptions = document.querySelectorAll('.vote-option');
    voteOptions.forEach(option => {
        option.addEventListener('click', () => {
            const radioInput = option.querySelector('input[type="radio"]');
            radioInput.checked = true;
            // 移除其他选项的选中状态
            voteOptions.forEach(opt => opt.classList.remove('selected'));
            // 添加当前选项的选中状态
            option.classList.add('selected');
        });
    });
}

// 处理投票
async function handleVote(pollId) {
    const formData = new FormData(document.getElementById('voteForm'));
    const optionId = formData.get('option_id');

    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                option_id: parseInt(optionId)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '投票失败');
        }

        showMessage('投票成功!', 'success');
        pollDetailModal.style.display = 'none';
        openPollResults(pollId);
    } catch (error) {
        showMessage('投票失败: ' + error.message, 'error');
    }
}

// 打开投票结果
async function openPollResults(pollId) {
    pollResultsContent.innerHTML = '<div class="loading">加载中...</div>';
    pollResultsModal.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/results`);
        if (!response.ok) {
            throw new Error('Failed to load poll results');
        }
        const results = await response.json();
        renderPollResults(results);
    } catch (error) {
        pollResultsContent.innerHTML = `<p>加载结果失败: ${error.message}</p>`;
    }
}

// 渲染投票结果
function renderPollResults(results) {
    // 计算最大票数
    const maxVotes = Math.max(...results.results.map(r => r.vote_count), 1);
    
    pollResultsContent.innerHTML = `
        <div class="poll-results">
            <h2>${escapeHtml(results.title)}</h2>
            ${results.description ? `<div class="poll-description">${escapeHtml(results.description)}</div>` : ''}
            <div class="results-info">
                总票数: ${results.totalVotes} 票
            </div>
            <div class="results-container">
                ${results.results.map(result => {
                    const percentage = results.totalVotes > 0 ? Math.round((result.vote_count / results.totalVotes) * 100) : 0;
                    const barWidth = Math.round((result.vote_count / maxVotes) * 100);
                    return `
                        <div class="result-item">
                            <div class="result-text">
                                <span>${escapeHtml(result.text)}</span>
                                <span>${result.vote_count} 票 (${percentage}%)</span>
                            </div>
                            <div class="result-bar-container">
                                <div class="result-bar" style="width: ${barWidth}%;">
                                    ${percentage}%
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="form-actions" style="margin-top: 1.5rem; border-top: none;">
                <button type="button" class="btn btn-primary" onclick="pollResultsModal.style.display = 'none'">关闭</button>
            </div>
        </div>
    `;
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);