<template>
    <div class="download-multiple-container">
      <div class="download-multiple-header">
        <h2>Download data</h2>
        <span
          ref="helpTrigger"
          class="download-multiple-help"
          :class="{ 'download-multiple-help--open': helpOpen }"
          role="button"
          :aria-expanded="helpOpen"
          aria-describedby="download-multiple-help-tooltip"
          @click.stop="onHelpClick"
        >
          ?
          <span
            id="download-multiple-help-tooltip"
            class="download-multiple-help-tooltip"
            role="tooltip"
          >
            <ul class="download-multiple-help-list">
              <li>Use a date range of no more than one month.</li>
              <li>Downloaded files are provided in IONEX format.</li>
            </ul>
          </span>
        </span>
      </div>

      <div class="download-multiple-form">
        <div class="date-field">
          <label for="date-from">From</label>
          <input
            id="date-from"
            v-model="dateFrom"
            type="date"
            class="date-input"
          />
        </div>
  
        <div class="date-field">
          <label for="date-to">To</label>
          <input
            id="date-to"
            v-model="dateTo"
            type="date"
            class="date-input"
            :min="minDateTo"
            :max="maxDateTo"
          />
        </div>

        <div v-if="isRangeTooLong" class="download-multiple-error download-multiple-error--inline">
          Please select a date range of no more than one month.
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
  import { getDownloadFilename } from '../utils/download.js'
  import { API_BASE_URL } from '../config/api.js'

  const MAX_RANGE_DAYS = 31

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
        helpOpen: false
      }
    },

    created() {
      const today = new Date()
      const fromDefault = new Date(today)
      fromDefault.setDate(today.getDate() - 31)
      this.dateFrom = this.formatDate(fromDefault)
      this.dateTo = this.formatDate(today)
    },

    mounted() {
      document.addEventListener('click', this.onDocumentClick)
    },

    beforeUnmount() {
      document.removeEventListener('click', this.onDocumentClick)
    },
  
    computed: {
      minDateTo() {
        return this.dateFrom || undefined
      },

      maxDateTo() {
        if (!this.dateFrom) return undefined
        return this.shiftDate(this.dateFrom, MAX_RANGE_DAYS)
      },

      isDateRangeValid() {
        if (!this.dateFrom || !this.dateTo) return false
        const from = this.parseDate(this.dateFrom)
        const to = this.parseDate(this.dateTo)
        if (!from || !to || to < from) return false
        return this.diffInDays(from, to) <= MAX_RANGE_DAYS
      },

      isRangeTooLong() {
        if (!this.dateFrom || !this.dateTo) return false
        const from = this.parseDate(this.dateFrom)
        const to = this.parseDate(this.dateTo)
        if (!from || !to || to < from) return false
        return this.diffInDays(from, to) > MAX_RANGE_DAYS
      },

      canDownload() {
        return this.selectedModel && this.isDateRangeValid && !this.isLoading
      }
    },
  
    methods: {
      parseDate(ymd) {
        if (!ymd) return null
        const [year, month, day] = ymd.split('-').map(Number)
        if (!year || !month || !day) return null
        return new Date(year, month - 1, day)
      },

      formatDate(date) {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      },

      shiftDate(ymd, days) {
        const date = this.parseDate(ymd)
        if (!date) return undefined
        date.setDate(date.getDate() + days)
        return this.formatDate(date)
      },

      diffInDays(startDate, endDate) {
        const msPerDay = 24 * 60 * 60 * 1000
        const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        return Math.floor((endUtc - startUtc) / msPerDay)
      },

      isCoarsePointer() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches
      },

      onHelpClick() {
        if (!this.isCoarsePointer()) return
        this.helpOpen = !this.helpOpen
      },

      onDocumentClick(event) {
        if (!this.helpOpen || !this.$refs.helpTrigger) return
        if (!this.$refs.helpTrigger.contains(event.target)) {
          this.helpOpen = false
        }
      },

      async downloadData() {
        if (!this.canDownload) return
  
        this.isLoading = true
        this.error = null
        this.success = false

        try {
          const url = `${API_BASE_URL}/download_data/${encodeURIComponent(this.selectedModel)}?date_from=${this.dateFrom}&date_to=${this.dateTo}`
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/octet-stream, application/zip, */*' }
          })
  
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  
          const blob = await response.blob()
          const fallback = `${this.selectedModel}_${this.dateFrom}_${this.dateTo}.zip`
          const filename = getDownloadFilename(response, fallback)
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
    position: relative;
  }

  .download-multiple-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm, 12px);
    margin-bottom: var(--spacing-md, 16px);
  }

  .download-multiple-header h2 {
    font-family: 'Inter', sans-serif;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: #00203399;
  }

  .download-multiple-help {
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1;
    color: #00203399;
    background-color: #e4e9eb;
    border: 1px solid #b8cad5;
    user-select: none;
  }

  .download-multiple-help:active {
    outline: none;
    box-shadow: none;
  }

  .download-multiple-help-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    width: max-content;
    max-width: min(260px, calc(100vw - 32px));
    padding: 10px 12px;
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.4;
    color: #333;
    text-align: left;
    background: #fff;
    border: 1px solid #b8cad5;
    border-radius: 5px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.15s ease, visibility 0.15s ease;
  }

  .download-multiple-help-list {
    margin: 0;
    padding-left: 1.1em;
    list-style: disc;
  }

  .download-multiple-help-list li + li {
    margin-top: 4px;
  }

  @media (hover: hover) and (pointer: fine) {
    .download-multiple-help:hover .download-multiple-help-tooltip {
      opacity: 1;
      visibility: visible;
    }
  }

  @media (hover: none), (pointer: coarse) {
    .download-multiple-help--open .download-multiple-help-tooltip {
      opacity: 1;
      visibility: visible;
    }
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
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm, 12px);
    width: auto;
    max-width: 100%;
    line-height: 1.2;
  }

  .btn-content svg {
    flex-shrink: 0;
    display: block;
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

  .download-multiple-error--inline {
    margin-top: 0;
  }
  
  @media (hover: none) and (pointer: coarse) {
    .date-input,
    .download-multiple-btn {
      min-height: 48px;
    }
  }
  </style>