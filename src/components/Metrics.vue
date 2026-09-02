<template>
  <div class="metrics-container">
  <h1>Metrics</h1>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="isLoading" class="loading">
      Loading metrics...
    </div>

    <div v-else-if="!isLoading && metricsData.length > 0" class="metrics-content">
      <!-- Metrics charts -->
      <div v-if="filteredMetrics.length > 0" class="charts-section">
        <div class="chart-container">
          <h3>RMSE (Root Mean Square Error)</h3>
          <canvas ref="rmseChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
          <h3>MAE (Mean Absolute Error)</h3>
          <canvas ref="maeChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
          <h3>MAPE (Mean Absolute Percentage Error), %</h3>
          <canvas ref="mapeChart" width="400" height="200"></canvas>
        </div>
      </div>

      <!-- Data table -->
      <div class="table-section">
        <h3>Detailed Metrics Data</h3>
        <div class="table-container">
          <table class="metrics-table">
            <thead>
              <tr>
                <th>
                  Model
                </th>
                <th>Version</th>
                <th @click="sortBy('forecast_start_date')" class="sortable">
                  Forecast Date
                  <span v-if="sortField === 'forecast_start_date'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th @click="sortBy('rmse')" class="sortable">
                  RMSE
                  <span v-if="sortField === 'rmse'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th @click="sortBy('mape')" class="sortable">
                  MAPE (%)
                  <span v-if="sortField === 'mape'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th @click="sortBy('mae')" class="sortable">
                  MAE
                  <span v-if="sortField === 'mae'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in sortedMetrics" :key="`${metric.model_code}-${metric.forecast_start_date}`">
                <td>{{ metric.model_code }}</td>
                <td>{{ metric.model_version }}</td>
                <td>{{ formatDate(metric.forecast_start_date) }}</td>
                <td :class="getScoreClass('rmse', metric.rmse)">{{ metric.rmse !== null ? metric.rmse.toFixed(3) : '-' }}</td>
                <td :class="getScoreClass('mape', metric.mape)">{{ metric.mape !== null ? metric.mape.toFixed(2) : '-' }}</td>
                <td :class="getScoreClass('mae', metric.mae)">{{ metric.mae !== null ? metric.mae.toFixed(3) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="no-data">
      No metrics available for the last month
    </div>
  </div>
</template>

  <script>
  import { Chart, registerables } from 'chart.js'
  import { API_BASE_URL } from '../config/api.js'
  import 'chartjs-adapter-date-fns'

  Chart.register(...registerables)

  export default {
    name: 'Metrics',
    props: {
      selectedModel: { type: String, required: true },
      selectedDate: { type: String, required: true }
    },
    data() {
      return {
        metricsData: [],
        filteredMetrics: [],
        isLoading: false,
        error: null,
        charts: {
          rmse: null,
          mape: null,
          mae: null
        },
        sortField: 'forecast_start_date',
        sortOrder: 'desc'
      }
    },

    computed: {
      startDate() {
        if (!this.selectedDate) return '';
        const selected = new Date(this.selectedDate);
        const prevMonth = new Date(selected);
        prevMonth.setMonth(selected.getMonth() - 1);
        return prevMonth.toISOString().split('T')[0];
      },
      endDate() {
        return this.selectedDate ? new Date(this.selectedDate).toISOString().split('T')[0] : '';
      },
      sortedMetrics() {
        const sorted = [...this.filteredMetrics].sort((a, b) => {
          let aVal = a[this.sortField];
          let bVal = b[this.sortField];

          if (this.sortField.includes('date')) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          }

          if (this.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
        return sorted;
      }
    },

    watch: {
      selectedModel() { this.fetchMetrics(); },
      selectedDate() { this.fetchMetrics(); },
      filteredMetrics() {
        this.$nextTick(() => {
          this.updateCharts();
        });
      }
    },

    mounted() {
      this.fetchMetrics();
    },

    beforeUnmount() {
      this.destroyCharts();
    },

    methods: {
      async fetchMetrics() {
        if (!this.selectedModel || !this.startDate || !this.endDate) {
          this.error = 'Выберите модель и дату.';
          this.metricsData = [];
          this.filteredMetrics = [];
          this.destroyCharts();
          return;
        }
        const url = `${API_BASE_URL}/get_metrics/${this.selectedModel}?date_from=${this.startDate}&date_to=${this.endDate}`;
        this.isLoading = true;
        this.error = null;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
          this.metricsData = await response.json();
          this.filteredMetrics = this.metricsData;

          // Если нет данных, уничтожаем графики
          if (this.metricsData.length === 0) {
            this.destroyCharts();
          }
        } catch (error) {
          this.error = 'Ошибка загрузки метрик: ' + error;
          this.metricsData = [];
          this.filteredMetrics = [];
          this.destroyCharts();
        } finally {
          this.isLoading = false;
        }
      },

      updateCharts() {
        if (this.filteredMetrics.length === 0) {
          this.destroyCharts();
          return;
        }

        const formatDataForChart = (metricKey) => {
          return this.filteredMetrics.map(m => ({
            x: new Date(m.forecast_start_date),
            y: m[metricKey]
          })).sort((a, b) => a.x.getTime() - b.x.getTime());
        };

        const rmseData = formatDataForChart('rmse');
        const maeData = formatDataForChart('mae');
        const mapeData = formatDataForChart('mape');

        const rmseColor = 'rgba(102, 178, 255, 0.7)';
        const maeColor = 'rgba(220, 53, 69, 0.7)';
        const mapeColor = 'rgba(0, 32, 91, 0.7)';

        this.createChart('rmse', 'rmseChart', rmseData, rmseColor, 'RMSE');
        this.createChart('mae', 'maeChart', maeData, maeColor, 'MAE');
        this.createChart('mape', 'mapeChart', mapeData, mapeColor, 'MAPE (%)');
      },

      createChart(chartKey, refName, data, color, label) {
        if (this.charts[chartKey]) {
          this.charts[chartKey].destroy();
        }
        const ctx = this.$refs[refName];
        if (!ctx) return;

        this.charts[chartKey] = new Chart(ctx, {
          type: 'line',
          data: {
            datasets: [{
              label,
              data,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 2,
              fill: false,
              tension: 0.2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: true }
            },
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'day',
                  tooltipFormat: 'dd.MM.yyyy',
                  displayFormats: {
                    day: 'dd.MM'
                  }
                },
                min: this.getLastMonthDate().getTime(),
                max: new Date().getTime()
              },
              y: {
                beginAtZero: true
              }
            }
          }
        });
      },

      getLastMonthDate() {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return lastMonth;
      },

      destroyCharts() {
        Object.values(this.charts).forEach(chart => {
          if (chart) {
            chart.destroy();
          }
        });
        this.charts = { rmse: null, mape: null, mae: null };
      },

      calculateAverage(metric) {
        if (this.filteredMetrics.length === 0) return '0.00';
        const sum = this.filteredMetrics.reduce((sum, m) => sum + m[metric], 0);
        return (sum / this.filteredMetrics.length).toFixed(2);
      },

      calculateMin(metric) {
        if (this.filteredMetrics.length === 0) return '0.00';
        return Math.min(...this.filteredMetrics.map(m => m[metric])).toFixed(2);
      },

      calculateMax(metric) {
        if (this.filteredMetrics.length === 0) return '0.00';
        return Math.max(...this.filteredMetrics.map(m => m[metric])).toFixed(2);
      },

      formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      },

      formatDateShort(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
          month: '2-digit',
          day: '2-digit'
        });
      },

      sortBy(field) {
        if (this.sortField === field) {
          this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortOrder = 'asc';
        }
      },

      getScoreClass(metric, value) {
        // Логика для цветовой индикации качества метрик
        if (metric === 'mape') {
          if (value < 15) return 'score-good';
          if (value < 25) return 'score-medium';
          return 'score-poor';
        }

        // Для RMSE и MAE - чем меньше, тем лучше
        const avgValue = parseFloat(this.calculateAverage(metric));
        if (value < avgValue * 0.8) return 'score-good';
        if (value < avgValue * 1.2) return 'score-medium';
        return 'score-poor';
      }
    }
  }
  </script>

<style scoped>
  .metrics-container {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    background-color: var(--panel-background, #ffffff);
    box-sizing: border-box;
  }

  .metrics-container h2 {
    margin: 0 0 var(--spacing-lg, 20px) 0;
    font-size: var(--font-size-xl, 1.25rem);
    color: var(--text-color, #333);
    text-align: center;
  }

  .error-message {
    padding: var(--spacing-md, 16px);
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: var(--border-radius, 8px);
    margin-bottom: var(--spacing-lg, 20px);
    font-size: var(--font-size-sm, 0.875rem);
  }

  .loading {
    text-align: center;
    padding: var(--spacing-xl, 24px);
    color: #6c757d;
    font-size: var(--font-size-md, 1rem);
  }

  .no-data {
    text-align: center;
    padding: var(--spacing-xl, 24px);
    color: #6c757d;
    font-size: var(--font-size-md, 1rem);
  }

  .metrics-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl, 24px);
  }

    .charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--spacing-lg, 20px);
    margin-bottom: var(--spacing-xl, 24px);
    min-width: 0;
  }

  .chart-container {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    padding: var(--spacing-lg, 20px);
    background-color: var(--background-color, #f8f9fa);
    border: 1px solid var(--border-color, #ddd);
    border-radius: var(--border-radius, 8px);
  }

  .chart-container h3 {
    margin-bottom: var(--spacing-md, 16px);
    color: var(--text-color, #333);
    text-align: center;
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
  }

  .chart-container canvas {
    max-height: 250px !important;
    width: 100% !important;
  }

  .table-section h3 {
    margin-bottom: var(--spacing-lg, 20px);
    color: var(--text-color, #333);
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
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
    border-collapse: collapse;
    table-layout: auto;
    background-color: var(--panel-background, #ffffff);
    font-size: var(--font-size-sm, 0.875rem);
  }

  .metrics-table th,
  .metrics-table td {
    white-space: nowrap;
    padding: 8px 12px;
    text-align: left;
  }

  .metrics-table th {
    background-color: var(--background-color, #f8f9fa);
    font-weight: 600;
    color: var(--text-color, #333);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .metrics-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
  }

  .metrics-table th.sortable:hover {
    background-color: var(--border-color, #e9ecef);
  }

  .metrics-table tbody tr {
    transition: background-color 0.2s ease;
  }

  .metrics-table tbody tr:hover {
    background-color: var(--background-color, #f8f9fa);
  }

  h1 {
    margin-bottom: 16px;
  }

  /* Цветовая индикация качества метрик */
  .score-good {
    background-color: #d4edda !important;
    color: #155724;
    font-weight: 600;
  }

  .score-medium {
    background-color: #fff3cd !important;
    color: #856404;
    font-weight: 600;
  }

  .score-poor {
    background-color: #f8d7da !important;
    color: #721c24;
    font-weight: 600;
  }

  /* Адаптивность для планшетов */
  @media (max-width: 1024px) {
    .metrics-container {
      box-sizing: border-box;
    }

    .metrics-container h2 {
      font-size: var(--font-size-lg, 1.125rem);
    }

    .charts-section {
      gap: var(--spacing-md, 16px);
    }

    .chart-container {
      padding: var(--spacing-md, 16px);
    }

    .chart-container h3 {
      font-size: var(--font-size-md, 1rem);
    }

    .chart-container canvas {
      max-height: 200px !important;
    }

    .metrics-table {
      font-size: var(--font-size-xs, 0.75rem);
    }

    .metrics-table th,
    .metrics-table td {
      padding: var(--spacing-xs, 8px);
    }
  }

  /* Адаптивность для мобильных устройств */
  @media (max-width: 768px) {
    .metrics-container {
      box-sizing: border-box;
    }

    .metrics-container h2 {
      font-size: var(--font-size-md, 1rem);
      margin-bottom: var(--spacing-md, 16px);
    }

    .charts-section {
      gap: var(--spacing-sm, 12px);
    }

    .chart-container {
      padding: var(--spacing-sm, 12px);
    }

    .chart-container h3 {
      font-size: var(--font-size-sm, 0.875rem);
      margin-bottom: var(--spacing-sm, 12px);
    }

    .chart-container canvas {
      max-height: 180px !important;
    }

    .table-section h3 {
      font-size: var(--font-size-md, 1rem);
      margin-bottom: var(--spacing-md, 16px);
    }

    .metrics-table {
      font-size: var(--font-size-xs, 0.75rem);
    }

    .metrics-table th,
    .metrics-table td {
      padding: var(--spacing-xs, 6px);
    }

    .error-message,
    .loading,
    .no-data {
      padding: var(--spacing-md, 16px);
      font-size: var(--font-size-sm, 0.875rem);
    }
  }

  /* Адаптивность для очень маленьких экранов */
  @media (max-width: 480px) {
    .metrics-container {
      box-sizing: border-box;
    }

    .metrics-container h2 {
      font-size: var(--font-size-sm, 0.875rem);
    }

    .chart-container {
      padding: var(--spacing-xs, 8px);
    }

    .chart-container h3 {
      font-size: var(--font-size-xs, 0.75rem);
    }

    .chart-container canvas {
      max-height: 150px !important;
    }

    .table-section h3 {
      font-size: var(--font-size-sm, 0.875rem);
    }

    .metrics-table {
      font-size: var(--font-size-xs, 0.75rem);
    }

    .metrics-table th,
    .metrics-table td {
      padding: var(--spacing-xs, 4px);
    }

    .error-message,
    .loading,
    .no-data {
      padding: var(--spacing-sm, 12px);
      font-size: var(--font-size-xs, 0.75rem);
    }
  }

  /* Улучшения для touch-устройств */
  @media (hover: none) and (pointer: coarse) {
    .metrics-container {
      border-width: 2px;
    }

    .chart-container {
      border-width: 2px;
    }

    .table-container {
      border-width: 2px;
    }

    .metrics-table th.sortable {
      min-height: 44px;
      /* display: flex; */
      /* align-items: center; */
    }
  }

  /* Улучшения для производительности */
  .chart-container canvas {
    will-change: transform;
  }

  .metrics-table {
    will-change: scroll-position;
  }

  /* Улучшения для доступности */
  .metrics-table th.sortable:focus {
    outline: 2px solid var(--primary-color, #007bff);
    outline-offset: -2px;
  }

  /* Улучшения для печати */
  @media print {
    .metrics-container {
      border: 1px solid #000;
    }

    .chart-container {
      break-inside: avoid;
    }

    .table-container {
      break-inside: avoid;
    }
  }

  @media (max-width: 900px) {
    .metrics-table {
      min-width: 700px;
      width: 100%;
    }
    .table-container {
      overflow-x: auto;
    }
  }
</style>