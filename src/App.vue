<template>
  <div id="app">
    <div class="left-panel">
      <ModelList
        @selected-model="onModelSelected"
        @model-forecasts="onModelForecasts"
      />
      <ForecastCalendar
        :forecasts="forecasts"
        @forecast-selected="onForecastSelected"
      />
    </div>

    <div class="right-panel">
      <div v-if="isPanelLoading" class="right-panel-loading-overlay">
        <div class="spinner"></div>
        <p>Loading forecast data...</p>
      </div>

      <div v-if="error" class="error-display">
        <p><strong>Error:</strong> {{ error }}</p>
      </div>

      <template v-if="selectedForecast">
        <div class="forecast-header">
          <h2>Forecast View</h2>
          <div class="forecast-info">
            <p><strong>Date:</strong> {{ formatDate(selectedForecast.forecast_start_date) }}</p>
            <p><strong>ID:</strong> {{ selectedForecast.id }}</p>

            <div v-if="forecastSize > 0" class="image-controls">
              <label for="shift-select"><strong>Map:</strong></label>
              <select
                id="shift-select"
                v-model.number="selectedShift"
                :disabled="isPanelLoading"
              >
                <option
                  v-for="n in forecastSize"
                  :key="n - 1"
                  :value="n - 1"
                >
                  {{ n - 1 }} ({{ getShiftTime(n - 1) }})
                </option>
              </select>
            </div>

            <p v-if="forecastSize > 0" class="total-maps-info">
              <strong>Total:</strong> {{ forecastSize }}
            </p>
          </div>
        </div>

        <div class="viewer-area">
          <ImageViewer
            :key="selectedForecast?.id"
            :forecast-id="selectedForecast?.id"
            :is-panel-loading="isPanelLoading"
            :selected-shift="selectedShift"
            @image-loaded="onImageLoaded"
            @image-error="onImageError"
          />
          
          <ImageSlider
            :forecast-size="forecastSize"
            v-model:selected-shift="selectedShift"
            :is-panel-loading="isPanelLoading"
          />

          <DownloadNPZ :forecast-id="selectedForecast?.id"/>
          <Metrics
            v-if="selectedModel && selectedDate"
            :selectedModel="selectedModel"
            :selectedDate="selectedDate"
          />
        </div>
      </template>

      <div v-else-if="!isPanelLoading && !error" class="viewer-area no-forecast-selected">
        <p>Select a model and date to view GIM maps.</p>
      </div>
    </div>
  </div>
</template>

<script>
import ModelList from './components/ModelList.vue'
import ForecastCalendar from './components/ForecastCalendar.vue'
import ImageViewer from './components/ImageViewer.vue';
import DownloadNPZ from './components/DownloadNPZ.vue';
import Metrics from './components/Metrics.vue';
import ImageSlider from './components/ImageSlider.vue';

export default {
  name: 'App',
  components: {
    ModelList,
    ForecastCalendar,
    ImageViewer,
    DownloadNPZ,
    Metrics,
    ImageSlider
  },

  data() {
    return {
      models: [],
      forecasts: [],
      selectedModel: null,
      selectedForecast: null,
      selectedDate: '',
      isPanelLoading: false,
      error: null,
      currentShiftInfo: null,
      baseUrl: 'https://services.simurg.space/gim-tec-forecast  ',
      forecastSize: 24,
      selectedShift: 0
    }
  },

  computed: {
    selectedForecastId() {
      return this.selectedForecast?.id || this.selectedForecast?.forecast_id || null;
    }
  },

  watch: {
    selectedForecast: {
      handler(newForecast) {
        if (newForecast) {
          this.isPanelLoading = true;
          this.error = null;
          this.currentShiftInfo = null;
        }
      },
      immediate: true
    },
  },

  methods: {
    onModelSelected(model) {
      this.selectedModel = model;
    },

    onModelForecasts(modelForecasts) {
      this.forecasts = modelForecasts;
      this.selectedForecast = null;
      this.selectedDate = '';
    },

    onForecastSelected(forecast) {
      this.selectedForecast = forecast;
      this.selectedDate = forecast.forecast_start_date;
    },

    onImageLoaded() {
      this.isPanelLoading = false;
      this.error = null; 
    },

    onImageError(error) {
      this.error = error;
      this.isPanelLoading = false;
    },

    onShiftChanged(shiftInfo) {
      this.currentShiftInfo = shiftInfo;
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    async fetchForecastSize(forecastId) {
      try {
        const response = await fetch(`${this.baseUrl}/get_forecast_size/${forecastId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const textResponse = await response.text();
        const data = JSON.parse(textResponse);
        this.forecastSize = data.size || data.forecast_size || data.total_shifts || 24;
      } catch (e) {
        this.forecastSize = 24;
      }
    },

    getShiftTime(shift) {
      const hours = shift;
      const minutes = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
}
</script>

<style>

:root {
  --primary-color: #007bff;
  --border-color: #ddd;
  --text-color: #333;
  --background-color: #f9f9f9;
  --panel-background: #ffffff;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --border-radius: 8px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f5f5f5;
}

#app {
  max-width: 1200px;
  margin: 40px auto 0 auto;
  padding: 0 16px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  background: #f5f5f5;
}

.main-layout {
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
  flex-direction: row;
}

.left-panel {
  flex: 1 1 320px;
  height: fit-content;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  position: relative;
  z-index: 1;
}

.right-panel {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  position: relative;
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.viewer-area {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  margin: 0;
  padding: 0;
}

.forecast-header {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.forecast-header h2 {
  margin: 0;
  font-size: var(--font-size-2xl);
  color: var(--text-color);
}

.forecast-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--background-color);
  gap: var(--spacing-md);
  margin: 0 auto;
  flex-wrap: wrap;
  box-sizing: border-box;
  max-width: 100%;
}

.forecast-info p {
  margin: 0;
  color: var(--text-color);
  font-size: var(--font-size-sm);
}

.forecast-info strong {
  color: var(--text-color);
  font-weight: 600;
}

.image-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.image-controls label {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.image-controls select {
  padding: var(--spacing-xs);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  min-width: 120px;
  font-size: var(--font-size-sm);
  background-color: white;
}

.total-maps-info {
  margin: 0;
  font-size: var(--font-size-sm);
}

.no-forecast-selected {
  text-align: center;
  color: #777;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.error-display {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  text-align: center;
  width: 100%;
}

.error-display p {
  margin: 0;
  font-size: var(--font-size-sm);
}

.right-panel-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 20;
  backdrop-filter: blur(3px);
  border-radius: var(--border-radius);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  #app {
    padding: 0 4px;
    margin-top: 24px;
  }
  .main-layout {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .left-panel, .right-panel {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    position: static;
    padding: 0;
  }
}

@media (max-width: 768px) {
  #app {
    padding: 0 2px;
    margin-top: 12px;
  }
  .main-layout {
    gap: var(--spacing-sm);
  }
  .right-panel {
    padding: 12px 2px;
  }
}

.table-container {
  width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
  margin: 0 0 16px 0;
}
.metrics-table {
  min-width: 700px;
  width: 100%;
  box-sizing: border-box;
}
.metrics-table th,
.metrics-table td {
  white-space: nowrap;
  padding: 8px 12px;
  text-align: left;
}

/* Styles for components */
:deep(.download-npz),
:deep(.download-npz *) {
  max-width: 600px !important;
  width: 100% !important;
  box-sizing: border-box;
  margin: 0 auto;
}

.forecast-header,
.forecast-info,
.viewer-area > .image-viewer,
:deep(.download-npz) {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Improvements for touch devices */
@media (hover: none) and (pointer: coarse) {
  .image-controls select {
    min-height: 44px; /* Minimum height for touch */
  }

  .forecast-info {
    gap: var(--spacing-md);
  }
}

.download-npz {
  width: 100%;
  margin: 16px 0 0 0;
  box-sizing: border-box;
  padding: 0;
  display: block;
}
.download-btn {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: block;
}

</style>