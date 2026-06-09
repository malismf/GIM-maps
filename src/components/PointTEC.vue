<template>
    <div class="pointtec-container">
      <h1>Point TEC</h1>
  
      <form class="pointtec-controls" @submit.prevent="fetchPointTEC">
        <div class="pointtec-field">
          <label for="lat-input">Latitude</label>
          <input
            id="lat-input"
            v-model.number="latitude"
            type="number"
            step="0.01"
            min="-90"
            max="90"
            placeholder="e.g. 55.75"
            class="pointtec-input"
          />
        </div>
        <div class="pointtec-field">
          <label for="lon-input">Longitude</label>
          <input
            id="lon-input"
            v-model.number="longitude"
            type="number"
            step="0.01"
            min="-180"
            max="180"
            placeholder="e.g. 37.61"
            class="pointtec-input"
          />
        </div>
        <button
          class="pointtec-btn"
          type="submit"
          :disabled="isLoading || !isInputValid"
        >
          {{ isLoading ? 'Loading…' : 'Get TEC' }}
        </button>
      </form>
  
      <div v-if="error" class="pointtec-error">{{ error }}</div>
  
      <div v-if="chartData.length" class="chart-wrapper">
        <div class="chart-meta">
          <span>{{ formattedLatitude }}</span>
          <span>{{ formattedLongitude }}</span>
          <span>{{ chartDateLabel }}</span>
        </div>
        <div class="chart-container">
          <canvas ref="tecChart"></canvas>
        </div>
      </div>
  
      <div v-else-if="!isLoading && !error" class="pointtec-empty">
        Enter coordinates and press Get TEC to display the chart.
      </div>
    </div>
  </template>
  
  <script>
  import { Chart, registerables } from 'chart.js'
  import { API_BASE_URL } from '../config/api.js'
  import 'chartjs-adapter-date-fns'
  
  Chart.register(...registerables)
  
  export default {
    name: 'PointTEC',
  
    props: {
      forecastId: {
        type: [String, Number],
        default: null
      }
    },
  
    data() {
      return {
        latitude: null,
        longitude: null,
        isLoading: false,
        error: null,
        chartData: [],
        lastFetchedLat: null,
        lastFetchedLon: null,
        chart: null
      }
    },
  
    computed: {
      isInputValid() {
        return (
          this.forecastId != null &&
          this.latitude !== null && this.latitude !== '' &&
          this.longitude !== null && this.longitude !== '' &&
          this.latitude >= -90 && this.latitude <= 90 &&
          this.longitude >= -180 && this.longitude <= 180
        )
      },
  
      chartDateLabel() {
        if (!this.chartData.length) return ''
        const d = new Date(this.chartData[0].date)
        return d.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' })
      },

      formattedLatitude() {
        return this.formatCoordinate('Lat', this.lastFetchedLat, 'N', 'S')
      },

      formattedLongitude() {
        return this.formatCoordinate('Lon', this.lastFetchedLon, 'E', 'W')
      }
    },
  
    watch: {
      forecastId(newVal) {
        if (newVal && this.latitude !== null && this.longitude !== null) {
          this.fetchPointTEC();
        }
      }
    },
  
    beforeUnmount() {
      this.destroyChart()
    },
  
    methods: {
      formatCoordinate(label, value, positiveDirection, negativeDirection) {
        if (value === null || value === undefined || value === '') return `${label}: -`
        const numericValue = Number(value)
        if (Number.isNaN(numericValue)) return `${label}: -`

        const direction = numericValue < 0 ? negativeDirection : positiveDirection
        const absoluteValue = Math.abs(numericValue)
        return `${label}: ${numericValue}° (${absoluteValue}° ${direction})`
      },

      async fetchPointTEC() {
        if (!this.isInputValid) return
  
        this.isLoading = true
        this.error = null
        this.chartData = []
        this.destroyChart()
  
        try {
          const url = `${API_BASE_URL}/get_tec_for_geo_point/${this.forecastId}/${this.latitude}/${this.longitude}`
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
          const data = await response.json()
  
          if (!Array.isArray(data) || data.length === 0) {
            this.error = 'No TEC data returned for this point.'
            return
          }
  
          this.chartData = data
          this.lastFetchedLat = this.latitude
          this.lastFetchedLon = this.longitude
  
          await this.$nextTick()
          this.renderChart()
        } catch (err) {
          this.error = 'Failed to fetch TEC data: ' + err.message
        } finally {
          this.isLoading = false
        }
      },
  
      tecuToColor(value, alpha = 1) {
        const stops = [
          { val:  0, rgb: [10,   0, 102] },
          { val: 10, rgb: [0,    0, 255] },
          { val: 20, rgb: [0,  170, 255] },
          { val: 30, rgb: [0,  255, 255] },
          { val: 40, rgb: [0,  255,   0] },
          { val: 50, rgb: [170, 255,  0] },
          { val: 60, rgb: [255, 255,  0] },
          { val: 70, rgb: [255, 136,  0] },
          { val: 80, rgb: [255,   0,  0] },
          { val: 90, rgb: [170,   0,  0] },
        ]
        const clamped = Math.max(stops[0].val, Math.min(stops[stops.length - 1].val, value))
        let chosen = stops[0]
        for (let i = 0; i < stops.length; i++) {
          if (clamped >= stops[i].val) chosen = stops[i]
          else break
        }
        const [r, g, b] = chosen.rgb
        return `rgba(${r},${g},${b},${alpha})`
      },
  
      renderChart() {
        this.destroyChart()
  
        const canvas = this.$refs.tecChart
        if (!canvas) return
  
        const labels = this.chartData.map(item => {
          const d = new Date(item.date)
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          return `${hh}:${mm}`
        })
        const values = this.chartData.map(item => item.tecu)
        const pointColors = values.map(v => this.tecuToColor(v, 1))
  
        this.chart = new Chart(canvas, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'TECU',
                data: values,
                backgroundColor: 'rgba(100, 140, 200, 0.10)',
                borderColor: 'rgba(100, 140, 200, 0.5)',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgba(0, 99, 200, 1)',
                fill: true,
                tension: 0.35
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => `${ctx.parsed.y.toFixed(3)} TECU`,
                  labelColor: ctx => ({
                    borderColor: pointColors[ctx.dataIndex],
                    backgroundColor: pointColors[ctx.dataIndex],
                    borderWidth: 2,
                    borderRadius: 3
                  })
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Time',
                  font: { size: 13, weight: '600' }
                },
                ticks: { font: { size: 11 } },
                grid: { color: 'rgba(0,0,0,0.06)' }
              },
              y: {
                title: {
                  display: true,
                  text: 'TECU',
                  font: { size: 13, weight: '600' }
                },
                beginAtZero: false,
                grid: { color: 'rgba(0,0,0,0.06)' }
              }
            }
          }
        })
      },
  
      destroyChart() {
        if (this.chart) {
          this.chart.destroy()
          this.chart = null
        }
      }
    },

    }
  </script>
  
  <style scoped>

  h1 {
    margin-bottom: 16px;
  }

  .pointtec-container {
    width: 100%;
    background-color: var(--panel-background, #ffffff);
    box-sizing: border-box;
  }
  
  
  .pointtec-controls {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  
  .pointtec-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .pointtec-field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color, #555);
    letter-spacing: 0.02em;
  }
  
  .pointtec-input {
    padding: 8px 10px;
    border: 1.5px solid var(--border-color, #ccc);
    border-radius: 6px;
    font-size: 0.95rem;
    width: 150px;
    color: var(--text-color, #333);
    background: #fff;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  
  .pointtec-input:focus {
    outline: none;
    border-color: var(--primary-color, #007bff);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.12);
  }
  
  .pointtec-btn {
    padding: 9px 20px;
    background-color: var(--primary-color, #007bff);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
    white-space: nowrap;
  }
  
  .pointtec-btn:hover:not(:disabled) {
    background-color: var(--primary-color-dark, #0056b3);
  }
  
  .pointtec-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pointtec-error {
    padding: 12px 16px;
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 0.875rem;
  }
  
  .chart-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .chart-meta {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-color, #555);
    font-weight: 500;
    padding: 0 4px;
  }
  
  .chart-container {
    position: relative;
    height: 520px;
    width: 100%;
    padding: 16px;
    background-color: var(--background-color, #f8f9fa);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 10px;
    box-sizing: border-box;
  }
  
  .pointtec-empty {
    text-align: center;
    padding: 40px 24px;
    color: #6c757d;
    font-size: 0.95rem;
  }
  </style>