// Constants
const API_BASE_URL = '/api';
const API_ENDPOINTS = {
    // Code API endpoints
    CODE_UPLOAD_ZIP: `${API_BASE_URL}/code/upload/zip`,
    CODE_UPLOAD_RAR: `${API_BASE_URL}/code/upload/rar`,
    CODE_GITHUB: `${API_BASE_URL}/code/github`,
    CODE_STATUS: `${API_BASE_URL}/code/status`,
    
    // QA API endpoints
    QA_QUESTION: `${API_BASE_URL}/qa/question`,
    QA_ANALYZE: `${API_BASE_URL}/qa/analyze`,
    QA_ANALYZE_STATUS: `${API_BASE_URL}/qa/analyze`,
    
    // Logs API endpoints
    LOGS_UPLOAD: `${API_BASE_URL}/logs/upload`,
    LOGS_STATUS: `${API_BASE_URL}/logs/status`,
    LOGS_QUESTION: `${API_BASE_URL}/logs/question`
};

// Global state
const state = {
    projects: [],
    currentProject: null,
    activeTab: 'chat',
    processing: false,
    activePolling: null
};

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    document.getElementById('sendButton').addEventListener('click', handleSendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    document.getElementById('addProjectButton').addEventListener('click', handleAddProject);
    document.getElementById('analyzeButton').addEventListener('click', handleAnalyzeCode);
    document.getElementById('analyzeLogsButton').addEventListener('click', handleAnalyzeLogs);
    
    // Load any existing projects from local storage
    loadProjects();
});

// Project Management
function loadProjects() {
    try {
        const savedProjects = localStorage.getItem('ragProjects');
        if (savedProjects) {
            state.projects = JSON.parse(savedProjects);
            renderProjects();
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function saveProjects() {
    try {
        localStorage.setItem('ragProjects', JSON.stringify(state.projects));
    } catch (error) {
        console.error('Error saving projects:', error);
    }
}

function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    
    if (state.projects.length === 0) {
        projectsList.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-folder-x" style="font-size: 3rem;"></i>
                <p class="mt-2">No projects yet</p>
            </div>
        `;
        return;
    }
    
    const projectsHtml = state.projects.map(project => `
        <a href="#" class="list-group-item list-group-item-action" data-id="${project.id}">
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${project.name}</h5>
                <small>${project.type}</small>
            </div>
            <small>${new Date(project.created).toLocaleDateString()}</small>
        </a>
    `).join('');
    
    projectsList.innerHTML = projectsHtml;
    
    // Add event listeners to the project items
    document.querySelectorAll('#projectsList a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const projectId = e.currentTarget.dataset.id;
            selectProject(projectId);
        });
    });
}

function selectProject(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    
    state.currentProject = project;
    
    // Update UI based on the project type
    if (project.type === 'log') {
        document.getElementById('noLogsProject').style.display = 'none';
        document.getElementById('logsInterface').style.display = 'block';
        document.getElementById('noChatProject').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'block';
        document.getElementById('noAnalysisProject').style.display = 'block';
        document.getElementById('analysisInterface').style.display = 'none';
        
        document.getElementById('logsProjectName').textContent = project.name;
        document.getElementById('chatProjectName').textContent = project.name;
    } else {
        document.getElementById('noAnalysisProject').style.display = 'none';
        document.getElementById('analysisInterface').style.display = 'block';
        document.getElementById('noChatProject').style.display = 'none';
        document.getElementById('chatInterface').style.display = 'block';
        document.getElementById('noLogsProject').style.display = 'block';
        document.getElementById('logsInterface').style.display = 'none';
        
        document.getElementById('analysisProjectName').textContent = project.name;
        document.getElementById('chatProjectName').textContent = project.name;
    }
    
    // Clear chat messages except the welcome message
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="assistant-message">
            <strong>Assistant:</strong> Hi! I'm your RAG Code Assistant. I can help with both general questions and code-specific queries about your project. How can I help you today?
        </div>
    `;
}

// API Interactions
async function handleAddProject() {
    const activeTab = document.querySelector('#projectTypeTabs .nav-link.active').id;
    state.processing = true;
    
    try {
        let response;
        let formData = new FormData();
        let projectName = '';
        let projectType = '';
        
        // Show progress container
        document.querySelector('.progress-container').style.display = 'block';
        document.querySelector('.progress-bar').style.width = '10%';
        document.getElementById('progressStatus').textContent = 'Starting upload...';
        
        switch (activeTab) {
            case 'archive-tab':
                const archiveFile = document.getElementById('archiveFile').files[0];
                projectName = document.getElementById('archiveProjectName').value;
                
                if (!archiveFile) {
                    alert('Please select a file to upload');
                    return;
                }
                
                formData.append('file', archiveFile);
                formData.append('project_name', projectName);
                
                const endpoint = archiveFile.name.toLowerCase().endsWith('.zip') 
                    ? API_ENDPOINTS.CODE_UPLOAD_ZIP 
                    : API_ENDPOINTS.CODE_UPLOAD_RAR;
                
                document.querySelector('.progress-bar').style.width = '25%';
                document.getElementById('progressStatus').textContent = 'Uploading file...';
                
                response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
                
                projectType = 'code';
                break;
                
            case 'github-tab':
                const repoUrl = document.getElementById('repoUrl').value;
                projectName = document.getElementById('repoProjectName').value || new URL(repoUrl).pathname.split('/').pop();
                
                document.querySelector('.progress-bar').style.width = '25%';
                document.getElementById('progressStatus').textContent = 'Downloading repository...';
                
                response = await fetch(API_ENDPOINTS.CODE_GITHUB, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: repoUrl, name: projectName })
                });
                
                projectType = 'code';
                break;
                
            case 'log-tab':
                const logFile = document.getElementById('logFile').files[0];
                projectName = document.getElementById('logProjectName').value;
                
                if (!logFile) {
                    alert('Please select a log file to upload');
                    return;
                }
                
                formData.append('file', logFile);
                formData.append('project_name', projectName);
                
                document.querySelector('.progress-bar').style.width = '25%';
                document.getElementById('progressStatus').textContent = 'Uploading log file...';
                
                response = await fetch(API_ENDPOINTS.LOGS_UPLOAD, {
                    method: 'POST',
                    body: formData
                });
                
                projectType = 'log';
                break;
        }
        
        document.querySelector('.progress-bar').style.width = '50%';
        document.getElementById('progressStatus').textContent = 'Processing...';
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${await response.text()}`);
        }
        
        const data = await response.json();
        
        // Poll for progress
        await pollProcessingStatus(data.job_id, projectType);
        
        // Add to projects list
        const newProject = {
            id: data.job_id,
            name: projectName,
            type: projectType,
            collection_name: data.collection_name || projectName,
            created: new Date().toISOString()
        };
        
        state.projects.push(newProject);
        saveProjects();
        renderProjects();
        
        // Close modal
        const addProjectModal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
        addProjectModal.hide();
        
        // Select the newly added project
        selectProject(data.job_id);
        
    } catch (error) {
        console.error('Error adding project:', error);
        alert(`Error: ${error.message}`);
        document.querySelector('.progress-bar').style.width = '100%';
        document.getElementById('progressStatus').textContent = `Error: ${error.message}`;
    } finally {
        state.processing = false;
    }
}

async function pollProcessingStatus(jobId, type) {
    const endpoint = type === 'log' 
        ? `${API_ENDPOINTS.LOGS_STATUS}/${jobId}`
        : `${API_ENDPOINTS.CODE_STATUS}/${jobId}`;
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // Maximum polling attempts
    
    while (!completed && attempts < maxAttempts) {
        attempts++;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Status check failed: ${await response.text()}`);
            }
            
            const data = await response.json();
            
            // Update progress
            const progress = Math.min(50 + (attempts / maxAttempts * 50), 95);
            document.querySelector('.progress-bar').style.width = `${progress}%`;
            document.getElementById('progressStatus').textContent = data.message;
            
            if (data.status === 'completed') {
                document.querySelector('.progress-bar').style.width = '100%';
                document.getElementById('progressStatus').textContent = 'Processing completed!';
                completed = true;
                return data.collection_name;
            } else if (data.status === 'failed') {
                throw new Error(`Processing failed: ${data.message}`);
            }
            
            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error('Error checking status:', error);
            throw error;
        }
    }
    
    if (!completed) {
        throw new Error('Processing timed out. Please check status later.');
    }
}

// Chat Functionality
async function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();
    
    if (!question) return;
    
    // Add user message to chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML += `
        <div class="user-message">
            <strong>You:</strong> ${question}
        </div>
    `;
    
    // Clear input
    chatInput.value = '';
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add loading indicator
    const loadingId = `loading-${Date.now()}`;
    chatMessages.innerHTML += `
        <div class="assistant-message" id="${loadingId}">
            <strong>Assistant:</strong> <span class="spinner-border spinner-border-sm"></span> Thinking...
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Determine which endpoint to use
        let endpoint, requestBody;
        
        if (!state.currentProject) {
            // Handle general conversation without a project
            endpoint = API_ENDPOINTS.QA_QUESTION;
            requestBody = {
                collection_name: "",  // Empty string indicates general conversation
                question: question
            };
        } else {
            // Normal case - project is selected
            endpoint = state.currentProject.type === 'log' 
            ? API_ENDPOINTS.LOGS_QUESTION
            : API_ENDPOINTS.QA_QUESTION;
        
            requestBody = {
                collection_name: state.currentProject.collection_name,
                question: question
            };
        }
        
        // Make the API call
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${await response.text()}`);
        }
        
        const data = await response.json();
        
        // Replace loading message with actual response
        document.getElementById(loadingId).innerHTML = `
            <strong>Assistant:</strong> ${formatMessage(data.answer)}
        `;
        
        // Add source citations if available and not a general conversation
        if (data.sources && data.sources.length > 0 && !data.is_conversation) {
            let sourcesHtml = '<div class="mt-2"><strong>Sources:</strong><ul>';
            data.sources.forEach(source => {
                sourcesHtml += `<li>${source}</li>`;
            });
            sourcesHtml += '</ul></div>';
            document.getElementById(loadingId).innerHTML += sourcesHtml;
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        document.getElementById(loadingId).innerHTML = `
            <strong>Assistant:</strong> I'm sorry, I encountered an error: ${error.message}
        `;
    }
    
    // Scroll to bottom again
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Code Analysis
async function handleAnalyzeCode() {
    if (!state.currentProject || state.currentProject.type !== 'code') {
        alert('Please select a code project first');
        return;
    }
    
    if (state.processing) {
        alert('Analysis already in progress. Please wait for it to complete.');
        return;
    }
    
    const analysisType = document.getElementById('analysisType').value;
    const filePath = document.getElementById('filePath').value.trim();
    
    // Show analysis is in progress
    document.getElementById('analysisResults').style.display = 'block';
    document.getElementById('analysisContent').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border" role="status"></div>
            <p class="mt-2">Analyzing code... This may take a few minutes.</p>
        </div>
    `;
    
    try {
        state.processing = true;
        
        // Start the analysis job with proper headers
        const response = await fetch(API_ENDPOINTS.QA_ANALYZE, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify({
                collection_name: state.currentProject.collection_name,
                analysis_type: analysisType,
                file_path: filePath || undefined
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${await response.text()}`);
        }
        
        const data = await response.json();
        const jobId = data.job_id;
        
        // Poll for analysis status
        await pollAnalysisStatus(jobId);
        
    } catch (error) {
        console.error('Error analyzing code:', error);
        document.getElementById('analysisContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error: ${error.message}
            </div>
        `;
    } finally {
        state.processing = false;
    }
}

async function pollAnalysisStatus(jobId) {
    if (state.activePolling) {
        clearInterval(state.activePolling);
        state.activePolling = null;
    }
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // Increase from 30 to 60 attempts (10 minutes total with 10s interval)
    const pollInterval = 10000; // 10-second interval
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    await checkStatus();
    
    return new Promise((resolve, reject) => {
        state.activePolling = setInterval(async () => {
            try {
                await checkStatus();
            } catch (error) {
                consecutiveErrors++;
                console.error(`Error polling status (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
                
                if (consecutiveErrors >= maxConsecutiveErrors) {
                clearInterval(state.activePolling);
                state.activePolling = null;
                    
                    document.getElementById('analysisContent').innerHTML = `
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i> Error checking analysis status: ${error.message}
                            <p>Please try refreshing the page or starting a new analysis.</p>
                        </div>
                    `;
                    
                reject(error);
                }
            }
        }, pollInterval);
    });
    
    async function checkStatus() {
        attempts++;
        
        if (attempts >= maxAttempts) {
            clearInterval(state.activePolling);
            state.activePolling = null;
            document.getElementById('analysisContent').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> Analysis is taking longer than expected.
                    <p>The analysis is still running but may take several more minutes to complete.</p>
                    <p>You can continue using other features of the application and check back later.</p>
                    <button id="checkAgainButton" class="btn btn-primary mt-2">Check Again</button>
                </div>
            `;
            
            // Add event listener to the Check Again button
            document.getElementById('checkAgainButton').addEventListener('click', async () => {
                // Reset the polling
                attempts = 0;
                document.getElementById('analysisContent').innerHTML = `
                    <div class="text-center py-3">
                        <div class="spinner-border" role="status"></div>
                        <p class="mt-2">Checking analysis status...</p>
                    </div>
                `;
                await checkStatus();
            });
            
            throw new Error('Analysis timed out. Please try again later.');
        }
        
        try {
            // Add timestamp to prevent caching issues
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_ENDPOINTS.QA_ANALYZE_STATUS}/${jobId}?_=${timestamp}`, {
                // Add cache control to prevent browser caching
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }).catch(error => {
                console.error('Network error:', error);
                throw new Error('Failed to connect to server. Please check your network connection.');
            });
            
            if (response.status === 404) {
                // Handle 404 specifically - check if this is analysis or something else
                console.warn("404 error when polling status - job may have been removed");
                throw new Error("Analysis job not found. It may have expired or been removed.");
            }
            
            if (!response.ok) {
                let errorMessage = 'Status check failed';
                try {
                    // Try to get more detailed error message from response
                    const errorText = await response.text();
                    errorMessage = `${errorMessage}: ${errorText}`;
                } catch (e) {
                    // If can't parse response, use generic message with status code
                    errorMessage = `${errorMessage}: Server returned ${response.status} ${response.statusText}`;
            }
                throw new Error(errorMessage);
            }
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                throw new Error('Error parsing server response. Please try again later.');
            }
            
            consecutiveErrors = 0; // Reset error counter on successful response
            
            // Check if this is a collection format issue early response
            if (data.status === 'completed_with_errors' && data.findings && 
                data.findings.collection_format_issue && 
                data.findings.collection_format_issue.includes('reindex')) {
                
                clearInterval(state.activePolling);
                state.activePolling = null;
                
                // Show reindex button
                document.getElementById('analysisContent').innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> Collection format issue detected
                        <p>Your code collection is using an older format and needs to be reindexed.</p>
                        <button id="reindexButton" class="btn btn-primary mt-2">Reindex Collection</button>
                    </div>
                `;
                
                // Add event listener for reindex button
                setTimeout(() => {
                    const reindexButton = document.getElementById('reindexButton');
                    if (reindexButton) {
                        reindexButton.addEventListener('click', () => handleReindexCollection(state.currentProject.collection_name));
                    }
                }, 100);
                
                completed = true;
                return;
            }
            
            document.getElementById('analysisContent').innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2">${data.message}</p>
                    <div class="progress mt-3">
                        <div class="progress-bar" role="progressbar" style="width: ${data.details?.progress_percentage || 0}%" 
                            aria-valuenow="${data.details?.progress_percentage || 0}" aria-valuemin="0" aria-valuemax="100">
                            ${data.details?.progress_percentage || 0}%
                        </div>
                    </div>
                    <p class="text-muted mt-2">${data.details?.current_stage || 'Processing'}</p>
                </div>
            `;
            
            if (data.status === 'completed' || data.status === 'completed_with_errors') {
                clearInterval(state.activePolling);
                state.activePolling = null;
                renderAnalysisResults(data);
                completed = true;
                return;
            } else if (data.status === 'failed') {
                clearInterval(state.activePolling);
                state.activePolling = null;
                throw new Error(`Analysis failed: ${data.message}`);
            }
            
        } catch (error) {
            console.error('Error checking analysis status:', error);
            // Don't throw here - let the error handling in setInterval deal with it
            // This prevents immediate termination on temporary network glitches
            throw error;
        }
    }
}

function renderAnalysisResults(data) {
    let resultsHtml = `
        <div class="alert alert-success">
            <i class="bi bi-check-circle"></i> Analysis completed successfully!
        </div>
    `;
    
    // Check if there's a collection format error in the findings
    let needsReindex = false;
    if (data.findings) {
        for (const [issue, finding] of Object.entries(data.findings)) {
            if (finding.includes("older format") && finding.includes("reindex")) {
                needsReindex = true;
                break;
            }
        }
    }
    
    if (needsReindex) {
        resultsHtml = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> Collection format issue detected
                <p>Your code collection is using an older format and needs to be reindexed.</p>
                <button id="reindexButton" class="btn btn-primary mt-2">Reindex Collection</button>
            </div>
        `;
        
        // Add results after the warning
        if (data.findings) {
            resultsHtml += `<div class="mt-4"><h5>Partial Analysis Results:</h5>`;
            
            Object.entries(data.findings).forEach(([issue, findings]) => {
                resultsHtml += `
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0">${issue}</h6>
                        </div>
                        <div class="card-body">
                            ${formatMessage(findings)}
                        </div>
                    </div>
                `;
            });
            
            resultsHtml += `</div>`;
        }
        
        document.getElementById('analysisContent').innerHTML = resultsHtml;
        
        // Add event listener for reindex button
        setTimeout(() => {
            const reindexButton = document.getElementById('reindexButton');
            if (reindexButton) {
                reindexButton.addEventListener('click', () => handleReindexCollection(state.currentProject.collection_name));
            }
        }, 100);
        
        return;
    }
    
    if (data.details?.errors && data.details.errors.length > 0) {
        resultsHtml += `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> There were some issues during analysis:
                <ul>
                    ${data.details.errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (data.findings) {
        resultsHtml += `<div class="mt-4"><h5>Analysis Results:</h5>`;
        
        Object.entries(data.findings).forEach(([issue, findings]) => {
            resultsHtml += `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">${issue}</h6>
                    </div>
                    <div class="card-body">
                        ${formatMessage(findings)}
                    </div>
                </div>
            `;
        });
        
        resultsHtml += `</div>`;
    }
    
    document.getElementById('analysisContent').innerHTML = resultsHtml;
}

// Function to handle reindexing a collection
async function handleReindexCollection(collectionName) {
    if (!collectionName) {
        alert('No collection selected');
        return;
    }
    
    // Show reindexing is in progress
    document.getElementById('analysisContent').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border" role="status"></div>
            <p class="mt-2">Reindexing collection... This may take a few minutes.</p>
        </div>
    `;
    
    try {
        // Call the reindex API with proper headers
        const response = await fetch(`${API_BASE_URL}/qa/reindex`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache' 
            },
            body: JSON.stringify({
                collection_name: collectionName
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${await response.text()}`);
        }
        
        const data = await response.json();
        const jobId = data.job_id;
        
        // Poll for reindexing status
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 10 minutes with 10-second polling
        
        // Use a different polling mechanism specifically for reindexing
        while (!completed && attempts < maxAttempts) {
            attempts++;
            
            try {
                // Add timestamp to prevent caching
                const timestamp = new Date().getTime();
                const statusResponse = await fetch(`${API_ENDPOINTS.QA_ANALYZE_STATUS}/${jobId}?_=${timestamp}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (!statusResponse.ok) {
                    if (statusResponse.status === 404) {
                        // Handle 404 gracefully
                        document.getElementById('analysisContent').innerHTML = `
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i> Reindexing status unavailable
                                <p>The status information for this job is no longer available. This might mean the process has completed but the status was not properly updated.</p>
                                <p>Please check if a new project with "_rebuilt" in the name has been created.</p>
                            </div>
                        `;
                        completed = true;
                        break;
                    } else {
                        throw new Error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
                    }
                }
                
                const statusData = await statusResponse.json();
                
                // Update the UI with progress
                document.getElementById('analysisContent').innerHTML = `
                    <div class="text-center py-3">
                        <div class="spinner-border" role="status"></div>
                        <p class="mt-2">${statusData.message}</p>
                        <div class="progress mt-3">
                            <div class="progress-bar" role="progressbar" style="width: ${statusData.details?.progress_percentage || 0}%" 
                                aria-valuenow="${statusData.details?.progress_percentage || 0}" aria-valuemin="0" aria-valuemax="100">
                                ${statusData.details?.progress_percentage || 0}%
                            </div>
                        </div>
                        <p class="text-muted mt-2">${statusData.details?.current_stage || 'Processing'}</p>
                    </div>
                `;
                
                if (statusData.status === 'completed') {
                    // Create a new project with the reindexed collection
                    const newProject = {
                        id: jobId,
                        name: `${state.currentProject.name} (Reindexed)`,
                        type: 'code',
                        collection_name: statusData.collection_name || `${collectionName}_rebuilt`,
                        created: new Date().toISOString()
                    };
                    
                    // Add to projects list
                    state.projects.push(newProject);
                    saveProjects();
                    renderProjects();
                    
                    // Select the newly added project
                    selectProject(jobId);
                    
                    // Show success message
                    document.getElementById('analysisContent').innerHTML = `
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle"></i> Collection reindexed successfully!
                            <p>A new project has been created with the reindexed collection.</p>
                        </div>
                    `;
                    
                    completed = true;
                } else if (statusData.status === 'failed') {
                    throw new Error(`Reindexing failed: ${statusData.message}`);
                }
                
                // Wait before polling again if not completed
                if (!completed) {
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second interval
                }
                
            } catch (error) {
                console.error(`Error checking reindexing status (attempt ${attempts}):`, error);
                
                // Only show error after a few consecutive failures
                if (attempts % 3 === 0) {
                    document.getElementById('analysisContent').innerHTML = `
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2">Reindexing in progress... (Status check error: ${error.message})</p>
                            <p class="text-muted">Continuing to check status...</p>
                        </div>
                    `;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second interval
            }
        }
        
        // Handle timeout
        if (!completed) {
            document.getElementById('analysisContent').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> Reindexing is taking longer than expected
                    <p>The reindexing process is still running but taking longer than expected.</p>
                    <p>Please check back later to see if a new project with "_rebuilt" in the name has been created.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error reindexing collection:', error);
        document.getElementById('analysisContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error: ${error.message}
            </div>
        `;
    }
}

// Log Analysis
async function handleAnalyzeLogs() {
    if (!state.currentProject || state.currentProject.type !== 'log') {
        alert('Please select a log project first');
        return;
    }
    
    const query = document.getElementById('logQuery').value.trim();
    
    // Show results section
    document.getElementById('logsResults').style.display = 'block';
    document.getElementById('logsContent').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border" role="status"></div>
            <p class="mt-2">Analyzing logs... This may take a few minutes.</p>
        </div>
    `;
    
    try {
        // Get the log analysis from the status endpoint
        const response = await fetch(`${API_ENDPOINTS.LOGS_STATUS}/${state.currentProject.id}`);
        
        if (!response.ok) {
            throw new Error(`Error: ${await response.text()}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'completed') {
            throw new Error('Log analysis is not completed yet');
        }
        
        if (query) {
            // Custom query - ask the QA system
            await handleSendMessage();
            document.getElementById('logsContent').innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Please check the chat tab for your query results.
                </div>
            `;
        } else {
            // Show the automatic analysis
            renderLogAnalysis(data);
        }
        
    } catch (error) {
        console.error('Error analyzing logs:', error);
        document.getElementById('logsContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error: ${error.message}
            </div>
        `;
    }
}

function renderLogAnalysis(data) {
    if (!data.analysis) {
        document.getElementById('logsContent').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> No analysis data available.
            </div>
        `;
        return;
    }
    
    let analysisHtml = `<div class="mt-4"><h5>Log Analysis:</h5>`;
    
    // Show summary
    if (data.analysis.summary) {
        analysisHtml += `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Summary</h6>
                </div>
                <div class="card-body">
                    ${formatMessage(data.analysis.summary)}
                </div>
            </div>
        `;
    }
    
    // Show errors
    if (data.analysis.errors && data.analysis.errors.length > 0) {
        analysisHtml += `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Errors Found</h6>
                </div>
                <div class="card-body">
                    <ul>
                        ${data.analysis.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    // Show patterns
    if (data.analysis.patterns) {
        analysisHtml += `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Patterns Detected</h6>
                </div>
                <div class="card-body">
                    ${formatMessage(data.analysis.patterns)}
                </div>
            </div>
        `;
    }
    
    // Show recommendations
    if (data.analysis.recommendations) {
        analysisHtml += `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Recommendations</h6>
                </div>
                <div class="card-body">
                    ${formatMessage(data.analysis.recommendations)}
                </div>
            </div>
        `;
    }
    
    analysisHtml += `</div>`;
    
    document.getElementById('logsContent').innerHTML = analysisHtml;
}

// Utility functions
function formatMessage(message) {
    // Convert markdown to HTML if marked library is available
    if (window.marked) {
        return marked.parse(message);
    }
    // Basic formatting if marked is not available
    return message
        .replace(/\n/g, '<br>')
        .replace(/```(\w*)([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
} 