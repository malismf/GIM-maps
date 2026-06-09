<template>
  <div class="model-list-container">
    <h2>Available models</h2>
    <div class="select-wrapper">
      <select v-model="selectedModel">
        <option value="" disabled>Select a model</option>
        <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>
    <div v-if="selectedModel" class="forecast-count">
      {{ forecastCountText }}
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { API_BASE_URL } from '../config/api.js'

export default {
  name: 'ModelList',
  emits: ['selected-model', 'model-forecasts'],

  data() {
    return {
      models: [],
      selectedModel: '',
      forecasts: []
    }
  },

  methods: {
    // загружает список моделей
    async loadModels() {
      try {
        const res = await axios.get(`${API_BASE_URL}/models`);
        this.models = Array.isArray(res.data) ? res.data : (res.data.models || []);

        // Set default model to "GIMini-LSTM-F10.7-7" if available, otherwise fallback to first model
        const defaultModel = "GIMini-LSTM-F10.7-7";
        if (this.models.includes(defaultModel)) {
          this.selectedModel = defaultModel;
        } else if (this.models.length > 0) {
          this.selectedModel = this.models[0];
        } else {
          this.selectedModel = ''; // no models available
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        this.models = [];
        this.selectedModel = '';
      }
    },

    // обновляет список прогнозов для выбранной модели
    async refresh_forecasts(modelCode) {
      if (!modelCode) return;
      this.forecasts = [];
      try {
        const res = await axios.get(`${API_BASE_URL}/get_all_forecasts/${modelCode}`);
        this.forecasts = Array.isArray(res.data) ? res.data : [];
        this.$emit('selected-model', modelCode);
        this.$emit('model-forecasts', this.forecasts);
      } catch (err) {
        this.$emit('selected-model', modelCode);
        this.$emit('model-forecasts', []);
      }
    }
  },

  async mounted() {
    await this.loadModels();
  },

  watch: {
    selectedModel(newModel) {
      if (newModel) {
        this.refresh_forecasts(newModel);
      }
    }
  },

  computed: {
    forecastCountText() {
      if (this.forecasts.length > 0) {
        return `Forecasts found: ${this.forecasts.length}`;
      }
      return 'No predictions found for the model.';
    }
  }
}
</script>

<style scoped>
.model-list-container {
  width: 100%;
  background-color: var(--panel-background, #ffffff);

}

.model-list-container h2 {
  margin-bottom: 15px;
}

.select-wrapper {
  position: relative;
  margin-bottom: var(--spacing-sm, 12px);
}

select {
  width: 100%;
  padding: var(--spacing-md, 16px);
  font-size: var(--font-size-md, 1rem);
  border-radius: 5px;
  border: 1.5px solid #b8cad5;
  background-color: white;
  color: var(--text-color, #333);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right var(--spacing-sm, 12px) center;
  background-size: 16px;
  padding-right: calc(var(--spacing-md, 16px) + 20px);
}

select:hover {
  border-color: var(--primary-color, #007bff);
}

select:focus {
  outline: none;
  border-color: var(--primary-color, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

select:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.forecast-count {
  margin-top: var(--spacing-sm, 12px);
  font-size: var(--font-size-sm, 0.875rem);
  color: #6c757d;
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) {
  .model-list-container {
    padding: var(--spacing-md, 16px);
  }

  .model-list-container h2 {
    font-size: var(--font-size-lg, 1.125rem);
  }

  select {
    padding: var(--spacing-sm, 12px);
    font-size: var(--font-size-sm, 0.875rem);
  }
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .model-list-container {
    padding: var(--spacing-sm, 12px);
  }

  .model-list-container h2 {
    font-size: var(--font-size-md, 1rem);
    margin-bottom: var(--spacing-sm, 12px);
  }

  select {
    padding: var(--spacing-md, 16px);
    font-size: var(--font-size-md, 1rem);
    min-height: 48px; /* Увеличиваем высоту для touch */
  }

  .forecast-count {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 8px);
  }
}

/* Адаптивность для очень маленьких экранов */
@media (max-width: 480px) {
  .model-list-container {
    padding: var(--spacing-xs, 8px);
  }

  .model-list-container h2 {
    font-size: var(--font-size-sm, 0.875rem);
  }

  select {
    padding: var(--spacing-sm, 12px);
    font-size: var(--font-size-sm, 0.875rem);
    min-height: 44px;
  }

  .forecast-count {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 8px);
  }
}

/* Улучшения для touch-устройств */
@media (hover: none) and (pointer: coarse) {
  select {
    min-height: 48px;
  }

  .model-list-container {
    border-width: 2px;
  }
}
</style>