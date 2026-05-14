<template>
    <div class="download-multiple-container">
      <h2>Download data</h2>
  
      <div class="download-multiple-form">
        <div class="date-field">
          <label for="date-from">From</label>
          <input
            id="date-from"
            v-model="dateFrom"
            type="date"
            class="date-input"
            :max="dateTo || undefined"
          />
        </div>
  
        <div class="date-field">
          <label for="date-to">To</label>
          <input
            id="date-to"
            v-model="dateTo"
            type="date"
            class="date-input"
            :min="dateFrom || undefined"
          />
        </div>
  
        <button
          class="download-multiple-btn"
          @click="downloadData"
          :disabled="!canDownload"
        >
          <span v-if="isLoading" class="btn-content">
            <span class="btn-spinner"></span>
            Downloading...
          </span>
          <span v-else-if="success" class="btn-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Ready!
          </span>
          <span v-else class="btn-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Download
          </span>
        </button>
      </div>
  
      <div v-if="error" class="download-multiple-error">{{ error }}</div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'DownloadMultipleData',
  
    props: {
      selectedModel: {
        type: String,
        default: null
      }
    },
  
    data() {
      return {
        dateFrom: '',
        dateTo: '',
        isLoading: false,
        success: false,
        error: null,
        baseUrl: 'http://10.0.6.178:8088'
      }
    },
  
    computed: {
      canDownload() {
        return this.selectedModel && this.dateFrom && this.dateTo && !this.isLoading
      }
    },
  
    methods: {
      async downloadData() {
        if (!this.canDownload) return
  
        this.isLoading = true
        this.error = null
        this.success = false
  
        try {
          const url = `${this.baseUrl}/download_data/${encodeURIComponent(this.selectedModel)}?date_from=${this.dateFrom}&date_to=${this.dateTo}`
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/octet-stream, application/zip, */*' }
          })
  
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  
          const blob = await response.blob()
          const filename = `${this.selectedModel}_${this.dateFrom}_${this.dateTo}.zip`
          this.downloadBlob(blob, filename)
  
          this.success = true
          setTimeout(() => { this.success = false }, 2000)
        } catch (err) {
          this.error = 'Download failed: ' + err.message
        } finally {
          this.isLoading = false
        }
      },
  
      downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    }
  }
  </script>
  
  <style scoped>
  .download-multiple-container {
    width: 100%;
    box-sizing: border-box;
  }
  
  h2 {
    font-family: 'Inter', sans-serif;
    margin: 0 0 var(--spacing-md, 16px) 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: #00203399;
  }
  
  .download-multiple-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 12px);
  }
  
  .date-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .date-field label {
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 600;
    color: var(--text-color, #333);
  }
  
  .date-input {
    width: 100%;
    padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
    font-size: var(--font-size-sm, 0.875rem);
    border-radius: 5px;
    border: 1.5px solid #b8cad5;
    background-color: white;
    color: var(--text-color, #333);
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
    font-family: inherit;
  }
  
  .date-input:hover {
    border-color: var(--primary-color, #007bff);
  }
  
  .date-input:focus {
    outline: none;
    border-color: var(--primary-color, #007bff);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  .download-multiple-btn {
    width: 100%;
    padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
    font-size: var(--font-size-md, 1rem);
    color: var(--text-color, #333);
    background-color: #e4e9eb;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    min-height: 48px;
    box-sizing: border-box;
    margin-top: 4px;
  }
  
  .download-multiple-btn:hover:not(:disabled) {
    background-color: var(--primary-color, #007bff);
    color: white;
    transform: translateY(-1px);
  }
  
  .download-multiple-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .download-multiple-btn:disabled {
    background-color: #f8f9fa;
    color: #aaa;
    cursor: not-allowed;
  }
  
  .btn-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 12px);
    justify-content: center;
  }
  
  .btn-spinner {
    width: 16px;
    height: 16px;
    border: 2.5px solid rgba(0, 0, 0, 0.2);
    border-radius: 50%;
    border-top-color: var(--text-color, #333);
    animation: spin 0.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  
  .download-multiple-btn:hover:not(:disabled) .btn-spinner {
    border-color: rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .download-multiple-error {
    margin-top: var(--spacing-sm, 12px);
    padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 5px;
    font-size: var(--font-size-sm, 0.875rem);
  }
  
  @media (hover: none) and (pointer: coarse) {
    .date-input,
    .download-multiple-btn {
      min-height: 48px;
    }
  }
  </style>