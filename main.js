// main.js

// Project data structure
let projects = JSON.parse(localStorage.getItem('projects')) || [];
// 存储计时器的引用
let timers = [];

// Function to save projects to localStorage
function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

// Function to format time
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to calculate progress percentage
function calculateProgress(elapsedTime, goalTime) {
    if (!goalTime || goalTime <= 0) return 0;
    const progress = (elapsedTime / goalTime) * 100;
    return Math.min(progress, 100); // 限制最大值为100%
}

// Function to update the display of a single project
function updateProjectDisplay(index) {
    const project = projects[index];
    const projectElement = document.querySelector(`#project-${index}`);
    if (projectElement) {
        // 更新时间显示
        const timeElement = projectElement.querySelector('.time-display');
        if (timeElement) {
            // 计算实时时间（包括正在运行的计时器）
            let displayTime = project.elapsedTime;
            if (project.isRunning && project.lastStart) {
                displayTime += Date.now() - project.lastStart;
            }
            timeElement.textContent = formatTime(displayTime);
        }
        
        // 更新进度条（如果存在目标时间）
        if (project.goalTime && project.goalTime > 0) {
            const progressBar = projectElement.querySelector('.progress-bar');
            const progressText = projectElement.querySelector('.progress-text');
            if (progressBar || progressText) {
                // 计算实时进度
                let currentElapsedTime = project.elapsedTime;
                if (project.isRunning && project.lastStart) {
                    currentElapsedTime += Date.now() - project.lastStart;
                }
                const progress = calculateProgress(currentElapsedTime, project.goalTime);
                
                // 更新进度条宽度
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                
                // 更新进度文本
                if (progressText) {
                    progressText.textContent = `${progress.toFixed(1)}%`;
                }
            }
        }
    }
}

// Function to render projects
function renderProjects() {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';
    projects.forEach((project, index) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.id = `project-${index}`;
        // 处理备注显示，如果备注为空则不显示
        const notesDisplay = project.notes ? `<div class="notes-display">${project.notes}</div>` : '';
        // 处理目标时间显示和进度条
        let goalDisplay = '';
        if (project.goalTime && project.goalTime > 0) {
            const progress = calculateProgress(project.elapsedTime, project.goalTime);
            goalDisplay = `
                <p><span style="font-size: 14px;">目标时间: ${formatTime(project.goalTime)}</span></p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <p><span class="progress-text" style="font-size: 14px;">${progress.toFixed(1)}%</span></p>
            `;
        }
        projectItem.innerHTML = `
            <h3>${project.name}</h3>
            ${notesDisplay}
            <div class="stats-container">
                <div class="stat-item">
                    <span class="time-display" style="font-size: 20px;">${formatTime(project.elapsedTime)}</span>
                    <span class="stat-label">累计时间</span>
                </div>
                <div class="stat-item">
                    <span class="time-display" style="font-size: 20px;">${project.count}</span>
                    <span class="stat-label">累计次数</span>
                </div>
            </div>
            ${goalDisplay}
            <div class="button-container">
                <button onclick="startTimer(${index})">${project.isRunning ? '暂停' : '开始'}</button>
                <button onclick="addCount(${index})">+1</button>
                <button onclick="deleteProject(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        // 添加双击事件
        projectItem.ondblclick = function() {
            openEditModal(index);
        };
        projectList.appendChild(projectItem);
    });
}

// Function to create a new project
function createProject(name, notes = '', goalTime = 0) {
    const newProject = {
        id: Date.now(),
        name,
        notes,
        goalTime, // 目标时间（毫秒）
        elapsedTime: 0,
        count: 0,
        isRunning: false,
        lastStart: null
    };
    projects.push(newProject);
    saveProjects();
    renderProjects();
}

// Function to open edit modal with project data
function openEditModal(index) {
    const project = projects[index];
    document.getElementById('edit-project-id').value = index;
    document.getElementById('edit-project-name').value = project.name;
    document.getElementById('edit-project-notes').value = project.notes || '';
    // 将毫秒转换为小时
    const goalHours = project.goalTime ? project.goalTime / (1000 * 3600) : '';
    document.getElementById('edit-project-goal').value = goalHours;
    
    // 显示编辑模态框
    document.getElementById('edit-project-modal').style.display = 'block';
}

// Function to update a project
function updateProject(index, name, notes, goalTime) {
    projects[index].name = name;
    projects[index].notes = notes;
    projects[index].goalTime = goalTime;
    saveProjects();
    renderProjects();
}

// Function to delete a project
function deleteProject(index) {
    const project = projects[index];
    if (!confirm(`确定要删除项目 "${project.name}" 吗？此操作无法撤销。`)) {
        return; // 用户取消删除
    }
    
    // 清除可能存在的计时器
    if (projects[index].isRunning) {
        projects[index].isRunning = false;
    }
    // 清除定时器
    if (timers[index]) {
        clearInterval(timers[index]);
        timers[index] = null;
    }
    projects.splice(index, 1);
    saveProjects();
    renderProjects();
}

// Function to start/stop timer
function startTimer(index) {
    const project = projects[index];
    if (!project.isRunning) {
        // 开始计时
        project.isRunning = true;
        project.lastStart = Date.now();
        // 启动实时更新显示
        timers[index] = setInterval(() => {
            updateProjectDisplay(index);
        }, 100); // 每100毫秒更新一次显示，使计时器看起来更流畅
    } else {
        // 暂停计时
        project.isRunning = false;
        if (project.lastStart) {
            project.elapsedTime += Date.now() - project.lastStart;
            project.lastStart = null;
        }
        // 停止实时更新显示
        if (timers[index]) {
            clearInterval(timers[index]);
            timers[index] = null;
        }
    }
    saveProjects();
    renderProjects();
}

// Function to add count
function addCount(index) {
    projects[index].count += 1;
    saveProjects();
    renderProjects();
}

// 页面加载时渲染项目列表，并恢复计时状态
window.onload = function() {
    renderProjects();
    // 恢复所有正在计时的项目
    projects.forEach((project, index) => {
        if (project.isRunning) {
            project.lastStart = Date.now();
            // 启动实时更新显示
            timers[index] = setInterval(() => {
                // 更新累计时间
                const now = Date.now();
                project.elapsedTime += now - project.lastStart;
                project.lastStart = now;
                // 更新显示
                updateProjectDisplay(index);
                // 定期保存
                saveProjects();
            }, 100); // 每100毫秒更新一次
        }
    });
}

// 添加项目按钮事件
document.getElementById('add-project').onclick = function() {
    // 显示模态框
    document.getElementById('add-project-modal').style.display = 'block';
};

// 模态框关闭按钮事件
document.querySelector('.modal .close').onclick = function() {
    document.getElementById('add-project-modal').style.display = 'none';
};

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('add-project-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// 添加项目表单提交事件
document.getElementById('add-project-form').onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('project-name').value.trim();
    const notes = document.getElementById('project-notes').value.trim();
    const goalHours = parseFloat(document.getElementById('project-goal').value) || 0;
    // 将小时转换为毫秒
    const goalTime = goalHours * 3600 * 1000;
    
    if (name) {
        createProject(name, notes, goalTime);
        // 清空表单并隐藏模态框
        document.getElementById('project-name').value = '';
        document.getElementById('project-notes').value = '';
        document.getElementById('project-goal').value = '';
        document.getElementById('add-project-modal').style.display = 'none';
    }
};

// 编辑项目表单提交事件
document.getElementById('edit-project-form').onsubmit = function(e) {
    e.preventDefault();
    const index = parseInt(document.getElementById('edit-project-id').value);
    const name = document.getElementById('edit-project-name').value.trim();
    const notes = document.getElementById('edit-project-notes').value.trim();
    const goalHours = parseFloat(document.getElementById('edit-project-goal').value) || 0;
    // 将小时转换为毫秒
    const goalTime = goalHours * 3600 * 1000;
    
    if (name && !isNaN(index)) {
        updateProject(index, name, notes, goalTime);
        // 清空表单并隐藏模态框
        document.getElementById('edit-project-form').reset();
        document.getElementById('edit-project-modal').style.display = 'none';
    }
};

// 取消编辑按钮事件
document.getElementById('cancel-edit').onclick = function() {
    document.getElementById('edit-project-form').reset();
    document.getElementById('edit-project-modal').style.display = 'none';
};

// 编辑模态框关闭按钮事件
document.querySelector('#edit-project-modal .close').onclick = function() {
    document.getElementById('edit-project-modal').style.display = 'none';
};